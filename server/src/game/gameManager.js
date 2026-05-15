const maps = require('../game/maps');
const { lobbies, connectedUsers } = require('../utils/store');
const { getDistance } = require('../utils/helpers');
const { broadcastState, broadcastLobbyList, broadcastLobbyUpdate } = require('../socket/broadcast');
const { distributeKora } = require('../kora/koraService');

const TURN_TIME_LIMIT = 60;

function createNewGameState(mapId = 'city') {
    const mapData = maps[mapId] || maps['city'];
    return {
        players: {},
        phase: 'waiting',
        round: 1,
        map: mapData,
        isLocked: false,
        thiefTraces: [],
        roadblocks: [],
        diamonds: [],
        collectedCount: 0,
        requiredDiamonds: 6,
        massHuntNotificationSent: false,
        isFeverMode: false,
        isThiefNearPolice: false,
        isLastStand: false,
        isTraitorArrested: false
    };
}

function assignRoles(io, lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    const gameState = lobby.gameState;
    const ids = Object.keys(gameState.players);
    if (ids.length < 1) return;

    gameState.isLocked = true;
    lobby.status = 'STARTED';

    const mapData = gameState.map;
    if (!mapData || !mapData.stations) {
        console.error("[Game] Map data missing in gameState!");
        return;
    }

    const shuffled = ids.sort(() => 0.5 - Math.random());
    const availableStations = Object.keys(mapData.stations).filter(id => mapData.stations[id].type !== 'escape');
    const shuffledStations = availableStations.sort(() => 0.5 - Math.random());

    gameState.players[shuffled[0]].role = 'thief';
    gameState.players[shuffled[0]].position = shuffledStations[0];
    gameState.players[shuffled[0]].ap_move = 2;
    gameState.players[shuffled[0]].ap_investigate = 0;

    gameState.thiefTraces.push({ stationId: shuffledStations[0], round: gameState.round });

    for (let i = 1; i < shuffled.length; i++) {
        let role = 'police';
        if (i === 1) {
            role = 'corrupt_police';
        }
        gameState.players[shuffled[i]].role = role;
        gameState.players[shuffled[i]].position = shuffledStations[i];
        gameState.players[shuffled[i]].ap_move = 2;
        gameState.players[shuffled[i]].ap_investigate = 2;
        // JEDER Polizist bekommt 1 kostenlose Straßensperre pro Spiel
        gameState.players[shuffled[i]].abilities = { roadblock: 1 };
    }

    initializeDiamonds(lobbyId);
    startTurn(io, lobbyId, shuffled[0], 'thief_turn');
    broadcastLobbyList(io);
}

function initializeDiamonds(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;
    const mapData = gameState.map;

    const allConns = [...mapData.connections];
    const shuffledConns = allConns.sort(() => 0.5 - Math.random());

    // Bestehende Diamanten löschen, falls wir neu initialisieren (Respawn)
    gameState.diamonds = [];

    // Platziere 3 Diamanten auf zufälligen Verbindungen
    for (let i = 0; i < Math.min(3, shuffledConns.length); i++) {
        const conn = shuffledConns[i];
        gameState.diamonds.push({ stationA: conn[0], stationB: conn[1], isCollected: false });
    }
}

function startTurn(io, lobbyId, playerId, phase) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    gameState.phase = phase;
    gameState.activePlayerId = playerId;
    gameState.timeLeft = TURN_TIME_LIMIT;
    gameState.revealedThiefPos = null;

    // Check for Heartbeat & Last Stand
    updateDramaFlags(lobbyId);

    // GROSSFAHNDUNG: Alle 2 Runden (Runde 3, 5, 7...)
    if (gameState.round % 2 === 1 && gameState.round > 1) {
        if (!gameState.massHuntNotificationSent) {
            gameState.massHuntNotificationSent = true;
            io.to(lobbyId).emit('notification', {
                title: '🚨 GROSSFAHNDUNG 🚨',
                message: '📡 SATELLITENBILDER SIND RAUS! Die alten Spuren vom Dieb wurden lokalisiert.'
            });
            // NEU: "3-Schritte-Schatten" - Zeige Positionen von vor 2, 3 und 4 Runden
            const shadowRounds = [gameState.round - 2, gameState.round - 3, gameState.round - 4];
            gameState.massHuntSnapshot = gameState.thiefTraces.filter(t => shadowRounds.includes(t.round));
        }
        gameState.isMassHuntActive = true;
    } else {
        gameState.isMassHuntActive = false;
        gameState.massHuntSnapshot = null;
    }

    const player = gameState.players[playerId];
    if (player) {
        player.turnStartPosition = player.position;

        // FIEBER-MODUS: Polizei bekommt +1 AP Bewegung
        let baseMoveAP = 2;
        if (gameState.isFeverMode && (player.role === 'police' || player.role === 'corrupt_police')) {
            baseMoveAP = 3;
        }

        // NEU: Alle 2 Runden bekommt die Polizei einen massiven Boost (4 AP)
        if (gameState.round % 2 === 0 && (player.role === 'police' || player.role === 'corrupt_police')) {
            baseMoveAP = 4;
        }

        player.ap_move = baseMoveAP;
        player.ap_investigate = (player.role === 'thief' ? 0 : 2);
    }

    lobby.turnTimer = setInterval(() => {
        gameState.timeLeft--;
        if (gameState.timeLeft <= 0) {
            clearInterval(lobby.turnTimer);
            endTurn(io, lobbyId, playerId);
        } else {
            io.to(lobbyId).emit('timer_update', gameState.timeLeft);
        }
    }, 1000);

    broadcastState(io, lobbyId);
}

function endTurn(io, lobbyId, playerId, lastPlayerRole = null, lastPlayerIndex = -1) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    const player = gameState.players[playerId];
    const role = player ? player.role : lastPlayerRole;
    if (!role) return;

    const policePlayers = Object.values(gameState.players).filter(p => p.role !== 'thief');
    const thief = Object.values(gameState.players).find(p => p.role === 'thief');

    if (role === 'thief') {
        const nextPolice = policePlayers.find(p => !p.isImprisoned);
        if (nextPolice) {
            startTurn(io, lobbyId, nextPolice.id, 'police_turn');
        } else {
            startTurn(io, lobbyId, thief.id, 'thief_turn');
        }
    } else {
        const currentIndex = lastPlayerIndex !== -1 ? lastPlayerIndex : policePlayers.findIndex(p => p.id === playerId);
        let nextPolice = null;
        // Wenn der Spieler bereits gelöscht wurde (lastPlayerIndex != -1), 
        // ist der "nächste" Spieler nun an der gleichen Position im Array
        for (let i = (lastPlayerIndex !== -1 ? currentIndex : currentIndex + 1); i < policePlayers.length; i++) {
            if (!policePlayers[i].isImprisoned) {
                nextPolice = policePlayers[i];
                break;
            }
        }

        if (nextPolice) {
            startTurn(io, lobbyId, nextPolice.id, 'police_turn');
        } else {
            gameState.round++;
            gameState.massHuntNotificationSent = false;

            // NEU: Sabotage-Rechte für korrupten Polizisten zurücksetzen
            Object.values(gameState.players).forEach(p => {
                if (p.role === 'corrupt_police') p.hasSabotagedThisRound = false;
            });

            cleanupTraces(lobbyId);

            if (gameState.round > 15) {
                handleGameEnd(io, lobbyId, 'thief_team', 'Der Dieb ist entkommen (Rundenlimit)!');
            } else {
                startTurn(io, lobbyId, thief.id, 'thief_turn');
            }
        }
    }
}

function handleGameEnd(io, lobbyId, winnerTeam, message) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState) return;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    lobby.gameState.phase = 'end';
    lobby.gameState.winner = winnerTeam;
    lobby.gameState.activePlayerId = null;
    lobby.gameState.endMessage = message;

    distributeKora(io, lobbyId, winnerTeam);

    lobby.status = 'OPEN';
    io.to(lobbyId).emit('game_ended', { winnerTeam, message, lobbyId });
    
    // WICHTIG: Lobby-Status synchronisieren
    broadcastLobbyUpdate(io, lobbyId);
    broadcastState(io, lobbyId);
    broadcastLobbyList(io);
}

function cleanupTraces(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState) return;
    const gameState = lobby.gameState;

    // 1. Veraltete Spuren entfernen
    const traceRetention = (Object.keys(gameState.players).length === 4) ? 2 : 4;
    gameState.thiefTraces = gameState.thiefTraces.filter(t => t.round >= gameState.round - traceRetention);

    const thief = Object.values(gameState.players).find(p => p.role === 'thief');
    if (thief && thief.position) {
        // 2. Aktuelle Position des Diebes als frische Spur markieren/aktualisieren
        gameState.thiefTraces = gameState.thiefTraces.filter(t => t.stationId !== thief.position);
        gameState.thiefTraces.push({ stationId: thief.position, round: gameState.round });
    }

    // 3. Eindeutigkeit sicherstellen und nach Runde sortieren (für saubere Pfade im Client)
    const uniqueTraces = {};
    gameState.thiefTraces.forEach(t => {
        if (!uniqueTraces[t.stationId] || t.round > uniqueTraces[t.stationId].round) {
            uniqueTraces[t.stationId] = t;
        }
    });

    gameState.thiefTraces = Object.values(uniqueTraces).sort((a, b) => a.round - b.round);
}

function handleMoveAction(io, socket, targetStationId) {
    const { connectedUsers } = require('../utils/store');
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    const gameState = lobby.gameState;
    const player = gameState.players[socket.id];

    if (!player || gameState.activePlayerId !== socket.id) return;
    if (player.ap_move < 1) return socket.emit('error_msg', 'Keine Bewegungspunkte!');

    const dist = getDistance(gameState.map, player.position, targetStationId);
    if (dist === 1) {
        // Roadblock Check
        if (player.role === 'thief') {
            const isBlocked = gameState.roadblocks.some(rb => {
                return (rb.stationAId === player.position && rb.stationBId === targetStationId) ||
                    (rb.stationAId === targetStationId && rb.stationBId === player.position);
            });
            if (isBlocked) return socket.emit('error_msg', 'Diese Verbindung ist gesperrt.');
        }

        const previousPosition = player.position;
        player.position = targetStationId;
        player.ap_move -= 1;
        player.turnStartPosition = player.position;

        // Großfahndung endet nach dem ersten Move
        gameState.isMassHuntActive = false;

        if (player.role === 'thief') {
            const usedEdge = [previousPosition, targetStationId].sort();
            const diamond = gameState.diamonds.find(d => {
                const dEdge = [d.stationA, d.stationB].sort();
                return !d.isCollected && dEdge[0] === usedEdge[0] && dEdge[1] === usedEdge[1];
            });
            if (diamond) {
                diamond.isCollected = true;
                gameState.collectedCount++;

                // Spende an Dieb/Verräter oder ähnliches?
                // gameState.revealedThiefPos = targetStationId; // ENTFERNT
                // Prüfen auf Fieber-Modus (ab 4 Diamanten)
                if (!gameState.isFeverMode && gameState.collectedCount >= 4) {
                    gameState.isFeverMode = true;
                    // ... (Notification already exists)

                    // NEU: Wenn nur noch 2 Diamanten fehlen (bei 4/6), wird der Verräter enttarnt
                    if (!gameState.isTraitorArrested) {
                        const corruptPlayer = Object.values(gameState.players).find(p => p.role === 'corrupt_police');
                        if (corruptPlayer) {
                            gameState.isTraitorArrested = true;
                            corruptPlayer.isImprisoned = true;
                            corruptPlayer.position = 'prison';

                            io.to(user.lobbyId).emit('notification', {
                                title: '🚨 VERRÄTER ENTDECKT! 🚨',
                                message: `Wir haben den Verräter gefunden: ${corruptPlayer.name}!`
                            });

                            io.to(user.lobbyId).emit('traitor_arrested', { userId: corruptPlayer.id });
                        }
                    }
                }

                // Prüfen, ob alle aktuellen Diamanten gesammelt wurden
                const currentUncollected = gameState.diamonds.filter(d => !d.isCollected);

                if (currentUncollected.length === 0) {
                    if (gameState.collectedCount < gameState.requiredDiamonds) {
                        // Neue Diamanten spawnen
                        initializeDiamonds(user.lobbyId);
                        io.to(user.lobbyId).emit('notification', {
                            title: 'DIAMANTEN',
                            message: 'Alle Diamanten gesammelt! 3 neue Diamanten sind aufgetaucht.'
                        });
                    } else {
                        // Sieg
                        gameState.phase = 'end';
                        gameState.winner = 'thief_team';
                        gameState.activePlayerId = null;
                        handleGameEnd(io, user.lobbyId, 'thief_team', 'Der Dieb hat alle 6 Diamanten gesammelt!');
                    }
                }
            }
            cleanupTraces(user.lobbyId);
        }

        updateDramaFlags(user.lobbyId);

        if (player.ap_move === 0 && player.ap_investigate === 0 && gameState.phase !== 'end') {
            endTurn(io, user.lobbyId, socket.id);
        }
        broadcastState(io, user.lobbyId);
    }
}

function handleInvestigateAction(io, socket) {
    const { connectedUsers } = require('../utils/store');
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    const gameState = lobby.gameState;
    const player = gameState.players[socket.id];

    if (!player || gameState.activePlayerId !== socket.id || player.role === 'thief') return;
    if (player.ap_investigate < 1) return socket.emit('error_msg', 'Keine Untersuchungen!');

    player.ap_investigate -= 1;
    const currentStation = player.position;
    const foundTrace = gameState.thiefTraces.find(t => t.stationId === currentStation);
    const thief = Object.values(gameState.players).find(p => p.role === 'thief');

    let result = "Keine Spur";
    if (foundTrace) {
        const roundDiff = gameState.round - foundTrace.round;
        if (roundDiff === 0) {
            result = "Frische Spur (Diese Runde)";
        } else {
            result = `Alte Spur (Vor ${roundDiff} ${roundDiff === 1 ? 'Runde' : 'Runden'})`;
        }
    } else if (thief && thief.position === currentStation) {
        result = "Frische Spur (Diese Runde)";
    }

    socket.emit('investigation_result', { stationId: currentStation, result });
    if (player.ap_move === 0 && player.ap_investigate === 0) endTurn(io, user.lobbyId, socket.id);
    broadcastState(io, user.lobbyId);
}

function handleArrestAction(io, socket) {
    const { connectedUsers } = require('../utils/store');
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    const gameState = lobby.gameState;
    const player = gameState.players[socket.id];

    if (!player || gameState.activePlayerId !== socket.id || player.role === 'thief') return;
    if (player.ap_investigate < 1) return socket.emit('error_msg', 'Keine Aktionspunkte!');

    player.ap_investigate -= 1;
    const thief = Object.values(gameState.players).find(p => p.role === 'thief');
    if (thief && thief.position === player.position) {
        gameState.phase = 'end';
        gameState.winner = 'police';
        gameState.activePlayerId = null;
        handleGameEnd(io, user.lobbyId, 'police', 'Die Polizei hat den Dieb gefasst!');
    } else {
        socket.emit('investigation_result', { stationId: player.position, result: "Fehlgeschlagen!" });
        if (player.ap_move === 0 && player.ap_investigate === 0) endTurn(io, user.lobbyId, socket.id);
        broadcastState(io, user.lobbyId);
    }
}

function handleUseAbility(io, socket, data) {
    const { connectedUsers } = require('../utils/store');
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    const gameState = lobby.gameState;
    const player = gameState.players[socket.id];

    if (!player || gameState.activePlayerId !== socket.id) return;

    const { abilityId, targetId } = data;

    if (abilityId === 'roadblock') {
        if (player.role === 'thief') return socket.emit('error_msg', 'Der Dieb kann diese Fähigkeit nicht benutzen.');
        if (!player.abilities || !player.abilities.roadblock || player.abilities.roadblock < 1) {
            return socket.emit('error_msg', 'Du besitzt keine Straßensperre mehr.');
        }
        if (player.ap_investigate < 1) return socket.emit('error_msg', 'Du hast keine Aktionspunkte mehr.');

        const dist = getDistance(gameState.map, player.position, targetId);
        if (dist !== 1) return socket.emit('error_msg', 'Du kannst nur eine benachbarte Verbindung sperren.');

        const usedEdge = [player.position, targetId].sort();
        const diamondOnConnection = gameState.diamonds.find(d => {
            const dEdge = [d.stationA, d.stationB].sort();
            return !d.isCollected && dEdge[0] === usedEdge[0] && dEdge[1] === usedEdge[1];
        });

        if (diamondOnConnection) {
            return socket.emit('error_msg', 'Du kannst keine Straße mit einem Diamanten sperren!');
        }

        // Bestehende Straßensperre dieses Polizisten entfernen (falls vorhanden)
        gameState.roadblocks = gameState.roadblocks.filter(rb => rb.ownerId !== socket.id);

        // Fähigkeit einsetzen (jetzt mit Dekrementierung, da "einmal pro Spiel")
        player.abilities.roadblock--; 
        player.ap_investigate -= 1;
        gameState.roadblocks.push({
            stationAId: player.position,
            stationBId: targetId,
            ownerId: socket.id
        });

        console.log(`[Ability] ${user.name} platzierte Straßensperre zwischen ${player.position} and ${targetId}`);

        socket.emit('ability_success', { abilityId, message: 'Straßensperre wurde platziert!' });
        if (player.ap_move === 0 && player.ap_investigate === 0) endTurn(io, user.lobbyId, socket.id);
        broadcastState(io, user.lobbyId);
    }
}

function handleSabotageMute(io, socket, targetUserId) {
    const { connectedUsers, lobbies } = require('../utils/store');
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;
    const player = gameState.players[socket.id];

    if (!player || player.role !== 'corrupt_police' || player.isImprisoned) return;
    if (player.hasSabotagedThisRound) return socket.emit('error_msg', 'Du hast diese Runde schon sabotiert!');

    const target = gameState.players[targetUserId];
    if (!target || target.role === 'thief') return;

    player.hasSabotagedThisRound = true;
    io.to(targetUserId).emit('sabotage_mute', { duration: 30000 });

    // Kleiner visueller Shake für alle als Warnung
    io.to(user.lobbyId).emit('fever_mode_start'); // Nutze Shake-Event als Proxy oder eigenes senden

    console.log(`[Sabotage] ${player.name} hat ${target.name} stummgeschaltet.`);
    broadcastState(io, user.lobbyId);
}

function updateDramaFlags(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState) return;
    const gameState = lobby.gameState;
    const { getDistance } = require('../utils/helpers');

    const thief = Object.values(gameState.players).find(p => p.role === 'thief');
    const policePlayers = Object.values(gameState.players).filter(p => p.role === 'police' || p.role === 'corrupt_police');

    if (thief && policePlayers.length > 0) {
        let minDist = Infinity;
        policePlayers.forEach(p => {
            const d = getDistance(gameState.map, thief.position, p.position);
            if (d < minDist) minDist = d;
        });
        // Herzschlag bei Distanz <= 1 (Nur noch direkte Nachbarn)
        gameState.isThiefNearPolice = (minDist <= 1);
    } else {
        gameState.isThiefNearPolice = false;
    }

    // Last Stand: 1 Diamant übrig oder Runde >= 12
    const remainingToCollect = gameState.requiredDiamonds - gameState.collectedCount;
    gameState.isLastStand = (remainingToCollect <= 1 || gameState.round >= 12);
}

module.exports = {
    createNewGameState, assignRoles, startTurn, endTurn,
    handleGameEnd, handleMoveAction, handleInvestigateAction, handleArrestAction,
    handleUseAbility, handleSabotageMute
};

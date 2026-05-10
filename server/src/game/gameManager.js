const mapData = require('../game/mapData');
const { lobbies } = require('../utils/store');
const { getDistance } = require('../utils/helpers');
const { broadcastState, broadcastLobbyList } = require('../socket/broadcast');
const { distributeKora } = require('../kora/koraService');

const TURN_TIME_LIMIT = 60;

function createNewGameState() {
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
        requiredDiamonds: 1
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

    const shuffled = ids.sort(() => 0.5 - Math.random());
    const availableStations = Object.keys(mapData.stations).filter(id => mapData.stations[id].type !== 'escape');
    const shuffledStations = availableStations.sort(() => 0.5 - Math.random());

    gameState.players[shuffled[0]].role = 'thief';
    gameState.players[shuffled[0]].position = shuffledStations[0];
    gameState.players[shuffled[0]].ap_move = 2;
    gameState.players[shuffled[0]].ap_investigate = 0;

    gameState.thiefTraces.push({ stationId: shuffledStations[0], round: gameState.round });

    for (let i = 1; i < shuffled.length; i++) {
        const role = (i === 1) ? 'corrupt_police' : 'police';
        gameState.players[shuffled[i]].role = role;
        gameState.players[shuffled[i]].position = shuffledStations[i];
        gameState.players[shuffled[i]].ap_move = 2;
        gameState.players[shuffled[i]].ap_investigate = 2;
    }

    initializeDiamonds(lobbyId);
    startTurn(io, lobbyId, shuffled[0], 'thief_turn');
    broadcastLobbyList(io);
}

function initializeDiamonds(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    const allConns = [...mapData.connections];
    const shuffledConns = allConns.sort(() => 0.5 - Math.random());

    gameState.diamonds = [];
    gameState.collectedCount = 0;

    const conn = shuffledConns[0];
    gameState.diamonds.push({ stationA: conn[0], stationB: conn[1], isCollected: false });
}

function startTurn(io, lobbyId, playerId, phase) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    gameState.phase = phase;
    gameState.activePlayerId = playerId;
    gameState.timeLeft = TURN_TIME_LIMIT;

    const player = gameState.players[playerId];
    if (player) {
        player.turnStartPosition = player.position;
        player.ap_move = 2;
        player.ap_investigate = (player.role === 'thief' ? 0 : 2);
    }

    lobby.turnTimer = setInterval(() => {
        gameState.timeLeft--;
        if (gameState.timeLeft <= 0) {
            clearInterval(lobby.turnTimer);
            endTurn(io, lobbyId, playerId);
        } else {
            broadcastState(io, lobbyId);
        }
    }, 1000);

    broadcastState(io, lobbyId);
}

function endTurn(io, lobbyId, playerId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    const player = gameState.players[playerId];
    if (!player) return;

    if (player.role === 'thief') {
        const policePlayers = Object.values(gameState.players).filter(p => p.role !== 'thief');
        startTurn(io, lobbyId, policePlayers[0].id, 'police_turn');
    } else {
        const policePlayers = Object.values(gameState.players).filter(p => p.role !== 'thief');
        const currentIndex = policePlayers.findIndex(p => p.id === playerId);

        if (currentIndex < policePlayers.length - 1) {
            startTurn(io, lobbyId, policePlayers[currentIndex + 1].id, 'police_turn');
        } else {
            gameState.round++;
            cleanupTraces(lobbyId);
            const thief = Object.values(gameState.players).find(p => p.role === 'thief');

            if (gameState.round > 15) {
                gameState.phase = 'end';
                gameState.winner = 'thief';
                handleGameEnd(io, lobbyId, 'thief', 'Der Dieb ist entkommen (Rundenlimit)!');
            } else {
                startTurn(io, lobbyId, thief.id, 'thief_turn');
            }
        }
    }
}

function handleGameEnd(io, lobbyId, winnerTeam, message) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    if (lobby.turnTimer) clearInterval(lobby.turnTimer);

    distributeKora(io, lobbyId, winnerTeam);

    lobby.status = 'OPEN';
    io.to(lobbyId).emit('game_ended', { winnerTeam, message, lobbyId });
    broadcastState(io, lobbyId);
    broadcastLobbyList(io);
}

function cleanupTraces(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    const thief = Object.values(gameState.players).find(p => p.role === 'thief');
    gameState.thiefTraces = gameState.thiefTraces.filter(t => t.round >= gameState.round - 1);

    if (thief && thief.position) {
        gameState.thiefTraces = gameState.thiefTraces.filter(t => t.stationId !== thief.position);
        gameState.thiefTraces.push({ stationId: thief.position, round: gameState.round });
    }

    const uniqueTraces = {};
    gameState.thiefTraces.forEach(t => {
        if (!uniqueTraces[t.stationId] || t.round > uniqueTraces[t.stationId].round) {
            uniqueTraces[t.stationId] = t;
        }
    });
    gameState.thiefTraces = Object.values(uniqueTraces);
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

    const dist = getDistance(player.position, targetStationId);
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

        if (player.role === 'thief') {
            const usedEdge = [previousPosition, targetStationId].sort();
            const diamond = gameState.diamonds.find(d => {
                const dEdge = [d.stationA, d.stationB].sort();
                return !d.isCollected && dEdge[0] === usedEdge[0] && dEdge[1] === usedEdge[1];
            });
            if (diamond) {
                diamond.isCollected = true;
                gameState.collectedCount++;
                if (gameState.collectedCount >= gameState.requiredDiamonds) {
                    gameState.phase = 'end';
                    gameState.winner = 'thief_team';
                    gameState.activePlayerId = null;
                    handleGameEnd(io, user.lobbyId, 'thief_team', 'Der Dieb hat alle Diamanten gesammelt!');
                }
            }
            cleanupTraces(user.lobbyId);
        }

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
        result = foundTrace.round === gameState.round ? "Frische Spur" : "Alte Spur";
    } else if (thief && thief.position === currentStation) {
        result = "Frische Spur";
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
        if (!user.abilities || !user.abilities.roadblock || user.abilities.roadblock < 1) {
            return socket.emit('error_msg', 'Du besitzt keine Straßensperre mehr.');
        }
        if (player.ap_investigate < 1) return socket.emit('error_msg', 'Du hast keine Aktionspunkte mehr.');

        const dist = getDistance(player.position, targetId);
        if (dist !== 1) return socket.emit('error_msg', 'Du kannst nur eine benachbarte Verbindung sperren.');

        // Fähigkeit einsetzen
        user.abilities.roadblock--;
        player.ap_investigate -= 1;
        gameState.roadblocks.push({ stationAId: player.position, stationBId: targetId });

        console.log(`[Ability] ${user.name} platzierte Straßensperre zwischen ${player.position} und ${targetId}`);
        
        socket.emit('ability_success', { abilityId, message: 'Straßensperre wurde platziert!' });
        if (player.ap_move === 0 && player.ap_investigate === 0) endTurn(io, user.lobbyId, socket.id);
        broadcastState(io, user.lobbyId);
    }
}

module.exports = {
    createNewGameState, assignRoles, startTurn, endTurn,
    handleGameEnd, handleMoveAction, handleInvestigateAction, handleArrestAction,
    handleUseAbility
};

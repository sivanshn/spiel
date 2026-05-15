const { connectedUsers, lobbies } = require('../utils/store');
const { broadcastLobbyList, broadcastLobbyUpdate } = require('../socket/broadcast');
const { createNewGameState, assignRoles } = require('../game/gameManager');
const { removePlayer } = require('../player/playerManager');

function handleCreateLobby(io, socket) {
    const user = connectedUsers.get(socket.id);
    if (!user || user.lobbyId) return;

    const lobbyId = `lobby_${Math.random().toString(36).substr(2, 5)}`;
    const lobby = {
        id: lobbyId,
        name: `Lobby von ${user.name}`,
        hostId: socket.id,
        hostName: user.name,
        players: [user],
        status: 'OPEN',
        maxPlayers: 5,
        gameState: createNewGameState('city')
    };

    lobbies.set(lobbyId, lobby);
    user.lobbyId = lobbyId;
    socket.join(lobbyId);

    broadcastLobbyUpdate(io, lobbyId);
    broadcastLobbyList(io);
}

function handleJoinLobby(io, socket, lobbyId) {
    const user = connectedUsers.get(socket.id);
    const lobby = lobbies.get(lobbyId);

    if (!user || !lobby) return;
    if (lobby.status !== 'OPEN') return socket.emit('error_msg', 'Lobby läuft bereits.');
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error_msg', 'Lobby ist voll.');

    user.lobbyId = lobbyId;
    lobby.players.push(user);
    socket.join(lobbyId);

    // Bestehende Spieler sollen WebRTC-Verbindung zum neuen Peer aufbauen
    socket.to(lobbyId).emit('voice_peer_joined', { peerId: socket.id });

    broadcastLobbyUpdate(io, lobbyId);
    broadcastLobbyList(io);
}

function handleLeaveLobby(io, socket) {
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;

    const lobbyId = user.lobbyId;
    const lobby = lobbies.get(lobbyId);

    if (lobby) {
        lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
        user.lobbyId = null;
        socket.leave(lobbyId);

        // Falls ein Spiel läuft, Spieler aus dem Game State entfernen
        if (lobby.status === 'STARTED' && lobby.gameState && lobby.gameState.players[socket.id]) {
            const player = lobby.gameState.players[socket.id];
            const role = player.role;
            const wasActive = lobby.gameState.activePlayerId === socket.id;
            
            // Index in turn order ermitteln, bevor wir den Spieler löschen
            let lastIndex = -1;
            if (role !== 'thief') {
                lastIndex = Object.values(lobby.gameState.players)
                    .filter(p => p.role !== 'thief')
                    .findIndex(p => p.id === socket.id);
            }

            delete lobby.gameState.players[socket.id];

            if (!checkGameEndConditions(io, lobbyId)) {
                if (wasActive) {
                    const { endTurn } = require('../game/gameManager');
                    endTurn(io, lobbyId, socket.id, role, lastIndex);
                }

                const remainingPlayers = Object.keys(lobby.gameState.players);
                if (remainingPlayers.length === 0) {
                    lobbies.delete(lobbyId);
                } else {
                    const { broadcastState } = require('../socket/broadcast');
                    broadcastState(io, lobbyId);
                }
            }
        }

        // Voice Peers informieren
        socket.to(lobbyId).emit('voice_peer_left', { peerId: socket.id });

        if (lobby.players.length === 0) {
            if (lobby.turnTimer) clearInterval(lobby.turnTimer);
            lobbies.delete(lobbyId);
        } else {
            if (lobby.hostId === socket.id) {
                lobby.hostId = lobby.players[0].socketId;
            }
            broadcastLobbyUpdate(io, lobbyId);
        }
    }

    broadcastLobbyList(io);
}

function handleStartLobbyGame(io, socket) {
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;

    const lobby = lobbies.get(user.lobbyId);
    if (!lobby || lobby.hostId !== socket.id) return;

    const playerCount = lobby.players.length;
    
    // 1. Prüfung der Spieleranzahl (4 oder 5 erlaubt)
    if (playerCount < 4) {
        return socket.emit('error_msg', `Start nicht möglich: Mindestens 4 Spieler benötigt.`);
    }
    if (playerCount > 5) {
        return socket.emit('error_msg', `Start nicht möglich: Maximal 5 Spieler erlaubt.`);
    }

    // 2. Status auf STARTED setzen
    lobby.status = 'STARTED';
    lobby.maxPlayers = playerCount; // Dynamisch anpassen

    try {
        console.log(`[Game] Initialisiere Spiel für Lobby ${user.lobbyId} (${playerCount} Spieler)...`);
        
        const mapId = (playerCount === 4) ? 'city_small' : 'city';
        lobby.gameState = createNewGameState(mapId);
        
        // Spieler-Objekte im GameState anlegen (mit aktuellsten Socket-IDs)
        const activeUsers = Array.from(connectedUsers.values());
        
        lobby.players.forEach(p => {
            // Finde die aktuellste Verbindung für diesen Spielernamen
            const currentUser = activeUsers.find(u => u.name === p.name);
            const currentSocketId = currentUser ? currentUser.socketId : p.socketId;

            lobby.gameState.players[currentSocketId] = {
                id: currentSocketId,
                name: p.name,
                avatar: p.avatar,
                currentFrame: p.currentFrame,
                koraBalance: p.koraBalance || 0,
                role: null,
                position: null,
                ap_move: 0,
                ap_investigate: 0,
                micEnabled: p.micEnabled !== false,
                abilities: {}
            };
            
            // Wichtig: Update die SocketID in der Lobby-Liste, falls sie sich geändert hat
            p.socketId = currentSocketId;
        });

        // Rollen zuweisen
        assignRoles(io, user.lobbyId);
        
        // Start-Signal redundant an alle senden
        io.to(user.lobbyId).emit('game_started');
        lobby.players.forEach(p => {
            io.to(p.socketId).emit('game_started');
        });
        
        console.log(`[Game] Spiel in Lobby ${user.lobbyId} erfolgreich gestartet.`);
    } catch (err) {
        console.error("[Game] Kritischer Fehler beim Spielstart:", err);
        lobby.status = 'OPEN';
        socket.emit('error_msg', `Fehler beim Start: ${err.message}`);
    }
}

function handleSelectMap(io, socket, playerCount) {
    const user = connectedUsers.get(socket.id);
    if (!user || !user.lobbyId) return;

    const lobby = lobbies.get(user.lobbyId);
    if (!lobby || lobby.hostId !== socket.id) return;
    if (lobby.status !== 'OPEN') return;

    const count = parseInt(playerCount);
    if (count === 4 || count === 5) {
        lobby.maxPlayers = count;
        broadcastLobbyUpdate(io, user.lobbyId);
        broadcastLobbyList(io); // WICHTIG: Auch die öffentliche Liste aktualisieren
    }
}

function handleDisconnect(io, socket) {
    const user = connectedUsers.get(socket.id);
    if (user) {
        if (user.lobbyId) {
            const lobbyId = user.lobbyId;
            const lobby = lobbies.get(lobbyId);
            if (lobby) {
                lobby.players = lobby.players.filter(p => p.socketId !== socket.id);

                // Falls ein Spiel läuft, Spieler aus dem Game State entfernen
                if (lobby.status === 'STARTED' && lobby.gameState && lobby.gameState.players[socket.id]) {
                    const player = lobby.gameState.players[socket.id];
                    const role = player.role;
                    const wasActive = lobby.gameState.activePlayerId === socket.id;

                    // Index in turn order ermitteln, bevor wir den Spieler löschen
                    let lastIndex = -1;
                    if (role !== 'thief') {
                        lastIndex = Object.values(lobby.gameState.players)
                            .filter(p => p.role !== 'thief')
                            .findIndex(p => p.id === socket.id);
                    }

                    delete lobby.gameState.players[socket.id];

                    if (!checkGameEndConditions(io, lobbyId)) {
                        if (wasActive) {
                            const { endTurn } = require('../game/gameManager');
                            endTurn(io, lobbyId, socket.id, role, lastIndex);
                        }

                        if (lobbies.has(lobbyId)) {
                            const { broadcastState } = require('../socket/broadcast');
                            broadcastState(io, lobbyId);
                        }
                    }
                }

                if (lobby.players.length === 0) {
                    if (lobby.turnTimer) clearInterval(lobby.turnTimer);
                    lobbies.delete(lobbyId);
                } else if (lobby.hostId === socket.id) {
                    lobby.hostId = lobby.players[0].socketId;
                }

                if (lobbies.has(lobbyId)) broadcastLobbyUpdate(io, lobbyId);

                // Voice Peers informieren
                io.to(lobbyId).emit('voice_peer_left', { peerId: socket.id });
            }
        }
        removePlayer(socket.id);
        broadcastLobbyList(io);
    }
    console.log('User disconnected:', socket.id);
}

function checkGameEndConditions(io, lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.status !== 'STARTED' || !lobby.gameState) return false;

    const players = Object.values(lobby.gameState.players);
    const thieves = players.filter(p => p.role === 'thief');
    const police = players.filter(p => p.role === 'police' || p.role === 'corrupt_police');

    const { handleGameEnd } = require('../game/gameManager');

    if (thieves.length === 0) {
        handleGameEnd(io, lobbyId, 'police', 'Keine Diebe mehr im Spiel! Polizei gewinnt.');
        return true;
    }

    if (police.length === 0) {
        handleGameEnd(io, lobbyId, 'thief', 'Keine Polizisten mehr im Spiel! Dieb gewinnt.');
        return true;
    }

    return false;
}

module.exports = {
    handleCreateLobby, handleJoinLobby, handleLeaveLobby,
    handleStartLobbyGame, handleDisconnect, handleSelectMap
};

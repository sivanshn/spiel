const { lobbies } = require('../utils/store');

function broadcastState(io, lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState) return;
    const gameState = lobby.gameState;

    lobby.players.forEach(p => {
        const socket = io.sockets.sockets.get(p.socketId);
        if (!socket) return;

        const myPlayer = gameState.players[p.socketId];
        if (!myPlayer) return;
        const isThief = myPlayer.role === 'thief';
        const isCorruptPolice = myPlayer.role === 'corrupt_police';

        const filteredPlayers = {};
        Object.values(gameState.players).forEach(player => {
            const pData = { ...player };
            
            // Sichtbarkeits-Regel:
            // 1. Dieb ist für alle sichtbar.
            // 2. Korrupter Polizist ist für Dieb und sich selbst sichtbar.
            // 3. Für normale Polizisten wird der korrupte Kollege als 'police' maskiert.
            if (!isThief && !isCorruptPolice) {
                if (pData.role === 'corrupt_police') {
                    pData.role = 'police';
                }
            }
            
            filteredPlayers[player.id] = pData;
        });

        const filteredState = {
            ...gameState,
            players: filteredPlayers,
            thiefTraces: (isThief || isCorruptPolice) ? gameState.thiefTraces : []
        };

        socket.emit('state_update', filteredState);
    });
}

function broadcastLobbyList(io) {
    const { connectedUsers } = require('../utils/store');
    const lobbyList = Array.from(lobbies.values())
        .filter(l => l.status === 'OPEN')
        .map(l => ({
            id: l.id,
            name: l.name,
            hostName: l.hostName,
            playerCount: l.players.length,
            maxPlayers: 4
        }));

    connectedUsers.forEach(user => {
        if (!user.lobbyId) {
            const socket = io.sockets.sockets.get(user.socketId);
            if (socket) socket.emit('lobby_list_update', lobbyList);
        }
    });
}

function broadcastLobbyUpdate(io, lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    const update = {
        id: lobby.id,
        name: lobby.name,
        hostId: lobby.hostId,
        players: lobby.players.map(p => ({
            socketId: p.socketId,
            name: p.name,
            avatar: p.avatar,
            isHost: p.socketId === lobby.hostId
        }))
    };

    lobby.players.forEach(p => {
        const socket = io.sockets.sockets.get(p.socketId);
        if (socket) socket.emit('lobby_update', update);
    });
}

module.exports = { broadcastState, broadcastLobbyList, broadcastLobbyUpdate };

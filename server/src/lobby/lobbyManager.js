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
        gameState: createNewGameState()
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
    if (lobby.players.length >= 4) return socket.emit('error_msg', 'Lobby ist voll.');

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
    if (lobby.players.length !== 4) return socket.emit('error_msg', '4 Spieler benötigt.');

    lobby.gameState = createNewGameState();

    lobby.players.forEach(p => {
        lobby.gameState.players[p.socketId] = {
            id: p.socketId,
            name: p.name,
            avatar: p.avatar,
            currentFrame: p.currentFrame,
            koraBalance: p.koraBalance,
            role: null,
            position: null,
            ap_move: 0,
            ap_investigate: 0,
            micEnabled: p.micEnabled !== false
        };
    });

    assignRoles(io, user.lobbyId);
    io.to(user.lobbyId).emit('game_started');
}

function handleDisconnect(io, socket) {
    const user = connectedUsers.get(socket.id);
    if (user) {
        if (user.lobbyId) {
            const lobby = lobbies.get(user.lobbyId);
            if (lobby) {
                lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
                if (lobby.players.length === 0) {
                    if (lobby.turnTimer) clearInterval(lobby.turnTimer);
                    lobbies.delete(user.lobbyId);
                } else if (lobby.hostId === socket.id) {
                    lobby.hostId = lobby.players[0].socketId;
                }
                if (lobbies.has(user.lobbyId)) broadcastLobbyUpdate(io, user.lobbyId);

                // Voice Peers informieren
                io.to(user.lobbyId).emit('voice_peer_left', { peerId: socket.id });
            }
        }
        removePlayer(socket.id);
        broadcastLobbyList(io);
    }
    console.log('User disconnected:', socket.id);
}

module.exports = {
    handleCreateLobby, handleJoinLobby, handleLeaveLobby,
    handleStartLobbyGame, handleDisconnect
};

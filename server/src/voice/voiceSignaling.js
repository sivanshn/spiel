/**
 * Voice Signaling – Server leitet nur WebRTC-Handshake weiter.
 * Das eigentliche Audio läuft peer-to-peer direkt zwischen den Clients.
 */
function registerVoiceHandlers(io, socket) {
    // Offer von neuem Peer an bestehende Peers weiterleiten
    socket.on('voice_offer', ({ targetId, offer }) => {
        socket.to(targetId).emit('voice_offer', { fromId: socket.id, offer });
    });

    // Answer zurück an den Initiator weiterleiten
    socket.on('voice_answer', ({ targetId, answer }) => {
        socket.to(targetId).emit('voice_answer', { fromId: socket.id, answer });
    });

    // ICE-Kandidaten weiterleiten (für NAT-Traversal)
    socket.on('voice_ice_candidate', ({ targetId, candidate }) => {
        socket.to(targetId).emit('voice_ice_candidate', { fromId: socket.id, candidate });
    });

    // Stumm-Status an alle Lobby-Mitglieder senden
    socket.on('voice_mute_toggle', ({ lobbyId, isMuted }) => {
        const { connectedUsers, lobbies } = require('../utils/store');
        const { broadcastState, broadcastLobbyUpdate } = require('../socket/broadcast');

        const user = connectedUsers.get(socket.id);
        if (user) {
            user.micEnabled = !isMuted;
        }

        const lobby = lobbies.get(lobbyId);
        if (lobby) {
            // Update im GameState
            if (lobby.gameState && lobby.gameState.players[socket.id]) {
                lobby.gameState.players[socket.id].micEnabled = !isMuted;
                broadcastState(io, lobbyId);
            }
            
            // Update in der Lobby-Liste (falls noch nicht im Spiel)
            const lobbyUser = lobby.players.find(p => p.socketId === socket.id);
            if (lobbyUser) {
                lobbyUser.micEnabled = !isMuted;
                broadcastLobbyUpdate(io, lobbyId);
            }
        }
        
        socket.to(lobbyId).emit('voice_mute_update', { fromId: socket.id, isMuted });
    });
}

module.exports = { registerVoiceHandlers };

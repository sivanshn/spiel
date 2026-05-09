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
        socket.to(lobbyId).emit('voice_mute_update', { fromId: socket.id, isMuted });
    });
}

module.exports = { registerVoiceHandlers };

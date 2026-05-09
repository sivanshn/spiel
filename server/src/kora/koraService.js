const { lobbies } = require('../utils/store');
const { broadcastRanking } = require('../ranking/rankingService');

/**
 * Verteilt Kora-Belohnungen nach Spielende an alle Spieler in der Lobby.
 * Polizei gewinnt → normale Polizisten +10 Kora
 * Dieb gewinnt   → Dieb + korrupter Polizist +10 Kora
 */
function distributeKora(io, lobbyId, winnerTeam) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const gameState = lobby.gameState;

    lobby.players.forEach(p => {
        const playerState = gameState.players[p.socketId];
        if (!playerState) return;

        let koraEarned = 0;
        if (winnerTeam === 'police') {
            if (playerState.role === 'police') koraEarned = 10;
        } else if (winnerTeam === 'thief' || winnerTeam === 'thief_team') {
            if (playerState.role === 'thief' || playerState.role === 'corrupt_police') koraEarned = 10;
        }

        if (koraEarned > 0) {
            p.koraBalance = (p.koraBalance || 0) + koraEarned;
        }

        const socket = io.sockets.sockets.get(p.socketId);
        if (socket) {
            socket.emit('kora_update', {
                balance: p.koraBalance || 0,
                earned: koraEarned
            });
        }
    });

    // Rangliste nach Kora-Änderung sofort an alle senden
    broadcastRanking(io);
}

module.exports = { distributeKora };

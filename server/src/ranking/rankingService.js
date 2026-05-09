const { connectedUsers } = require('../utils/store');

/**
 * Berechnet die aktuelle Rangliste aller verbundenen Spieler,
 * sortiert nach Kora-Guthaben (absteigend).
 */
function getRanking() {
    return Array.from(connectedUsers.values())
        .sort((a, b) => (b.koraBalance || 0) - (a.koraBalance || 0))
        .map((u, index) => ({
            rank: index + 1,
            name: u.name,
            avatar: u.avatar || 'fox',
            kora: u.koraBalance || 0
        }));
}

/**
 * Sendet die aktuelle Rangliste an alle verbundenen Clients.
 */
function broadcastRanking(io) {
    io.emit('ranking_data', getRanking());
}

module.exports = { getRanking, broadcastRanking };

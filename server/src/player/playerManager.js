const { connectedUsers } = require('../utils/store');
const { broadcastLobbyList } = require('../socket/broadcast');
const { broadcastRanking } = require('../ranking/rankingService');

/**
 * Registriert einen neuen Spieler.
 * Prüft auf leere Namen und Namens-Duplikate.
 */
function registerPlayer(io, socket, data) {
    const name = data.name.trim();

    if (!name) {
        return socket.emit('registration_failed', 'Name darf nicht leer sein.');
    }

    const isTaken = Array.from(connectedUsers.values())
        .some(u => u.name.toLowerCase() === name.toLowerCase());

    if (isTaken) {
        return socket.emit('registration_failed', 'Dieser Name ist bereits vergeben.');
    }

    const user = {
        socketId: socket.id,
        name,
        avatar: data.avatar || 'fox',
        lobbyId: null,
        koraBalance: 0,
        micEnabled: true,
        abilities: {} // { roadblock: 0 }
    };

    connectedUsers.set(socket.id, user);
    socket.emit('registration_success', user);
    socket.emit('kora_update', { balance: 0, earned: 0 });
    broadcastLobbyList(io);
    broadcastRanking(io);
}

/**
 * Gibt den Spieler anhand der Socket-ID zurück.
 */
function getPlayer(socketId) {
    return connectedUsers.get(socketId) || null;
}

/**
 * Entfernt den Spieler aus dem Store (beim Disconnect).
 */
function removePlayer(socketId) {
    connectedUsers.delete(socketId);
}

module.exports = { registerPlayer, getPlayer, removePlayer };

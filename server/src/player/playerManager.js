const { connectedUsers, allPlayers } = require('../utils/store');
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

    // Prüfen ob der Name bereits ONLINE ist (andere Socket-ID)
    const isOnline = Array.from(connectedUsers.values())
        .some(u => u.name.toLowerCase() === name.toLowerCase());

    if (isOnline) {
        return socket.emit('registration_failed', 'Dieser Name ist bereits online.');
    }

    // Prüfen ob der Spieler bereits in allPlayers existiert (für Freunde/Persistenz)
    let user = allPlayers.get(name.toLowerCase());

    if (!user) {
        user = {
            name,
            avatar: data.avatar || 'default_avatar',
            koraBalance: 0,
            abilities: {},
            friends: [],            // Liste von Namen (kleingeschrieben für Lookups)
            incomingRequests: [],   // Liste von Namen
            outgoingRequests: [],   // Liste von Namen
            ownedFrames: ['none'],  // Gekaufte Rahmen
            currentFrame: 'none'    // Aktuell ausgerüsteter Rahmen
        };
        allPlayers.set(name.toLowerCase(), user);
    }

    // Aktuelle Session-Daten
    user.socketId = socket.id;
    user.lobbyId = null;
    user.micEnabled = true;

    if (user.name === '1') {
        user.koraBalance = 1000;
    }

    connectedUsers.set(socket.id, user);
    socket.emit('registration_success', user);
    socket.emit('kora_update', { balance: user.koraBalance, earned: 0 });
    
    // Freunde-Liste beim Login senden
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

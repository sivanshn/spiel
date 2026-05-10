const { connectedUsers, allPlayers } = require('../utils/store');

/**
 * Registriert Socket-Handler für das Freunde-System.
 */
function registerFriendsHandlers(io, socket) {
    socket.on('friends:getList', () => {
        sendFriendsUpdate(socket);
    });

    socket.on('friends:search', (name) => {
        const targetNameLower = name.trim().toLowerCase();
        const targetPlayer = allPlayers.get(targetNameLower);
        
        if (!targetPlayer) {
            return socket.emit('friends:error', 'Spieler nicht gefunden.');
        }

        socket.emit('friends:searchResult', {
            name: targetPlayer.name,
            avatar: targetPlayer.avatar
        });
    });

    socket.on('friends:sendRequest', (targetName) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const targetNameLower = targetName.trim().toLowerCase();
        const userNameLower = user.name.toLowerCase();

        if (targetNameLower === userNameLower) {
            return socket.emit('friends:error', 'Du kannst dir selbst keine Anfrage senden.');
        }

        const targetPlayer = allPlayers.get(targetNameLower);
        if (!targetPlayer) {
            return socket.emit('friends:error', 'Spieler nicht gefunden.');
        }

        if (user.friends.includes(targetNameLower)) {
            return socket.emit('friends:error', 'Ihr seid bereits Freunde.');
        }

        if (user.outgoingRequests.includes(targetNameLower)) {
            return socket.emit('friends:error', 'Anfrage wurde bereits gesendet.');
        }

        // Anfrage speichern
        user.outgoingRequests.push(targetNameLower);
        targetPlayer.incomingRequests.push(userNameLower);

        socket.emit('friends:requestSent', targetName);
        sendFriendsUpdate(socket);

        // Falls Target online ist, auch dort updaten
        const targetSocketId = targetPlayer.socketId;
        if (targetSocketId && connectedUsers.has(targetSocketId)) {
            io.to(targetSocketId).emit('friends:requestReceived', user.name);
            sendFriendsUpdate(io.sockets.sockets.get(targetSocketId));
        }
    });

    socket.on('friends:acceptRequest', (fromName) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const fromNameLower = fromName.trim().toLowerCase();
        const userNameLower = user.name.toLowerCase();

        const fromPlayer = allPlayers.get(fromNameLower);
        if (!fromPlayer) return;

        // Aus Anfragen entfernen
        user.incomingRequests = user.incomingRequests.filter(n => n !== fromNameLower);
        fromPlayer.outgoingRequests = fromPlayer.outgoingRequests.filter(n => n !== userNameLower);

        // Als Freunde hinzufügen
        if (!user.friends.includes(fromNameLower)) user.friends.push(fromNameLower);
        if (!fromPlayer.friends.includes(userNameLower)) fromPlayer.friends.push(userNameLower);

        sendFriendsUpdate(socket);

        const fromSocketId = fromPlayer.socketId;
        if (fromSocketId && connectedUsers.has(fromSocketId)) {
            sendFriendsUpdate(io.sockets.sockets.get(fromSocketId));
        }
    });

    socket.on('friends:declineRequest', (fromName) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const fromNameLower = fromName.trim().toLowerCase();
        const userNameLower = user.name.toLowerCase();

        const fromPlayer = allPlayers.get(fromNameLower);
        if (!fromPlayer) return;

        user.incomingRequests = user.incomingRequests.filter(n => n !== fromNameLower);
        fromPlayer.outgoingRequests = fromPlayer.outgoingRequests.filter(n => n !== userNameLower);

        sendFriendsUpdate(socket);

        const fromSocketId = fromPlayer.socketId;
        if (fromSocketId && connectedUsers.has(fromSocketId)) {
            sendFriendsUpdate(io.sockets.sockets.get(fromSocketId));
        }
    });
}

/**
 * Sendet die aktuelle Freundesliste und Anfragen an den Client.
 */
function sendFriendsUpdate(socket) {
    if (!socket) return;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const friendsList = user.friends.map(friendName => {
        const p = allPlayers.get(friendName);
        const isOnline = Array.from(connectedUsers.values()).some(u => u.name.toLowerCase() === friendName);
        return {
            name: p.name,
            avatar: p.avatar,
            online: isOnline
        };
    });

    const incoming = user.incomingRequests.map(name => {
        const p = allPlayers.get(name);
        return { name: p.name, avatar: p.avatar };
    });

    socket.emit('friends:listUpdate', {
        friends: friendsList,
        requests: incoming
    });
}

module.exports = { registerFriendsHandlers };

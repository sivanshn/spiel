const { connectedUsers, allPlayers } = require('../utils/store');

/**
 * Registriert Socket-Handler für das Freunde-System.
 */
function registerFriendsHandlers(io, socket) {
    socket.on('friends:getFriends', () => {
        sendFriendsUpdate(socket);
    });

    socket.on('friends:getRequests', () => {
        sendFriendsUpdate(socket);
    });

    socket.on('friends:search', (name) => {
        const targetNameLower = name.trim().toLowerCase();
        const targetPlayer = allPlayers.get(targetNameLower);
        
        if (!targetPlayer) {
            return socket.emit('friends:searchResults', null);
        }

        socket.emit('friends:searchResults', {
            name: targetPlayer.name,
            avatar: targetPlayer.avatar,
            currentFrame: targetPlayer.currentFrame || null
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
        if (!user.outgoingRequests.includes(targetNameLower)) {
            user.outgoingRequests.push(targetNameLower);
        }
        if (!targetPlayer.incomingRequests.includes(userNameLower)) {
            targetPlayer.incomingRequests.push(userNameLower);
        }

        socket.emit('friends:requestSent', targetName);
        sendFriendsUpdate(socket);

        // Falls Target online ist, auch dort updaten
        const targetSocketId = targetPlayer.socketId;
        if (targetSocketId && connectedUsers.has(targetSocketId)) {
            io.to(targetSocketId).emit('friends:update');
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

    socket.on('friends:rejectRequest', (fromName) => {
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
        if (!p) return null;
        const isOnline = Array.from(connectedUsers.values()).some(u => u.name.toLowerCase() === friendName);
        return {
            name: p.name,
            avatar: p.avatar,
            online: isOnline,
            currentFrame: p.currentFrame || 'default'
        };
    }).filter(f => f !== null);

    const incoming = user.incomingRequests.map(name => {
        const p = allPlayers.get(name);
        if (!p) return null;
        return { 
            name: p.name, 
            avatar: p.avatar,
            currentFrame: p.currentFrame || 'default'
        };
    }).filter(f => f !== null);

    socket.emit('friends:list', friendsList);
    socket.emit('friends:requests', incoming);
}

module.exports = { registerFriendsHandlers };

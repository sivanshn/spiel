// Zentrale Datenspeicher – werden von allen Modulen gemeinsam genutzt
const connectedUsers = new Map(); // socketId -> user
const lobbies = new Map();        // lobbyId -> lobby

module.exports = { connectedUsers, lobbies };

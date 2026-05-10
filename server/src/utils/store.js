// Zentrale Datenspeicher – werden von allen Modulen gemeinsam genutzt
const connectedUsers = new Map(); // socketId -> user
const lobbies = new Map();        // lobbyId -> lobby
const allPlayers = new Map();     // name -> player (persistenter im RAM)

module.exports = { connectedUsers, lobbies, allPlayers };

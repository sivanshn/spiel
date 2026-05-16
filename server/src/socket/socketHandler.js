const { connectedUsers } = require('../utils/store');
const { broadcastLobbyList } = require('../socket/broadcast');
const { broadcastRanking } = require('../ranking/rankingService');
const { handleCreateLobby, handleJoinLobby, handleLeaveLobby, handleStartLobbyGame, handleDisconnect, handleSelectMap } = require('../lobby/lobbyManager');
const { handleMoveAction, handleInvestigateAction, handleArrestAction, endTurn, handleUseAbility } = require('../game/gameManager');
const { broadcastState } = require('../socket/broadcast');
const { registerPlayer, removePlayer } = require('../player/playerManager');
const { registerVoiceHandlers } = require('../voice/voiceSignaling');
const { registerChatHandlers } = require('../chat/chatService');
const { registerShopHandlers } = require('../shop/shopManager');
const { registerFriendsHandlers } = require('../player/friendsService');

function registerSocketHandlers(io, socket) {
    socket.on('register_user', (data) => {
        registerPlayer(io, socket, data);
        registerFriendsHandlers(io, socket); // Direkt nach Register initialisieren
    });

    socket.on('get_ranking', () => broadcastRanking(io));

    socket.on('create_lobby', () => handleCreateLobby(io, socket));
    socket.on('join_lobby', (lobbyId) => handleJoinLobby(io, socket, lobbyId));
    socket.on('leave_lobby', () => handleLeaveLobby(io, socket));
    socket.on('start_lobby_game', () => handleStartLobbyGame(io, socket));
    socket.on('select_map', (mapId) => handleSelectMap(io, socket, mapId));

    socket.on('move_to', (targetStationId) => handleMoveAction(io, socket, targetStationId));
    socket.on('investigate', () => handleInvestigateAction(io, socket));
    socket.on('arrest', () => handleArrestAction(io, socket));

    socket.on('game_action', (data) => {
        if (data.type === 'investigate') handleInvestigateAction(io, socket, data.stationId);
        if (data.type === 'arrest') handleArrestAction(io, socket, data.stationId);
    });

    socket.on('use_ability', (data) => handleUseAbility(io, socket, data));
    socket.on('sabotage_mute', (targetId) => {
        const { handleSabotageMute } = require('../game/gameManager');
        handleSabotageMute(io, socket, targetId);
    });

    socket.on('map_ping', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.lobbyId) return;
        // Ping an das gesamte Team senden (oder einfach an alle in der Lobby)
        // Normalerweise nur an das eigene Team, aber hier senden wir es an alle für die Einfachheit (oder filtern im Client)
        io.to(user.lobbyId).emit('map_ping', { stationId: data.stationId, userId: socket.id });
    });

    socket.on('end_turn', () => {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.lobbyId) return;
        endTurn(io, user.lobbyId, socket.id);
        broadcastState(io, user.lobbyId);
    });

    socket.on('disconnect', () => handleDisconnect(io, socket));

    // Voice Chat Signaling
    registerVoiceHandlers(io, socket);

    // Globaler Chat
    registerChatHandlers(io, socket);

    // Shop
    registerShopHandlers(io, socket);
}

module.exports = { registerSocketHandlers };

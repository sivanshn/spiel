const { connectedUsers } = require('../utils/store');
const { broadcastLobbyList } = require('../socket/broadcast');
const { broadcastRanking } = require('../ranking/rankingService');
const { handleCreateLobby, handleJoinLobby, handleLeaveLobby, handleStartLobbyGame, handleDisconnect } = require('../lobby/lobbyManager');
const { handleMoveAction, handleInvestigateAction, handleArrestAction, endTurn, handleUseAbility } = require('../game/gameManager');
const { broadcastState } = require('../socket/broadcast');
const { registerPlayer, removePlayer } = require('../player/playerManager');
const { registerVoiceHandlers } = require('../voice/voiceSignaling');
const { registerChatHandlers } = require('../chat/chatService');
const { registerShopHandlers } = require('../shop/shopManager');

function registerSocketHandlers(io, socket) {
    socket.on('register_user', (data) => registerPlayer(io, socket, data));

    socket.on('get_ranking', () => broadcastRanking(io));

    socket.on('create_lobby', () => handleCreateLobby(io, socket));
    socket.on('join_lobby', (lobbyId) => handleJoinLobby(io, socket, lobbyId));
    socket.on('leave_lobby', () => handleLeaveLobby(io, socket));
    socket.on('start_lobby_game', () => handleStartLobbyGame(io, socket));

    socket.on('move_to', (targetStationId) => handleMoveAction(io, socket, targetStationId));
    socket.on('investigate', () => handleInvestigateAction(io, socket));
    socket.on('arrest', () => handleArrestAction(io, socket));
    socket.on('use_ability', (data) => handleUseAbility(io, socket, data));

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

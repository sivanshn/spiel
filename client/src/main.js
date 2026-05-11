import { socket } from './services/socket.js';
import { state } from './app/state.js';
import { initLoginView } from './views/LoginView.js';
import { initMainView } from './views/MainView.js';
import { initLobbyWaitingPanel } from './views/LobbyWaitingPanel.js';
import { initGameView } from './views/GameView.js';
import { setLanguage } from './i18n/languageService.js';
import { showPopup } from './utils/ui.js';
import { initChatPanel } from './views/ChatPanel.js';
import { initFriendsView } from './views/FriendsView.js';
import { PlayerManager } from './services/PlayerManager.js';
import { initAssetService } from './services/assetService.js';

import './styles/friends.css';

// Initialize Services
const playerManager = new PlayerManager(socket);

// Init views
initLoginView();
initMainView(playerManager);
initLobbyWaitingPanel();
initGameView();
initChatPanel();
initFriendsView();
initAssetService();


socket.on('connect', () => {
    state.myId = socket.id;
});

socket.on('error_msg', (msg) => {
    showPopup("ACHTUNG", msg);
});

// Initial call
const lobbyListContainer = document.getElementById('lobby-list');
setLanguage(state.currentLanguage, lobbyListContainer);

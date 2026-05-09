import { socket } from './services/socket.js';
import { state } from './app/state.js';
import { initLoginView } from './views/LoginView.js';
import { initMainView } from './views/MainView.js';
import { initLobbyWaitingPanel } from './views/LobbyWaitingPanel.js';
import { initGameView } from './views/GameView.js';
import { setLanguage } from './i18n/languageService.js';
import { showPopup } from './utils/ui.js';
import { initChatPanel } from './views/ChatPanel.js';

// Init views
initLoginView();
initMainView();
initLobbyWaitingPanel();
initGameView();
initChatPanel();

socket.on('connect', () => {
    state.myId = socket.id;
});

socket.on('error_msg', (msg) => {
    showPopup("ACHTUNG", msg);
});

// Initial call
const lobbyListContainer = document.getElementById('lobby-list');
setLanguage(state.currentLanguage, lobbyListContainer);

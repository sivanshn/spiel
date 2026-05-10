import { socket } from '../services/socket.js';
import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { setLanguage } from '../i18n/languageService.js';
import { renderLobbyList } from './LobbyPanel.js';
import { renderLobbyPlayers } from './LobbyWaitingPanel.js';
import { initShopModal } from './ShopModal.js';
import { initRolesModal } from './RolesModal.js';

export function initMainView() {
    const createLobbyBtn = getEl('create-lobby-btn');
    const settingsBtn = getEl('settings-btn');
    const modalSettings = getEl('modal-settings');
    const settingsClose = getEl('settings-close');
    const rankingBtn = getEl('ranking-btn');
    const modalRanking = getEl('modal-ranking');
    const rankingClose = getEl('ranking-close');
    const langButtons = document.querySelectorAll('.lang-btn');
    const lobbyListContainer = getEl('lobby-list');
    const lobbyListPanel = getEl('lobby-list-panel');
    const lobbyWaitingPanel = getEl('lobby-waiting-panel');

    // Shop & Rollen initialisieren
    initShopModal();
    initRolesModal();

    if (createLobbyBtn) {
        createLobbyBtn.addEventListener('click', () => {
            socket.emit('create_lobby');
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => modalSettings.classList.remove('hidden'));
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => modalSettings.classList.add('hidden'));
    }

    if (rankingBtn) {
        rankingBtn.addEventListener('click', () => {
            socket.emit('get_ranking');
            modalRanking.classList.remove('hidden');
        });
    }

    if (rankingClose) {
        rankingClose.addEventListener('click', () => modalRanking.classList.add('hidden'));
    }

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang, lobbyListContainer);
        });
    });

    socket.on('kora_update', (data) => {
        if (state.myUserData) state.myUserData.koraBalance = data.balance;
        const kValue = getEl('kora-value-main');
        if (kValue) kValue.textContent = data.balance;
    });

    socket.on('ranking_data', (data) => {
        const rankingList = getEl('ranking-list');
        if (!rankingList) return;
        rankingList.innerHTML = '';
        data.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'ranking-entry';
            div.innerHTML = `
                <span class="rank-number">${entry.rank}.</span>
                <div class="rank-user">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${entry.avatar}" class="rank-avatar">
                    <span>${entry.name}</span>
                </div>
                <span class="rank-kora">${entry.kora}</span>
            `;
            rankingList.appendChild(div);
        });
    });

    socket.on('lobby_list_update', (lobbies) => {
        renderLobbyList(lobbies, lobbyListContainer);
    });

    socket.on('lobby_update', (lobby) => {
        state.currentLobby = lobby;
        renderLobbyPlayers(lobby);
        
        if (lobbyListPanel && lobbyWaitingPanel) {
            lobbyListPanel.classList.add('hidden');
            lobbyWaitingPanel.classList.remove('hidden');
        }
    });
}

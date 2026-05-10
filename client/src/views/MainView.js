import { socket } from '../services/socket.js';
import { getEl, closeAllModals } from '../utils/ui.js';
import { state } from '../app/state.js';
import { setLanguage } from '../i18n/languageService.js';
import { renderLobbyList } from './LobbyPanel.js';
import { renderLobbyPlayers } from './LobbyWaitingPanel.js';
import { ShopModal } from '../components/ShopModal.js';
import { ProfileModal } from '../components/ProfileModal.js';
import { initRolesModal } from './RolesModal.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

export function initMainView(playerManager) {
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
    const profileBox = document.querySelector('.user-profile');
    const shopBtn = getEl('shop-btn');
    const friendsBtn = getEl('friends-btn');
    const rolesBtn = getEl('roles-btn');

    // Modals
    const shopModal = new ShopModal(socket);
    const profileModal = new ProfileModal(socket, playerManager);
    initRolesModal();

    if (createLobbyBtn) {
        createLobbyBtn.addEventListener('click', () => {
            socket.emit('create_lobby');
        });
    }

    if (shopBtn) {
        shopBtn.addEventListener('click', () => shopModal.open());
    }

    if (friendsBtn) {
        friendsBtn.addEventListener('click', () => {
            if (state.friendsView) {
                closeAllModals();
                state.friendsView.show();
            }
        });
    }

    const shopClose = getEl('shop-close');
    if (shopClose) {
        shopClose.addEventListener('click', () => shopModal.close());
    }

    if (profileBox) {
        profileBox.addEventListener('click', () => profileModal.open());
    }

    if (rolesBtn) {
        rolesBtn.addEventListener('click', () => {
            const modal = getEl('modal-roles');
            if (modal) {
                closeAllModals();
                modal.classList.remove('hidden');
            }
        });
    }

    const profileClose = getEl('profile-close');
    if (profileClose) {
        profileClose.addEventListener('click', () => profileModal.close());
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            closeAllModals();
            modalSettings.classList.remove('hidden');
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => modalSettings.classList.add('hidden'));
    }

    if (rankingBtn) {
        rankingBtn.addEventListener('click', () => {
            closeAllModals();
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

    window.addEventListener('player_data_updated', () => {
        const player = playerManager.getSelf() || state.myUserData;
        if (!player) return;

        const nameEl = getEl('my-name');
        const koraEl = getEl('kora-value-main');
        const avatarContainer = getEl('my-avatar-container');
        const avatarImg = getEl('my-avatar');

        if (nameEl) nameEl.textContent = player.name;
        if (koraEl) koraEl.textContent = player.koraBalance;
        if (avatarImg && player.avatar) avatarImg.src = getAvatarUrl(player.avatar);
        
        if (avatarContainer) {
            // Apply frame class directly
            avatarContainer.className = `avatar-container ${player.currentFrame || 'default'}`;
        }
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
                    <img src="${getAvatarUrl(entry.avatar)}" class="rank-avatar">
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

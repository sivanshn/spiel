import { socket } from '../services/socket.js';
import { toggleChat } from './ChatPanel.js';
import { getEl, closeAllModals } from '../utils/ui.js';
import { state } from '../app/state.js';
import { setLanguage } from '../i18n/languageService.js';
import { renderLobbyList } from './LobbyPanel.js';
import { renderLobbyPlayers } from './LobbyWaitingPanel.js';
import { ShopModal } from '../components/ShopModal.js';
import { ProfileModal } from '../components/ProfileModal.js';
import { initRolesModal } from './RolesModal.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

function setActiveNav(btnId) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === btnId) btn.classList.add('active');
    });
}

function clearActiveNav() {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
}

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
    const profileBox = getEl('user-profile-box');
    const shopBtn = getEl('shop-btn');
    const friendsBtn = getEl('friends-btn');
    const rolesBtn = getEl('roles-btn');
    const nameEl = getEl('my-name');

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
        shopBtn.addEventListener('click', () => {
            setActiveNav('shop-btn');
            shopModal.open();
        });
    }

    if (friendsBtn) {
        friendsBtn.addEventListener('click', () => {
            if (state.friendsView) {
                closeAllModals();
                setActiveNav('friends-btn');
                state.friendsView.show();
            }
        });
    }

    const chatBtn = getEl('chat-btn-hud');
    if (chatBtn) {
        chatBtn.addEventListener('click', () => {
            closeAllModals();
            setActiveNav('chat-btn-hud');
            toggleChat();
        });
    }

    if (rankingBtn) {
        rankingBtn.addEventListener('click', () => {
            const modal = getEl('modal-ranking');
            if (modal) {
                closeAllModals();
                setActiveNav('ranking-btn');
                modal.classList.remove('hidden');
            }
        });
    }

    const shopClose = getEl('shop-close');
    if (shopClose) {
        shopClose.addEventListener('click', () => {
            clearActiveNav();
            shopModal.close();
        });
    }

    if (profileBox) {
        profileBox.addEventListener('click', () => profileModal.open());
    }

    if (rolesBtn) {
        rolesBtn.addEventListener('click', () => {
            const modal = getEl('modal-roles');
            if (modal) {
                closeAllModals();
                setActiveNav('roles-btn');
                modal.classList.remove('hidden');
            }
        });
    }

    const profileClose = getEl('profile-close');
    if (profileClose) {
        profileClose.addEventListener('click', () => {
            clearActiveNav();
            profileModal.close();
        });
    }

    const rolesClose = getEl('roles-close');
    if (rolesClose) {
        rolesClose.addEventListener('click', () => {
            clearActiveNav();
            getEl('modal-roles').classList.add('hidden');
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            closeAllModals();
            setActiveNav('settings-btn');
            modalSettings.classList.remove('hidden');
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            clearActiveNav();
            modalSettings.classList.add('hidden');
        });
    }

    if (rankingBtn) {
        rankingBtn.addEventListener('click', () => {
            closeAllModals();
            setActiveNav('ranking-btn');
            socket.emit('get_ranking');
            modalRanking.classList.remove('hidden');
        });
    }

    if (rankingClose) {
        rankingClose.addEventListener('click', () => {
            clearActiveNav();
            modalRanking.classList.add('hidden');
        });
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

        const avatarImg = getEl('my-avatar');
        const mainCharImg = getEl('main-character-img');
        const koraEl = getEl('kora-value-main');
        const avatarContainer = getEl('my-avatar-container');

        if (nameEl) nameEl.textContent = player.name;
        if (koraEl) koraEl.textContent = player.koraBalance;
        
        if (player.avatar) {
            const avatarUrl = getAvatarUrl(player.avatar);
            if (avatarImg) avatarImg.src = avatarUrl;
            if (mainCharImg) mainCharImg.src = avatarUrl;
        } else {
            // Fallback to a cool placeholder if no avatar is set
            const fallback = 'https://img.icons8.com/color/480/cat.png';
            if (avatarImg) avatarImg.src = fallback;
            if (mainCharImg) mainCharImg.src = fallback;
        }
        
        if (avatarContainer) {
            // Apply frame class directly - preserve base class hud-avatar-box
            const frameClass = player.currentFrame ? `frame-${player.currentFrame}` : '';
            avatarContainer.className = `hud-avatar-box ${frameClass}`;
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
            lobbyListPanel.classList.add('hidden'); // In this layout we don't hide the board, we show overlay
            lobbyWaitingPanel.classList.remove('hidden');
        }
    });

    window.addEventListener('chat_closed', () => {
        clearActiveNav();
    });
}

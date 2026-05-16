import { getEl, closeAllModals } from '../utils/ui.js';
import { getAvatarUrl } from '../utils/gameUtils.js';
import { state } from '../app/state.js';
import { PrivateChatModal } from './PrivateChatModal.js';
import { KoraSendModal } from './KoraSendModal.js';

export class PlayerProfileModal {
    constructor(socket) {
        this.socket = socket;
        this.modal = getEl('modal-player-profile');
        this.selectedPlayer = null;
        this.init();
    }

    init() {
        if (!this.modal) return;

        const closeBtn = getEl('pp-close');
        const closeX = getEl('pp-close-x');
        const chatBtn = getEl('pp-chat-btn');
        const koraBtn = getEl('pp-kora-btn');
        const friendBtn = getEl('pp-friend-btn');

        if (closeBtn) closeBtn.onclick = () => this.close();
        if (closeX) closeX.onclick = () => this.close();

        if (chatBtn) {
            chatBtn.onclick = () => {
                this.close();
                new PrivateChatModal(this.socket, this.selectedPlayer).open();
            };
        }

        if (koraBtn) {
            koraBtn.onclick = () => {
                this.close();
                new KoraSendModal(this.socket, this.selectedPlayer).open();
            };
        }

        if (friendBtn) {
            friendBtn.onclick = () => {
                this.socket.emit('friends:sendRequest', this.selectedPlayer.name);
            };
        }
    }

    open(player) {
        this.selectedPlayer = player;
        const isMe = state.myUserData && (state.myUserData.id === player.id || state.myUserData.name === player.name);

        const avatarContainer = getEl('pp-avatar-container');
        const nameEl = getEl('pp-name');
        const koraEl = getEl('pp-kora');
        const chatBtn = getEl('pp-chat-btn');
        const koraBtn = getEl('pp-kora-btn');
        const friendBtn = getEl('pp-friend-btn');

        if (nameEl) nameEl.textContent = player.name;
        if (koraEl) koraEl.textContent = player.kora || 0;
        
        if (avatarContainer) {
            avatarContainer.innerHTML = `<img src="${getAvatarUrl(player.avatar)}" alt="Avatar">`;
            // Apply frame if available
            const frameClass = player.currentFrame ? `frame-${player.currentFrame}` : '';
            avatarContainer.className = `avatar-container pp-avatar ${frameClass}`;
        }

        // Disable actions if it's me
        if (isMe) {
            if (chatBtn) chatBtn.style.display = 'none';
            if (koraBtn) koraBtn.style.display = 'none';
            if (friendBtn) friendBtn.style.display = 'none';
        } else {
            if (chatBtn) chatBtn.style.display = 'flex';
            if (koraBtn) koraBtn.style.display = 'flex';
            if (friendBtn) friendBtn.style.display = 'flex';
        }

        this.modal.classList.remove('hidden');
        this.modal.style.zIndex = '3000';
    }

    close() {
        if (this.modal) this.modal.classList.add('hidden');
    }
}

import { getEl, closeAllModals, showPopup } from '../utils/ui.js';
import { getAvatarUrl } from '../utils/gameUtils.js';
import { state } from '../app/state.js';
import { openPrivateChat } from '../views/PrivateChatPanel.js';

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
        const friendBtn = getEl('pp-friend-btn');
        
        // Slider elements
        const slider = getEl('pp-kora-slider');
        const numberInput = getEl('pp-kora-input');
        const sendKoraBtn = getEl('pp-kora-send-btn');

        if (closeBtn) closeBtn.onclick = () => this.close();
        if (closeX) closeX.onclick = () => this.close();

        if (chatBtn) {
            chatBtn.onclick = () => {
                const playerToChat = this.selectedPlayer;
                this.close(); // Close modal first
                openPrivateChat(playerToChat);
            };
        }

        if (friendBtn) {
            friendBtn.onclick = () => {
                this.socket.emit('friends:sendRequest', this.selectedPlayer.name);
            };
        }

        // Slider logic
        if (slider && numberInput) {
            slider.oninput = () => {
                numberInput.value = slider.value;
                this.updateTransportButtonState();
            };
            numberInput.oninput = () => {
                let val = parseInt(numberInput.value) || 0;
                const max = parseInt(slider.max);
                if (val > max) val = max;
                if (val < 0) val = 0;
                numberInput.value = val;
                slider.value = val;
                this.updateTransportButtonState();
            };
        }

        if (sendKoraBtn) {
            sendKoraBtn.onclick = () => {
                const amount = parseInt(numberInput.value);
                if (isNaN(amount) || amount <= 0) return;

                this.socket.emit('send_kora', {
                    targetId: this.selectedPlayer.id,
                    targetName: this.selectedPlayer.name,
                    amount: amount
                });
                
                // Show a small success feedback or just reset
                numberInput.value = 0;
                slider.value = 0;
                this.updateTransportButtonState();
            };
        }
    }

    updateTransportButtonState() {
        const sendKoraBtn = getEl('pp-kora-send-btn');
        const numberInput = getEl('pp-kora-input');
        if (!sendKoraBtn || !numberInput) return;

        const val = parseInt(numberInput.value) || 0;
        if (val > 0) {
            sendKoraBtn.classList.add('active');
        } else {
            sendKoraBtn.classList.remove('active');
        }
    }

    open(player) {
        this.selectedPlayer = player;
        const isMe = state.myUserData && (state.myUserData.id === player.id || state.myUserData.name === player.name);

        const avatarContainer = getEl('pp-avatar-container');
        const nameEl = getEl('pp-name');
        const koraEl = getEl('pp-kora');
        
        const chatBtn = getEl('pp-chat-btn');
        const friendBtn = getEl('pp-friend-btn');
        const koraSection = this.modal.querySelector('.pp-kora-transfer-section');
        const slider = getEl('pp-kora-slider');
        const numberInput = getEl('pp-kora-input');

        if (nameEl) nameEl.textContent = player.name;
        if (koraEl) koraEl.textContent = player.kora || 0;
        
        if (avatarContainer) {
            avatarContainer.innerHTML = `<img src="${getAvatarUrl(player.avatar)}" alt="Avatar">`;
            const frameClass = player.currentFrame ? `frame-${player.currentFrame}` : '';
            avatarContainer.className = `avatar-container pp-avatar ${frameClass}`;
        }

        // Setup slider max
        if (slider) {
            const myKora = state.myUserData ? (state.myUserData.koraBalance || 0) : 0;
            slider.max = myKora;
            slider.value = 0;
        }
        if (numberInput) numberInput.value = 0;
        this.updateTransportButtonState();

        // Disable actions if it's me
        if (isMe) {
            if (chatBtn) chatBtn.style.display = 'none';
            if (friendBtn) friendBtn.style.display = 'none';
            if (koraSection) koraSection.style.display = 'none';
        } else {
            if (chatBtn) chatBtn.style.display = 'flex';
            if (friendBtn) friendBtn.style.display = 'flex';
            if (koraSection) koraSection.style.display = 'flex';
        }

        this.modal.classList.remove('hidden');
        this.modal.style.zIndex = '3000';
    }

    close() {
        if (this.modal) this.modal.classList.add('hidden');
    }
}

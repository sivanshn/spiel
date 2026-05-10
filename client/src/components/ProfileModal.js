import { getTranslation } from '../i18n/translations.js';
import { closeAllModals } from '../utils/ui.js';
import { getAvatarUrl } from '../utils/gameUtils.js';
import { state } from '../app/state.js';

export class ProfileModal {
    constructor(socket, playerManager) {
        this.socket = socket;
        this.playerManager = playerManager;
        this.modal = document.getElementById('modal-profile');
        this.ownedGrid = document.getElementById('owned-frames-grid');
        this.previewContainer = document.querySelector('.profile-preview-large .avatar-container');
        this.displayName = document.getElementById('profile-display-name');
        this.displayAvatar = document.getElementById('profile-display-avatar');
        
        this.init();
    }

    init() {
        // Socket listeners for state updates
        this.socket.on('profile_updated', (data) => {
            // Update local player data if needed
            this.render();
        });
    }

    open() {
        closeAllModals();
        this.modal.classList.remove('hidden');
        this.render();
    }

    close() {
        this.modal.classList.add('hidden');
    }

    render() {
        const player = this.playerManager.getSelf() || state.myUserData;
        if (!player) return;

        // Render large preview
        const currentFrame = player.currentFrame || 'default';
        this.previewContainer.className = `avatar-container large ${currentFrame}`;
        
        if (this.displayName) this.displayName.textContent = player.name;
        if (this.displayAvatar) this.displayAvatar.src = getAvatarUrl(player.avatar);
        
        // Render owned frames
        this.ownedGrid.innerHTML = '';
        const owned = player.ownedFrames || ['default'];

        owned.forEach(frameId => {
            const tile = document.createElement('div');
            tile.className = `owned-item-tile ${frameId === currentFrame ? 'active' : ''}`;
            
            const framePreview = document.createElement('div');
            framePreview.className = `frame-preview ${frameId}`;
            
            tile.onclick = () => this.setFrame(frameId);
            
            tile.appendChild(framePreview);
            this.ownedGrid.appendChild(tile);
        });
    }

    setFrame(frameId) {
        this.socket.emit('profile_set_frame', { frameId });
        // Optimistic update locally
        const player = this.playerManager.getSelf();
        if (player) {
            player.currentFrame = frameId;
            this.render();
            // Notify UI to update the small profile box
            window.dispatchEvent(new CustomEvent('player_data_updated'));
        }
    }
}

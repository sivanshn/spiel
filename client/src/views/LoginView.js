import { socket } from '../services/socket.js';
import { showScreen, showPopup, getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

export function initLoginView() {
    const usernameInput = getEl('username');
    const joinBtn = getEl('join-btn');

    if (!usernameInput || !joinBtn) return;

    // Sofort fokussieren – kein Klick nötig
    usernameInput.focus();

    const avatars = ['default_avatar'];
    function getRandomAvatar() {
        return 'default_avatar';
    }

    joinBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            const avatar = getRandomAvatar();
            socket.emit('register_user', { name, avatar });
        }
    });

    usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinBtn.click();
    });

    socket.on('registration_success', (userData) => {
        state.myUserData = userData;
        state.myId = userData.socketId; // Or whatever id is used
        
        const myNameTxt = getEl('my-name');
        const myAvatarImg = getEl('my-avatar');
        
        if (myNameTxt) myNameTxt.textContent = userData.name;
        if (myAvatarImg) myAvatarImg.src = getAvatarUrl(userData.avatar);
        
        showScreen('main');
    });

    socket.on('registration_failed', (msg) => {
        showPopup("ERROR", msg);
    });
}

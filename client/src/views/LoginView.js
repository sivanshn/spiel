import { socket } from '../services/socket.js';
import { showScreen, showPopup, getEl } from '../utils/ui.js';
import { state } from '../app/state.js';

export function initLoginView() {
    const usernameInput = getEl('username');
    const joinBtn = getEl('join-btn');

    if (!usernameInput || !joinBtn) return;

    const avatars = ['goat', 'monkey', 'cat', 'dog', 'fox', 'panda'];
    function getRandomAvatar() {
        return avatars[Math.floor(Math.random() * avatars.length)];
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
        if (myAvatarImg) myAvatarImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.avatar}`;
        
        showScreen('main');
    });

    socket.on('registration_failed', (msg) => {
        showPopup("ERROR", msg);
    });
}

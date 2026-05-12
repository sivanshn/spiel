const screens = {
    login: document.getElementById('screen-login'),
    main: document.getElementById('screen-main'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};

const notificationModal = document.getElementById('notification-modal');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-msg');
const modalClose = document.getElementById('modal-close');

if (modalClose) {
    modalClose.addEventListener('click', () => {
        notificationModal.classList.add('hidden');
    });
}

export function showScreen(screenId) {
    Object.values(screens).forEach(s => {
        if (s) s.classList.remove('active');
    });
    if (screens[screenId]) screens[screenId].classList.add('active');
}

export function showPopup(title, message) {
    if (!notificationModal) return;
    modalTitle.textContent = title;
    modalMsg.textContent = message;
    notificationModal.classList.remove('hidden');
}

export function getEl(id) {
    return document.getElementById(id);
}

export function closeAllModals() {
    const modals = document.querySelectorAll('.modal, .panel, .friends-panel');
    modals.forEach(m => m.classList.add('hidden'));
    
    // Specifically handle some special IDs if they don't have the class
    const panels = ['modal-settings', 'modal-ranking', 'friends-panel', 'modal-roles', 'chat-panel'];
    panels.forEach(id => {
        const el = getEl(id);
        if (el) el.classList.add('hidden');
    });
}

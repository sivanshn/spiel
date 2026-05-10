import { socket } from '../services/socket.js';
import { getEl, showPopup } from '../utils/ui.js';
import { state } from '../app/state.js';
import { translations } from '../i18n/translations.js';

let friendsList = [];
let friendRequests = [];

export function initFriendsView() {
    const friendsBtn = getEl('friends-btn');
    const closeBtn = getEl('close-friends-btn');
    const panel = getEl('friends-panel');
    const tabBtns = document.querySelectorAll('.friends-tabs .tab-btn');
    const sendRequestBtn = getEl('send-friend-request-btn');
    const findInput = getEl('find-friend-input');

    if (friendsBtn) {
        friendsBtn.addEventListener('click', () => {
            panel.classList.remove('hidden');
            socket.emit('friends:getList');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
        });
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // UI Update
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            getEl(`tab-${tabId}`).classList.add('active');
        });
    });

    // Send Request
    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', () => {
            const name = findInput.value.trim();
            if (name) {
                socket.emit('friends:sendRequest', name);
                findInput.value = '';
            }
        });
    }

    // Socket Events
    socket.on('friends:listUpdate', (data) => {
        friendsList = data.friends;
        friendRequests = data.requests;
        renderFriends();
    });

    socket.on('friends:requestReceived', (fromName) => {
        const lang = state.currentLanguage || 'de';
        const msg = lang === 'de' ? `Neue Freundschaftsanfrage von ${fromName}!` : `New friend request from ${fromName}!`;
        showPopup(lang === 'de' ? "FREUNDE" : "FRIENDS", msg);
    });

    socket.on('friends:requestSent', (targetName) => {
        const lang = state.currentLanguage || 'de';
        const t = translations[lang] || translations['de'];
        showPopup(lang === 'de' ? "FREUNDE" : "FRIENDS", t.friends_request_sent);
    });

    socket.on('friends:error', (errorMsg) => {
        const lang = state.currentLanguage || 'de';
        showPopup(lang === 'de' ? "FEHLER" : "ERROR", errorMsg);
    });
}

function renderFriends() {
    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];

    const onlineListEl = getEl('friends-list-online');
    const offlineListEl = getEl('friends-list-offline');
    const requestsListEl = getEl('friend-requests-list');

    if (!onlineListEl || !offlineListEl || !requestsListEl) return;

    // Filter Online/Offline
    const online = friendsList.filter(f => f.online);
    const offline = friendsList.filter(f => !f.online);

    // Render Online
    if (online.length === 0) {
        onlineListEl.innerHTML = `<div class="empty-msg">${t.friends_no_online}</div>`;
    } else {
        onlineListEl.innerHTML = online.map(f => createFriendItem(f, true, t)).join('');
    }

    // Render Offline
    if (offline.length === 0) {
        offlineListEl.innerHTML = `<div class="empty-msg">${t.friends_no_offline}</div>`;
    } else {
        offlineListEl.innerHTML = offline.map(f => createFriendItem(f, false, t)).join('');
    }

    // Render Requests
    if (friendRequests.length === 0) {
        requestsListEl.innerHTML = `<div class="empty-msg">Keine Anfragen</div>`;
    } else {
        requestsListEl.innerHTML = '';
        friendRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <div class="friend-avatar"></div>
                <div class="request-info">
                    <span class="request-name">${req.name}</span>
                </div>
                <div class="request-actions">
                    <button class="action-btn accept-btn" title="${t.friends_status_online}">✔</button>
                    <button class="action-btn decline-btn" title="${t.friends_status_offline}">&times;</button>
                </div>
            `;
            
            item.querySelector('.accept-btn').onclick = () => socket.emit('friends:acceptRequest', req.name);
            item.querySelector('.decline-btn').onclick = () => socket.emit('friends:declineRequest', req.name);
            
            requestsListEl.appendChild(item);
        });
    }
}

function createFriendItem(friend, isOnline, t) {
    const statusText = isOnline ? t.friends_status_online : t.friends_status_offline;
    const statusClass = isOnline ? 'online' : 'offline';

    return `
        <div class="friend-item">
            <div class="friend-avatar"></div>
            <div class="friend-info">
                <span class="friend-name">${friend.name}</span>
                <div class="friend-status">
                    <span class="status-dot ${statusClass}"></span>
                    <span class="status-text ${statusClass}">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

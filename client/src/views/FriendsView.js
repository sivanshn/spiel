import { socket } from '../services/socket.js';
import { getTranslation } from '../i18n/translations.js';
import { state } from '../app/state.js';
import { getEl, showPopup, closeAllModals } from '../utils/ui.js';
import { getAvatarUrl } from '../utils/gameUtils.js';
import { PlayerProfileModal } from '../components/PlayerProfileModal.js';

export class FriendsView {
    constructor() {
        this.panel = getEl('friends-panel');
        this.friendsListEl = getEl('friends-list-container');
        this.requestsListEl = getEl('friends-requests-container');
        this.searchResultsEl = getEl('friends-search-results');
        this.searchInput = getEl('friends-search-input');
        this.searchBtn = getEl('friends-search-btn');
        this.tabs = document.querySelectorAll('.friends-tab');
        this.closeBtn = getEl('friends-close-btn');
        this.playerProfileModal = new PlayerProfileModal(socket);
        
        this.init();
    }

    init() {
        if (this.searchBtn) {
            this.searchBtn.onclick = () => this.search();
        }

        if (this.searchInput) {
            this.searchInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.search();
            };
        }

        if (this.closeBtn) {
            this.closeBtn.onclick = () => this.hide();
        }

        if (this.tabs) {
            this.tabs.forEach(tab => {
                tab.onclick = () => {
                    this.tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const view = tab.getAttribute('data-view');
                    this.showView(view);
                };
            });
        }

        socket.on('friends:list', (list) => {
            this.renderFriends(list);
        });

        socket.on('friends:requests', (requests) => {
            this.renderRequests(requests);
        });

        socket.on('friends:searchResults', (player) => {
            this.renderSearchResult(player);
        });

        socket.on('friends:requestSent', () => {
            showPopup("ERFOLG", "Anfrage gesendet.");
            if (this.searchResultsEl) this.searchResultsEl.innerHTML = '';
        });

        socket.on('friends:update', () => {
            socket.emit('friends:getFriends');
            socket.emit('friends:getRequests');
        });

        socket.on('friends:error', (msg) => {
            showPopup("FEHLER", msg);
        });
    }

    show() {
        closeAllModals();
        if (this.panel) this.panel.classList.remove('hidden');
        socket.emit('friends:getFriends');
        socket.emit('friends:getRequests');
    }

    hide() {
        if (this.panel) this.panel.classList.add('hidden');
    }

    showView(view) {
        document.querySelectorAll('.friends-content-view').forEach(v => v.classList.add('hidden'));
        const target = getEl(`friends-view-${view}`);
        if (target) target.classList.remove('hidden');
    }

    renderFriends(friends) {
        if (!this.friendsListEl) return;
        this.friendsListEl.innerHTML = '';
        if (!friends || friends.length === 0) {
            this.friendsListEl.innerHTML = `<div class="empty-msg">${getTranslation('friends_empty_list', state.currentLanguage)}</div>`;
            return;
        }

        friends.forEach(f => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            const avatarUrl = getAvatarUrl(f.avatar);
            const statusText = f.online ? 'Online' : 'Offline';
            const statusClass = f.online ? 'online' : 'offline';
            
            item.innerHTML = `
                <div class="avatar-container small ${f.currentFrame || 'default'}">
                    <img src="${avatarUrl}" alt="Avatar">
                </div>
                <div class="friend-info">
                    <span class="friend-name">${f.name}</span>
                    <span class="friend-status ${statusClass}">${statusText}</span>
                </div>
            `;
            item.onclick = () => {
                this.playerProfileModal.open(f);
            };
            this.friendsListEl.appendChild(item);
        });
    }

    search() {
        if (this.searchInput) {
            const name = this.searchInput.value.trim();
            if (name) {
                socket.emit('friends:search', name);
            }
        }
    }

    renderRequests(requests) {
        if (!this.requestsListEl) return;
        this.requestsListEl.innerHTML = '';
        if (!requests || requests.length === 0) {
            this.requestsListEl.innerHTML = `<div class="empty-msg">${getTranslation('friends_no_requests', state.currentLanguage)}</div>`;
            return;
        }

        requests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <span class="friend-name">${req.name}</span>
                <div class="request-btns">
                    <button class="action-btn small accept-btn">✓</button>
                    <button class="action-btn small secondary reject-btn">✗</button>
                </div>
            `;
            item.querySelector('.accept-btn').onclick = () => socket.emit('friends:acceptRequest', req.name);
            item.querySelector('.reject-btn').onclick = () => socket.emit('friends:rejectRequest', req.name);
            this.requestsListEl.appendChild(item);
        });
    }

    renderSearchResult(player) {
        if (!this.searchResultsEl) return;
        this.searchResultsEl.innerHTML = '';
        if (!player) {
            this.searchResultsEl.innerHTML = `<div class="empty-msg">${getTranslation('friends_search_no_results', state.currentLanguage)}</div>`;
            return;
        }

        const card = document.createElement('div');
        card.className = 'search-result-card animate-in';
        const avatarUrl = getAvatarUrl(player.avatar);
        card.innerHTML = `
            <div class="player-info-row">
                <div class="avatar-container small ${player.currentFrame || 'default'}">
                    <img src="${avatarUrl}" alt="Avatar">
                </div>
                <span class="player-name">${player.name}</span>
            </div>
            <div class="request-actions">
                 <button class="action-btn small send-req-btn">${getTranslation('friends_btn_send', state.currentLanguage)}</button>
            </div>
        `;

        const sendReq = () => {
            socket.emit('friends:sendRequest', player.name);
        };

        card.querySelector('.send-req-btn').onclick = sendReq;

        card.onclick = () => {
            this.playerProfileModal.open(player);
        };
        this.searchResultsEl.appendChild(card);
    }
}

export function initFriendsView() {
    state.friendsView = new FriendsView();
}

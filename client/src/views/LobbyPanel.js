import { socket } from '../services/socket.js';
import { translations } from '../i18n/translations.js';
import { state } from '../app/state.js';

export function renderLobbyList(lobbies, container) {
    if (!container) return;
    container.innerHTML = '';

    const texts = translations[state.currentLanguage];

    if (lobbies.length === 0) {
        container.innerHTML = `<p class="empty-msg">${texts.main_empty_lobbies}</p>`;
        return;
    }

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'lobby-card animate-in';
        card.innerHTML = `
            <div class="lobby-info-left">
                <h3>${texts.lobby_title} #${lobby.id.slice(0, 4).toUpperCase()}</h3>
                <p>${texts.main_leadership} ${lobby.hostName}</p>
            </div>
            <div class="lobby-info-right">
                <span class="player-count">${lobby.playerCount} / 4</span>
                <button class="join-btn-small">${texts.main_join}</button>
            </div>
        `;
        const btn = card.querySelector('.join-btn-small');
        btn.onclick = () => {
            socket.emit('join_lobby', lobby.id);
        };
        container.appendChild(card);
    });
}

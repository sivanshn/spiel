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
        const entry = document.createElement('div');
        entry.className = 'mission-mini-card animate-in';
        entry.innerHTML = `
            <div class="mini-card-info">
                <span class="mini-card-name">${lobby.hostName}</span>
                <span class="mini-card-players">${lobby.playerCount} / 4</span>
            </div>
            <button class="mini-join-btn">GO</button>
        `;
        const btn = entry.querySelector('.mini-join-btn');
        btn.onclick = () => {
            socket.emit('join_lobby', lobby.id);
        };
        container.appendChild(entry);
    });
}

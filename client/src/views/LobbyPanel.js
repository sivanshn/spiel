/**
 * LobbyPanel.js
 * Verwaltet die Anzeige der Liste offener Lobbys.
 * Implementiert das hochwertige Cyber Noir Design.
 */

import { socket } from '../services/socket.js';
import { translations } from '../i18n/translations.js';
import { state } from '../app/state.js';

export function renderLobbyList(lobbies, container) {
    if (!container) return;
    container.innerHTML = '';
    
    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];
    
    if (lobbies.length === 0) {
        container.innerHTML = `<p class="empty-msg">${t.main_empty_lobbies}</p>`;
        return;
    }

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'lobby-card-item animate-in';
        card.onclick = () => {
            socket.emit('join_lobby', lobby.id);
        };

        card.innerHTML = `
            <div class="lobby-info">
                <span class="lobby-name">${t.lobby_title} VON ${lobby.hostName.toUpperCase()}</span>
                <span class="lobby-details">ID: #${lobby.id.slice(0, 4)} — ${lobby.playerCount} / 4 SPIELER</span>
            </div>
            <div class="join-icon">❯</div>
        `;
        container.appendChild(card);
    });
}

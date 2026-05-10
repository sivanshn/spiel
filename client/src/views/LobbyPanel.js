/**
 * LobbyPanel.js
 * Verwaltet die Anzeige der Liste offener Lobbys.
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
        const item = document.createElement('div');
        item.className = 'lobby-item';
        
        item.innerHTML = `
            <div class="lobby-info">
                <span class="lobby-title" style="font-weight:800; display:block;">${t.lobby_title} #${lobby.id.slice(0, 4)}</span>
                <span class="lobby-host" style="font-size:0.8rem; color:#94a3b8;">Leitung: ${lobby.hostName}</span>
            </div>
            <div class="lobby-actions" style="display:flex; align-items:center; gap:1rem;">
                <span class="player-count" style="font-weight:900;">${lobby.playerCount} / 4</span>
                <button class="join-btn-small" style="padding:0.4rem 0.8rem; font-size:0.8rem;">${t.main_join}</button>
            </div>
        `;
        
        const btn = item.querySelector('.join-btn-small');
        btn.onclick = () => {
            socket.emit('join_lobby', lobby.id);
        };
        
        container.appendChild(item);
    });
}

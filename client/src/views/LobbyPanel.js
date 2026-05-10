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
            <div class="p-avatar" style="display:flex; align-items:center; justify-content:center; color:#3b82f6; font-size:1.5rem; background:rgba(59,130,246,0.1);">#</div>
            <div class="lobby-info" style="flex:1;">
                <span class="p-name">${t.lobby_title} VON ${lobby.hostName.toUpperCase()}</span>
                <div style="font-size:0.8rem; color:#64748b; font-weight:800; margin-top:0.2rem; letter-spacing:1px;">
                    ID: #${lobby.id.slice(0, 4)} — ${lobby.playerCount} / 4 SPIELER
                </div>
            </div>
            <div class="join-icon" style="color:#3b82f6; font-weight:900;">❯</div>
        `;
        container.appendChild(card);
    });
}

/**
 * LobbyWaitingPanel.js
 * Verwaltet die Anzeige der Spieler in einer Lobby.
 * Modernisiertes Card-Layout entsprechend dem neuen Design.
 */

import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { translations } from '../i18n/translations.js';

export function renderLobbyPlayers(lobby) {
    const list = getEl('lobby-player-list');
    const countLabel = getEl('lobby-player-count-label');
    const startBtn = getEl('start-game-btn');
    const hostTitle = getEl('lobby-host-name-title');

    if (!list) return;

    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];

    list.innerHTML = '';
    const players = lobby.players || [];
    
    // Update Lobby Title with Host Name
    const host = players.find(p => p.isHost);
    if (hostTitle) {
        hostTitle.textContent = host ? `VON ${host.name.toUpperCase()}` : 'VON ...';
    }

    if (countLabel) {
        countLabel.textContent = `SPIELER: ${players.length} / ${lobby.maxPlayers || 4}`;
    }

    // Render active players as cards
    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card-item active';
        
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatar || 'fox'}`;
        const isHost = p.isHost;
        const isMe = p.id === state.myId;
        const micIcon = p.micEnabled !== false ? '🎤' : '🔇';

        card.innerHTML = `
            <img src="${avatarUrl}" class="p-card-avatar" alt="Avatar">
            <span class="p-card-name">${p.name} ${isMe ? (lang === 'de' ? '(Du)' : '(You)') : ''}</span>
            <div class="card-badges">
                ${isHost ? `<span class="p-card-badge">👑 HOST</span>` : `<span class="p-card-badge" style="background:transparent; border:none; opacity:0.5;">${micIcon}</span>`}
            </div>
        `;
        list.appendChild(card);
    });

    // Fill remaining slots with empty cards
    const max = lobby.maxPlayers || 4;
    for (let i = players.length; i < max; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'player-card-item empty';
        emptyCard.innerHTML = `
            <div class="p-card-avatar" style="display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:rgba(255,255,255,0.2);">+</div>
            <span class="p-card-name" style="color:rgba(255,255,255,0.2);">Freier Platz</span>
            <span style="font-size:0.7rem; color:rgba(255,255,255,0.1); font-weight:800;">Warten auf Spieler...</span>
        `;
        list.appendChild(emptyCard);
    }

    // Start Button visibility
    if (startBtn) {
        const isHost = state.myId && players.find(p => p.id === state.myId && p.isHost);
        if (isHost && players.length >= 1) { // Zum Testen ab 1 Spieler, produktiv 4
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    }
}

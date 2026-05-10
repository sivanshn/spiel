/**
 * LobbyWaitingPanel.js
 * Verwaltet die Anzeige der Spieler in einer Lobby (Warteraum).
 * Implementiert das hochwertige Cyber Noir Design mit Spieler-Karten.
 */

import { socket } from '../services/socket.js';
import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { initVoiceChat, toggleMute, disconnectAll, isVoiceReady } from '../services/voiceService.js';
import { translations } from '../i18n/translations.js';

let micBtn = null;

export function initLobbyWaitingPanel() {
    const leaveLobbyBtn = getEl('leave-lobby-btn');
    const startGameBtn = getEl('start-game-btn');
    const lobbyListPanel = getEl('lobby-list-panel');
    const lobbyWaitingPanel = getEl('lobby-waiting-panel');

    if (leaveLobbyBtn) {
        leaveLobbyBtn.onclick = () => {
            socket.emit('leave_lobby');
            state.currentLobby = null;
            disconnectAll();
            if (lobbyWaitingPanel && lobbyListPanel) {
                lobbyWaitingPanel.classList.add('hidden');
                lobbyListPanel.classList.remove('hidden');
            }
        };
    }

    if (startGameBtn) {
        startGameBtn.onclick = () => {
            socket.emit('start_lobby_game');
        };
    }
}

export function renderLobbyPlayers(lobby) {
    const title = getEl('lobby-view-title');
    const count = getEl('lobby-player-count');
    const list = getEl('lobby-player-list');
    const startBtn = getEl('start-game-btn');
    const waitMsg = getEl('wait-msg');

    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];

    // Host finden
    const host = lobby.players.find(p => p.isHost);
    if (title) title.textContent = host ? `${t.lobby_title} VON ${host.name.toUpperCase()}` : t.lobby_title;

    if (count) count.textContent = `${lobby.players.length} / ${lobby.maxPlayers || 4}`;
    if (list) list.innerHTML = '';

    // Aktive Spieler rendern
    lobby.players.forEach(p => {
        const isMe = p.socketId === state.myId;
        const card = document.createElement('div');
        card.className = `player-card-item ${p.isHost ? 'host' : ''}`;
        
        const avatarSeed = p.avatar || 'fox';
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;
        const micIcon = p.micEnabled !== false ? '🎤' : '🔇';

        card.innerHTML = `
            <img src="${avatarUrl}" class="p-avatar" alt="Avatar">
            <span class="p-name">${p.name} ${isMe ? `(${lang === 'de' ? 'ICH' : 'YOU'})` : ''}</span>
            <div class="p-actions">
                ${p.isHost ? `<span class="p-badge">${t.lobby_host_badge}</span>` : `<span class="p-mic">${micIcon}</span>`}
            </div>
        `;
        list.appendChild(card);
    });

    // Freie Slots auffüllen
    const max = lobby.maxPlayers || 4;
    for (let i = lobby.players.length; i < max; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'player-card-item empty';
        emptyCard.innerHTML = `
            <div class="p-avatar" style="display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.1); font-size:1.2rem;">+</div>
            <span class="p-name" style="color:rgba(255,255,255,0.2);">${t.lobby_free_slot}</span>
            <span style="font-size:0.75rem; color:rgba(255,255,255,0.1); font-weight:700;">${t.lobby_waiting}</span>
        `;
        list.appendChild(emptyCard);
    }

    // Button-Logik
    const isHost = lobby.hostId === state.myId;
    const isFull = lobby.players.length >= 1; // Zum Testen auf 1, für Release auf 4

    if (startBtn) {
        if (isHost) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = !isFull;
        } else {
            startBtn.classList.add('hidden');
        }
    }

    if (waitMsg) {
        if (isHost) {
            waitMsg.classList.add('hidden');
        } else {
            waitMsg.classList.remove('hidden');
        }
    }
}

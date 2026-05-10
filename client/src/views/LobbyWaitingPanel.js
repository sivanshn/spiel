/**
 * LobbyWaitingPanel.js
 * Verwaltet die Anzeige der Spieler in einer Lobby.
 * Wiederhergestellt auf die stabile, funktionale Version.
 */

import { socket } from '../services/socket.js';
import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { disconnectAll } from '../services/voiceService.js';

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

    if (title) title.textContent = `LOBBY VON ${lobby.hostName.toUpperCase()}`;
    if (count) count.textContent = `${lobby.players.length} / 4`;
    if (list) list.innerHTML = '';

    lobby.players.forEach(p => {
        const isMe = p.socketId === state.myId;
        const item = document.createElement('div');
        item.className = 'player-item';
        
        item.innerHTML = `
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatar}" class="player-avatar" style="width:40px; height:40px; border-radius:8px; margin-right:1rem;">
            <span class="player-name" style="flex:1; font-weight:700;">${p.name} ${isMe ? '(Du)' : ''}</span>
            ${p.isHost ? '<span class="host-badge" style="background:#3b82f6; color:white; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.7rem; font-weight:900;">HOST</span>' : ''}
        `;
        list.appendChild(item);
    });

    const isHost = lobby.hostId === state.myId;
    const canStart = lobby.players.length >= 1; // Test-Modus

    if (startBtn) {
        if (isHost) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = !canStart;
        } else {
            startBtn.classList.add('hidden');
        }
    }

    if (waitMsg) {
        if (isHost) waitMsg.classList.add('hidden');
        else waitMsg.classList.remove('hidden');
    }
}

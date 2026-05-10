import { socket } from '../services/socket.js';
import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { initVoiceChat, toggleMute, getMuteState, disconnectAll, isVoiceReady } from '../services/voiceService.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

let micBtn = null;

export function initLobbyWaitingPanel() {
    const leaveLobbyBtn = getEl('leave-lobby-btn');
    const startGameBtn = getEl('start-game-btn');
    const lobbyListPanel = getEl('lobby-list-panel');
    const lobbyWaitingPanel = getEl('lobby-waiting-panel');

    // Mic-Button dynamisch in Footer einfügen
    const footer = lobbyWaitingPanel?.querySelector('.panel-footer');
    if (footer && !getEl('lobby-mic-btn')) {
        micBtn = document.createElement('button');
        micBtn.id = 'lobby-mic-btn';
        micBtn.className = 'mic-btn inactive';
        micBtn.title = 'Mikrofon (lädt...)';
        micBtn.textContent = '🎤';
        footer.insertBefore(micBtn, footer.firstChild);

        micBtn.addEventListener('click', async () => {
            if (!isVoiceReady()) {
                await initVoiceChat();
                if (!isVoiceReady()) return; // Permission verweigert
                micBtn.classList.remove('inactive');
                micBtn.title = 'Mikrofon aktiv – klicken zum Stummschalten';
            }
            const muted = toggleMute();
            micBtn.textContent = muted ? '🔇' : '🎤';
            micBtn.classList.toggle('muted', muted);
            micBtn.title = muted ? 'Stummgeschaltet – klicken zum Aktivieren' : 'Mikrofon aktiv – klicken zum Stummschalten';
        });
    }

    if (leaveLobbyBtn) {
        leaveLobbyBtn.addEventListener('click', () => {
            socket.emit('leave_lobby');
            state.currentLobby = null;
            disconnectAll(); // Voice-Verbindungen trennen
            resetMicBtn();
            if (lobbyWaitingPanel && lobbyListPanel) {
                lobbyWaitingPanel.classList.add('hidden');
                lobbyListPanel.classList.remove('hidden');
            }
        });
    }

    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            socket.emit('start_lobby_game');
        });
    }
}

function resetMicBtn() {
    if (micBtn) {
        micBtn.textContent = '🎤';
        micBtn.classList.remove('muted');
        micBtn.classList.add('inactive');
        micBtn.title = 'Mikrofon (lädt...)';
    }
}

export function renderLobbyPlayers(lobby) {
    const title = getEl('lobby-view-title');
    const count = getEl('lobby-player-count');
    const list = getEl('lobby-player-list');
    const startBtn = getEl('start-game-btn');
    const waitMsg = getEl('wait-msg');

    if (title) title.textContent = lobby.name.toUpperCase();
    if (count) count.textContent = `${lobby.players.length} / 4`;
    if (list) list.innerHTML = '';

    lobby.players.forEach(p => {
        const isMe = p.socketId === state.myId;
        const item = document.createElement('div');
        item.className = 'player-item';
        item.setAttribute('data-peer-id', p.socketId);
        if (p.isHost) item.classList.add('is-host');

        item.innerHTML = `
            <img src="${getAvatarUrl(p.avatar)}" class="player-avatar">
            <span class="player-name">${p.name}</span>
            ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
            ${!isMe ? '<span class="voice-indicator">🎤</span>' : ''}
        `;
        if (list) list.appendChild(item);
    });

    const isHost = lobby.hostId === state.myId;
    const isFull = lobby.players.length >= 4;

    if (startBtn) {
        if (isHost) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = !isFull;
            startBtn.style.opacity = isFull ? '1' : '0.4';
            startBtn.style.cursor = isFull ? 'pointer' : 'not-allowed';
            startBtn.title = isFull ? 'Spiel starten' : `Noch ${4 - lobby.players.length} Spieler fehlen`;
        } else {
            startBtn.classList.add('hidden');
        }
    }

    if (waitMsg) {
        if (isHost) waitMsg.classList.add('hidden');
        else waitMsg.classList.remove('hidden');
    }
}

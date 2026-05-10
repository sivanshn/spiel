import { socket } from '../services/socket.js';
import { state } from '../app/state.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

let unreadCount = 0;
let isOpen = false;
let chatPanel = null;
let chatMessages = null;
let chatToggleBtn = null;
let unreadBadge = null;

export function initChatPanel() {
    // Floating Toggle Button erstellen
    chatToggleBtn = document.createElement('button');
    chatToggleBtn.id = 'chat-toggle-btn';
    chatToggleBtn.title = 'Chat öffnen';
    chatToggleBtn.innerHTML = `💬<span id="chat-unread-badge" class="hidden"></span>`;
    chatToggleBtn.classList.add('hidden'); // Erst nach Login sichtbar
    document.body.appendChild(chatToggleBtn);

    unreadBadge = chatToggleBtn.querySelector('#chat-unread-badge');

    // Chat Panel HTML
    chatPanel = document.createElement('div');
    chatPanel.id = 'chat-panel';
    chatPanel.classList.add('hidden');
    chatPanel.innerHTML = `
        <div class="chat-header">
            <h3>💬 Globaler Chat</h3>
            <span class="chat-online-count" id="chat-online-count">0 online</span>
        </div>
        <div id="chat-messages"></div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Nachricht eingeben..." maxlength="200" autocomplete="off">
            <button id="chat-send-btn" title="Senden">➤</button>
        </div>
    `;
    document.body.appendChild(chatPanel);

    chatMessages = chatPanel.querySelector('#chat-messages');

    // Toggle
    chatToggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        chatPanel.classList.toggle('hidden', !isOpen);
        chatToggleBtn.innerHTML = isOpen
            ? `✕<span id="chat-unread-badge" class="hidden"></span>`
            : `💬<span id="chat-unread-badge" class="hidden"></span>`;
        unreadBadge = chatToggleBtn.querySelector('#chat-unread-badge');

        if (isOpen) {
            unreadCount = 0;
            unreadBadge.classList.add('hidden');
            // Nach unten scrollen
            setTimeout(() => scrollToBottom(), 50);
            chatPanel.querySelector('#chat-input')?.focus();
        }
    });

    // Senden via Button
    const sendBtn = chatPanel.querySelector('#chat-send-btn');
    const input = chatPanel.querySelector('#chat-input');

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Nachrichten empfangen
    socket.on('chat_message', (msg) => {
        appendMessage(msg);

        if (!isOpen) {
            unreadCount++;
            unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            unreadBadge.classList.remove('hidden');
        }
    });

    // Chat erst nach Login anzeigen + History laden
    socket.on('registration_success', () => {
        chatToggleBtn.classList.remove('hidden'); // Chat-Button einblenden
        socket.emit('get_chat_history');
    });

    socket.on('chat_history', (history) => {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        history.forEach(msg => appendMessage(msg, false)); // false = keine Unread-Zählung
        scrollToBottom();
    });

    // Online-Zähler aktualisieren (bei Lobby-Updates)
    socket.on('lobby_list_update', () => updateOnlineCount());
    socket.on('registration_success', () => updateOnlineCount());
}

function sendMessage() {
    const input = chatPanel?.querySelector('#chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !state.myUserData) return;
    socket.emit('chat_send', text);
    input.value = '';
}

function appendMessage(msg, countUnread = true) {
    if (!chatMessages) return;

    const isMe = msg.name === state.myUserData?.name;
    const div = document.createElement('div');
    div.className = `chat-msg ${isMe ? 'is-me' : ''}`;
    div.innerHTML = `
        <img class="chat-msg-avatar" src="${getAvatarUrl(msg.avatar)}" alt="${msg.name}">
        <div class="chat-msg-body">
            <div class="chat-msg-meta">
                <span class="chat-msg-name">${isMe ? 'Du' : msg.name}</span>
                <span class="chat-msg-time">${msg.timestamp}</span>
            </div>
            <div class="chat-msg-bubble">${escapeHtml(msg.text)}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateOnlineCount() {
    const el = chatPanel?.querySelector('#chat-online-count');
    if (!el) return;
    // Simpel: Anzahl der verbundenen Sockets (kommt vom Server via connectedUsers.size)
    // Wir nutzen den Lobby-Update um zu wissen wie viele online sind (Proxy)
    // Alternativ: Socket-Event 'online_count' vom Server
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

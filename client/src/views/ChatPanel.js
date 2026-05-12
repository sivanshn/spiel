import { socket } from '../services/socket.js';
import { state } from '../app/state.js';
import { getAvatarUrl } from '../utils/gameUtils.js';

let unreadCount = 0;
let isOpen = false;
let chatPanel = null;
let chatMessages = null;

export function initChatPanel() {
    // Chat Panel HTML
    chatPanel = document.createElement('div');
    chatPanel.id = 'chat-panel';
    chatPanel.classList.add('hidden');
    chatPanel.innerHTML = `
        <div class="chat-header">
            <h3>💬 Globaler Chat</h3>
            <div class="chat-header-right">
                <span class="chat-online-count" id="chat-online-count">0 online</span>
                <button id="chat-close-btn" class="chat-close-x">✕</button>
            </div>
        </div>
        <div id="chat-messages"></div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Nachricht eingeben..." maxlength="200" autocomplete="off">
            <button id="chat-send-btn" title="Senden">➤</button>
        </div>
    `;
    document.body.appendChild(chatPanel);

    const closeBtn = chatPanel.querySelector('#chat-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleChat();
            // Optional: Dispatch event to clear nav highlight in MainView
            window.dispatchEvent(new CustomEvent('chat_closed'));
        });
    }

    chatMessages = chatPanel.querySelector('#chat-messages');

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
    });

    // Chat erst nach Login History laden
    socket.on('registration_success', () => {
        socket.emit('get_chat_history');
    });

    socket.on('chat_history', (history) => {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        history.forEach(msg => appendMessage(msg, false)); 
        scrollToBottom();
    });

    // Online-Zähler aktualisieren (bei Lobby-Updates)
    socket.on('lobby_list_update', () => updateOnlineCount());
    socket.on('registration_success', () => updateOnlineCount());
}

export function toggleChat() {
    isOpen = !isOpen;
    if (chatPanel) {
        chatPanel.classList.toggle('hidden', !isOpen);
        if (isOpen) {
            unreadCount = 0;
            setTimeout(() => scrollToBottom(), 50);
            const input = chatPanel.querySelector('#chat-input');
            if (input) input.focus();
        }
    }
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
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

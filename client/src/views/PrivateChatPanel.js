import { socket } from '../services/socket.js';
import { state } from '../app/state.js';
import { getEl } from '../utils/ui.js';

let isOpen = false;
let targetPlayer = null;
let panel = null;
let messagesArea = null;
let input = null;

export function initPrivateChatPanel() {
    panel = getEl('private-chat-panel');
    if (!panel) return;

    messagesArea = getEl('pc-messages');
    input = getEl('pc-input');
    const sendBtn = getEl('pc-send-btn');
    const closeBtn = getEl('pc-close-btn');

    if (closeBtn) closeBtn.onclick = () => closePrivateChat();
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
    }

    // Listen for private messages
    socket.on('private_message_received', (msg) => {
        if (targetPlayer && (msg.fromId === targetPlayer.id || (msg.fromId === state.myUserData.id && msg.toId === targetPlayer.id))) {
            appendMessage(msg);
        }
    });

    socket.on('private_chat_history', (history) => {
        if (!messagesArea) return;
        messagesArea.innerHTML = '';
        history.forEach(msg => appendMessage(msg));
        scrollToBottom();
    });
}

export function openPrivateChat(player) {
    targetPlayer = player;
    isOpen = true;
    
    const nameEl = getEl('pc-target-name');
    if (nameEl) nameEl.textContent = player.name;
    
    if (panel) panel.classList.remove('hidden');
    if (input) {
        input.value = '';
        input.focus();
    }
    
    // Request history
    socket.emit('get_private_history', player.id);
}

export function closePrivateChat() {
    isOpen = false;
    if (panel) panel.classList.add('hidden');
    targetPlayer = null;
}

function sendMessage() {
    if (!input || !targetPlayer) return;
    const text = input.value.trim();
    if (!text) return;

    socket.emit('private_message_send', {
        targetId: targetPlayer.id,
        text: text
    });
    input.value = '';
}

function appendMessage(msg) {
    if (!messagesArea) return;
    
    const isMe = msg.fromId === state.myUserData.id;
    const div = document.createElement('div');
    div.className = `pc-msg ${isMe ? 'is-me' : ''}`;
    div.innerHTML = `
        <div class="pc-msg-bubble">${escapeHtml(msg.text)}</div>
        <span class="pc-msg-time">${msg.timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    messagesArea.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    if (messagesArea) messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

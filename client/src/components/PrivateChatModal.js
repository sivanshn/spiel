import { getTranslation } from '../i18n/translations.js';
import { state } from '../app/state.js';

export class PrivateChatModal {
    constructor(socket, targetPlayer) {
        this.socket = socket;
        this.targetPlayer = targetPlayer;
        this.modal = null;
    }

    open() {
        this.modal = document.createElement('div');
        this.modal.id = `modal-private-chat-${this.targetPlayer.id}`;
        this.modal.className = 'modal private-chat-modal';
        this.modal.style.zIndex = '2100';
        this.modal.innerHTML = `
            <div class="modal-content glass-card chat-modal-panel">
                <div class="chat-modal-header">
                    <h3>${getTranslation('private_chat_title')}: ${this.targetPlayer.name}</h3>
                    <button class="chat-close-btn">&times;</button>
                </div>
                <div id="private-chat-messages" class="chat-messages-area"></div>
                <div class="chat-modal-input">
                    <input type="text" id="private-chat-input" placeholder="${getTranslation('private_chat_placeholder')}" maxlength="200">
                    <button id="private-chat-send-btn" class="action-btn">${getTranslation('private_chat_send')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        const input = this.modal.querySelector('#private-chat-input');
        const sendBtn = this.modal.querySelector('#private-chat-send-btn');
        const closeBtn = this.modal.querySelector('.chat-close-btn');
        const messagesArea = this.modal.querySelector('#private-chat-messages');

        closeBtn.addEventListener('click', () => this.close());
        
        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;
            this.socket.emit('private_message_send', {
                targetId: this.targetPlayer.id,
                text: text
            });
            input.value = '';
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Request history
        this.socket.emit('get_private_history', this.targetPlayer.id);

        // Listen for messages
        this.messageHandler = (msg) => {
            if (msg.fromId === this.targetPlayer.id || (msg.fromId === state.myUserData.id && msg.toId === this.targetPlayer.id)) {
                this.appendMessage(msg);
            }
        };

        this.historyHandler = (history) => {
            messagesArea.innerHTML = '';
            history.forEach(msg => this.appendMessage(msg));
        };

        this.socket.on('private_message_received', this.messageHandler);
        this.socket.on('private_chat_history', this.historyHandler);

        input.focus();
    }

    appendMessage(msg) {
        const messagesArea = this.modal.querySelector('#private-chat-messages');
        if (!messagesArea) return;

        const isMe = msg.fromId === state.myUserData.id;
        const msgDiv = document.createElement('div');
        msgDiv.className = `private-msg ${isMe ? 'msg-sent' : 'msg-received'}`;
        msgDiv.innerHTML = `
            <div class="msg-bubble">
                <span class="msg-text">${msg.text}</span>
                <span class="msg-time">${msg.timestamp}</span>
            </div>
        `;
        messagesArea.appendChild(msgDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    close() {
        this.socket.off('private_message_received', this.messageHandler);
        this.socket.off('private_chat_history', this.historyHandler);
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}

const { connectedUsers } = require('../utils/store');

const MAX_HISTORY = 50;
const chatHistory = []; // Letzte 50 Nachrichten

/**
 * Registriert den globalen Chat.
 * - Nachrichten werden an ALLE gesendet
 * - Nur die letzten 50 werden gespeichert
 */
function registerChatHandlers(io, socket) {
    // Chathistorie beim Verbinden senden
    socket.on('get_chat_history', () => {
        socket.emit('chat_history', chatHistory);
    });

    socket.on('chat_send', (text) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;
        if (!text || typeof text !== 'string') return;

        const trimmed = text.trim().slice(0, 200);
        if (!trimmed) return;

        const message = {
            id: Date.now(),
            name: user.name,
            avatar: user.avatar || 'fox',
            text: trimmed,
            timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        };

        // In History speichern (max 50)
        chatHistory.push(message);
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory.shift(); // Älteste Nachricht entfernen
        }

        // An alle Clients senden
        io.emit('chat_message', message);
    });
}

module.exports = { registerChatHandlers };

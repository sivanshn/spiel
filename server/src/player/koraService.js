const { connectedUsers } = require('../utils/store');

function registerKoraHandlers(io, socket) {
    socket.on('send_kora', (data) => {
        const { targetId, amount } = data;
        const sender = connectedUsers.get(socket.id);
        const receiver = connectedUsers.get(targetId);

        if (!sender || !receiver) {
            return socket.emit('kora_transfer_error', 'Spieler nicht gefunden.');
        }

        if (socket.id === targetId) {
            return socket.emit('kora_transfer_error', 'Du kannst dir selbst keine Kora senden.');
        }

        const koraAmount = parseInt(amount);
        if (isNaN(koraAmount) || koraAmount <= 0) {
            return socket.emit('kora_transfer_error', 'Ungültiger Betrag.');
        }

        if (sender.koraBalance < koraAmount) {
            return socket.emit('kora_transfer_error', 'Nicht genug Kora.');
        }

        // Transfer
        sender.koraBalance -= koraAmount;
        receiver.koraBalance += koraAmount;

        console.log(`[Kora] Transfer: ${sender.name} -> ${receiver.name} (${koraAmount} Kora)`);

        // Updates senden
        socket.emit('kora_update', { balance: sender.koraBalance, earned: 0 });
        socket.emit('kora_transfer_success', { 
            message: `Erfolgreich ${koraAmount} Kora an ${receiver.name} gesendet.`,
            newBalance: sender.koraBalance
        });

        // Empfänger benachrichtigen
        const receiverSocket = io.sockets.sockets.get(targetId);
        if (receiverSocket) {
            receiverSocket.emit('kora_update', { balance: receiver.koraBalance, earned: 0 });
            receiverSocket.emit('notification', { 
                title: 'KORA ERHALTEN', 
                message: `${sender.name} hat dir ${koraAmount} Kora gesendet!` 
            });
        }
        
        // Sync Player Data (Ranking etc)
        const { broadcastRanking } = require('../ranking/rankingService');
        broadcastRanking(io);
    });
}

module.exports = { registerKoraHandlers };

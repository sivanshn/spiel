/**
 * shopManager.js
 * Verwaltet Shop-Aktionen auf Serverseite.
 * Implementiert Kauf von Fähigkeiten (z.B. Straßensperre).
 */

const { connectedUsers } = require('../utils/store');

const ABILITIES = {
    roadblock: { priceKora: 10 }
};

/**
 * Registriert Socket-Handler für den Shop.
 */
function registerShopHandlers(io, socket) {
    socket.on('shop_get_items', () => {
        // Liste der verfügbaren Items vom Server
        socket.emit('shop_items_list', [
            { id: 'roadblock', priceKora: 10 }
        ]);
    });

    socket.on('shop_buy', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const abilityId = data.abilityId;
        const ability = ABILITIES[abilityId];
        
        if (!ability) {
            return socket.emit('shop_buy_result', { 
                success: false, 
                message: 'Item nicht gefunden.' 
            });
        }

        if (user.koraBalance < ability.priceKora) {
            return socket.emit('shop_buy_result', { 
                success: false, 
                message: 'Nicht genug Kora.' 
            });
        }

        // Kora abziehen
        user.koraBalance -= ability.priceKora;
        
        // Inventar aktualisieren
        if (!user.abilities) user.abilities = {};
        user.abilities[abilityId] = (user.abilities[abilityId] || 0) + 1;

        console.log(`[Shop] ${user.name} kaufte ${abilityId}. Kora-Rest: ${user.koraBalance}`);

        // Update an Client
        socket.emit('kora_update', { balance: user.koraBalance, earned: 0 });
        socket.emit('shop_buy_result', {
            success: true,
            abilityId: abilityId,
            newCount: user.abilities[abilityId],
            message: 'Kauf erfolgreich!'
        });
    });
}

module.exports = { registerShopHandlers };

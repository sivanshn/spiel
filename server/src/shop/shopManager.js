/**
 * shopManager.js
 * Verwaltet Shop-Aktionen auf Serverseite.
 * Version 0.1 – Struktur vorbereitet.
 */

const { connectedUsers } = require('../utils/store');

/**
 * Registriert Socket-Handler für den Shop.
 */
function registerShopHandlers(io, socket) {
    socket.on('shop_get_items', () => {
        // Später: Sende Liste der verfügbaren Items vom Server
        socket.emit('shop_items_list', []);
    });

    socket.on('shop_buy', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        console.log(`[Shop] Kaufanfrage von ${user.name} für Item: ${data.abilityId}`);
        
        // TODO: 
        // 1. Item-Existenz prüfen
        // 2. Kora-Guthaben prüfen
        // 3. Kora abziehen
        // 4. Item dem User-Profil hinzufügen
        // 5. Erfolg/Fehler zurücksenden
        
        socket.emit('shop_buy_result', {
            success: false,
            message: 'Shop-Kauffunktion ist noch nicht implementiert.'
        });
    });
}

module.exports = { registerShopHandlers };

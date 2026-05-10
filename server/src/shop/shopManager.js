const { connectedUsers } = require('../utils/store');

const ABILITIES = {
    roadblock: { id: 'roadblock', priceKora: 10, type: 'ability' }
};

const FRAMES = {
    'none': { id: 'none', priceKora: 0, type: 'frame', cssClass: 'frame-none' },
    'neon_blue': { id: 'neon_blue', priceKora: 50, type: 'frame', cssClass: 'frame-neon-blue' },
    'red_pulse': { id: 'red_pulse', priceKora: 75, type: 'frame', cssClass: 'frame-red-pulse' },
    'gold_glaze': { id: 'gold_glaze', priceKora: 150, type: 'frame', cssClass: 'frame-gold-glaze' },
    'toxic_vibe': { id: 'toxic_vibe', priceKora: 100, type: 'frame', cssClass: 'frame-toxic-vibe' }
};

/**
 * Registriert Socket-Handler für den Shop.
 */
function registerShopHandlers(io, socket) {
    socket.on('shop_get_data', () => {
        socket.emit('shop_data', {
            abilities: Object.values(ABILITIES).map(a => ({ ...a, nameKey: `shop_item_${a.id}_name` })),
            frames: Object.values(FRAMES).map(f => ({ ...f, nameKey: `shop_item_${f.id}_name` }))
        });
    });

    socket.on('shop_buy', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const { itemId, category } = data;
        const catalog = category === 'frames' ? FRAMES : ABILITIES;
        const item = catalog[itemId];
        
        if (!item) {
            return socket.emit('shop_error', 'Item nicht gefunden.');
        }

        if (category === 'frames' && user.ownedFrames.includes(itemId)) {
            return socket.emit('shop_error', 'Bereits im Besitz.');
        }

        if (user.koraBalance < (item.priceKora || item.price)) {
            return socket.emit('shop_error', 'Nicht genug Kora.');
        }

        user.koraBalance -= (item.priceKora || item.price);
        
        if (category === 'frames') {
            if (!user.ownedFrames) user.ownedFrames = ['none'];
            user.ownedFrames.push(itemId);
        } else {
            if (!user.abilities) user.abilities = {};
            user.abilities[itemId] = (user.abilities[itemId] || 0) + 1;
        }

        console.log(`[Shop] ${user.name} kaufte ${itemId}. Kora-Rest: ${user.koraBalance}`);

        socket.emit('kora_update', { balance: user.koraBalance, earned: 0 });
        socket.emit('shop_success', `Kauf von ${itemId} erfolgreich!`);
        
        // Push full player data update to sync everything
        socket.emit('player_data_updated', user);
    });

    socket.on('profile_set_frame', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const frameId = typeof data === 'string' ? data : data.frameId;

        if ((user.ownedFrames && user.ownedFrames.includes(frameId)) || frameId === 'none' || frameId === 'default') {
            user.currentFrame = frameId;
            socket.emit('profile_updated', user);
            socket.emit('player_data_updated', user);
            console.log(`[Profile] ${user.name} ausgerüsteter Rahmen: ${frameId}`);
        }
    });
}

module.exports = { registerShopHandlers };

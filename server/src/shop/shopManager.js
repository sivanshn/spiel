const { connectedUsers } = require('../utils/store');
const { sendOwnedPremiumAssets } = require('../utils/assetHelper');

const ABILITIES = {
    roadblock: { id: 'roadblock', priceKora: 10, type: 'ability', icon: '🚧' }
};

const FRAMES = {
    'none': { id: 'none', priceKora: 0, type: 'frame', cssClass: 'frame-none' },
    'neon_blue': { id: 'neon_blue', priceKora: 50, type: 'frame', cssClass: 'frame-neon-blue' },
    'red_pulse': { id: 'red_pulse', priceKora: 75, type: 'frame', cssClass: 'frame-red-pulse' },
    'gold_glaze': { id: 'gold_glaze', priceKora: 150, type: 'frame', cssClass: 'frame-gold-glaze' },
    'toxic_vibe': { id: 'toxic_vibe', priceKora: 100, type: 'frame', cssClass: 'frame-toxic-vibe' }
};

const AVATARS = {
    'trader_cat': { id: 'trader_cat', priceKora: 50, type: 'avatar' },
    'manager_cat': { id: 'manager_cat', priceKora: 100, type: 'avatar' }
};

/**
 * Registriert Socket-Handler für den Shop.
 */
function registerShopHandlers(io, socket) {
    socket.on('shop_get_data', () => {
        socket.emit('shop_data', {
            abilities: Object.values(ABILITIES).map(a => ({ ...a, nameKey: `shop_item_${a.id}_name` })),
            frames: Object.values(FRAMES).map(f => ({ ...f, nameKey: `shop_item_${f.id}_name` })),
            avatars: Object.values(AVATARS).map(v => ({ ...v, nameKey: `shop_item_${v.id}_name` }))
        });
    });

    socket.on('shop_buy', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const { itemId, category } = data;
        let catalog;
        if (category === 'frames') catalog = FRAMES;
        else if (category === 'avatars') catalog = AVATARS;
        else catalog = ABILITIES;
        
        const item = catalog[itemId];
        
        if (!item) {
            return socket.emit('shop_error', 'Item nicht gefunden.');
        }

        if (category === 'frames' && user.ownedFrames && user.ownedFrames.includes(itemId)) {
            return socket.emit('shop_error', 'Bereits im Besitz.');
        }

        if (category === 'avatars' && user.ownedAvatars && user.ownedAvatars.includes(itemId)) {
            return socket.emit('shop_error', 'Bereits im Besitz.');
        }

        if (user.koraBalance < (item.priceKora || item.price)) {
            return socket.emit('shop_error', 'Nicht genug Kora.');
        }

        user.koraBalance -= (item.priceKora || item.price);
        
        if (category === 'frames') {
            if (!user.ownedFrames) user.ownedFrames = ['none'];
            user.ownedFrames.push(itemId);
        } else if (category === 'avatars') {
            if (!user.ownedAvatars) user.ownedAvatars = ['default_avatar'];
            user.ownedAvatars.push(itemId);
        } else {
            if (!user.abilities) user.abilities = {};
            user.abilities[itemId] = (user.abilities[itemId] || 0) + 1;
        }

        console.log(`[Shop] ${user.name} kaufte ${itemId}. Kora-Rest: ${user.koraBalance}`);

        socket.emit('kora_update', { balance: user.koraBalance, earned: 0 });
        socket.emit('shop_success', `Kauf von ${itemId} erfolgreich!`);
        
        // Push full player data update to sync everything
        socket.emit('player_data_updated', user);

        // Deliver premium assets if applicable
        sendOwnedPremiumAssets(socket, user);
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

    socket.on('profile_set_avatar', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const avatarId = typeof data === 'string' ? data : data.avatarId;

        if (user.ownedAvatars && user.ownedAvatars.includes(avatarId)) {
            user.avatar = avatarId;
            socket.emit('profile_updated', user);
            socket.emit('player_data_updated', user);
            console.log(`[Profile] ${user.name} gewechseltes Icon: ${avatarId}`);
        }
    });
}

module.exports = { registerShopHandlers };

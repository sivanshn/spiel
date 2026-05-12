const fs = require('fs');
const path = require('path');

const ASSETS_PATH = path.join(__dirname, '../../assets');

/**
 * Lädt ein Asset und gibt es als Base64-String zurück.
 */
function getAssetAsBase64(filename) {
    try {
        const filePath = path.join(ASSETS_PATH, filename);
        if (!fs.existsSync(filePath)) return null;
        
        const fileBuffer = fs.readFileSync(filePath);
        const extension = path.extname(filename).substring(1);
        return `data:image/${extension};base64,${fileBuffer.toString('base64')}`;
    } catch (err) {
        console.error(`Fehler beim Laden von Asset ${filename}:`, err);
        return null;
    }
}

/**
 * Sendet alle Premium-Assets, die der Spieler besitzt.
 */
function sendOwnedPremiumAssets(socket, user) {
    if (!user) return;
    
    const premiumAssets = {};
    
    // Check for trader_cat
    if (user.ownedAvatars && user.ownedAvatars.includes('trader_cat')) {
        const data = getAssetAsBase64('trader_cat.png');
        if (data) premiumAssets['trader_cat'] = data;
    }
    
    // Check for manager_cat
    if (user.ownedAvatars && user.ownedAvatars.includes('manager_cat')) {
        const data = getAssetAsBase64('manager_cat.png');
        if (data) premiumAssets['manager_cat'] = data;
    }
    
    // Falls es Assets gibt, senden
    if (Object.keys(premiumAssets).length > 0) {
        socket.emit('premium_assets_delivery', premiumAssets);
    }
}

module.exports = { getAssetAsBase64, sendOwnedPremiumAssets };

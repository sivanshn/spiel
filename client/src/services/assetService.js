import { socket } from './socket.js';
import { assetStore } from '../utils/assetStore.js';

/**
 * Initialisiert die Asset-Delivery-Handler.
 */
export function initAssetService() {
    socket.on('premium_assets_delivery', (assets) => {
        console.log('[AssetService] Received premium assets from server');
        assetStore.setAssets(assets);
    });
}

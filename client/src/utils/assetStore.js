/**
 * Zentrale Speicherung von Premium-Assets (z.B. Base64-Strings), 
 * die vom Server erst nach Kauf/Besitz geliefert werden.
 */
class AssetStore {
    constructor() {
        this.assets = {};
    }

    setAssets(newAssets) {
        this.assets = { ...this.assets, ...newAssets };
        console.log('[AssetStore] Premium assets updated:', Object.keys(this.assets));
    }

    getAsset(assetId) {
        return this.assets[assetId] || null;
    }
}

export const assetStore = new AssetStore();

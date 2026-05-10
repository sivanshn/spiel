/**
 * shopService.js
 * Verwaltet Shop-Daten und Kauflogik.
 * Version 0.1 – leer, Struktur vorbereitet.
 */

/**
 * Datenstruktur einer Fähigkeit (Ability):
 * {
 *   abilityId:    string   – eindeutige ID
 *   name:         string   – Anzeigename
 *   description:  string   – Beschreibung
 *   priceKora:    number   – Preis in Kora
 *   icon:         string   – Emoji oder URL
 *   owned:        boolean  – vom Spieler bereits gekauft
 *   usableInGame: boolean  – kann im Spiel eingesetzt werden
 * }
 */

/** Alle verfügbaren Shop-Artikel (aktuell leer). */
export const shopItems = [];

/**
 * Gibt alle Shop-Artikel zurück.
 * Später: vom Server laden oder aus einer Datenbank.
 * @returns {Array} Liste aller Fähigkeiten
 */
export function getShopItems() {
    return shopItems;
}

/**
 * Prüft ob ein Kauf möglich ist.
 * Gibt true zurück wenn der Spieler genug Kora hat.
 * @param {Object} item     - Das zu kaufende Item
 * @param {number} balance  - Aktuelle Kora des Spielers
 * @returns {boolean}
 */
export function canAfford(item, balance) {
    return balance >= item.priceKora;
}

/**
 * Kauft eine Fähigkeit (Platzhalter – noch nicht implementiert).
 * Wird später mit dem Server verbunden.
 * @param {string} abilityId
 */
export function purchaseAbility(abilityId) {
    // TODO: socket.emit('shop_buy', { abilityId }) + Server-Validierung
    console.warn('[ShopService] Kaufen noch nicht implementiert:', abilityId);
}

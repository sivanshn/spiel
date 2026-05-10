/**
 * shopService.js
 * Verwaltet Shop-Daten und Kauflogik.
 * Beinhaltet die Straßensperre als erste Fähigkeit.
 */

import { state } from '../app/state.js';
import { translations } from '../i18n/translations.js';

/** Alle verfügbaren Shop-Artikel. */
export function getShopItems() {
    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];

    return [
        {
            id: 'roadblock',
            name: t.ability_roadblock_name,
            short: t.ability_roadblock_short,
            description: t.ability_roadblock_desc,
            goal: t.ability_roadblock_goal,
            abilities: t.ability_roadblock_abilities,
            priceKora: 10,
            icon: '🚧'
        }
    ];
}

/**
 * Prüft ob ein Kauf möglich ist.
 */
export function canAfford(item, balance) {
    return balance >= item.priceKora;
}

/**
 * Sendet Kaufanfrage an den Server.
 */
export function purchaseAbility(abilityId, socket) {
    if (!socket) return;
    socket.emit('shop_buy', { abilityId });
}

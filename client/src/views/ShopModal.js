/**
 * ShopModal.js
 * Verwaltet das Shop-Modal in der Main View.
 * Version 0.1 – leer, Struktur vorbereitet für spätere Fähigkeiten.
 */

import { getEl } from '../utils/ui.js';
import { getShopItems } from '../services/shopService.js';

/**
 * Initialisiert das Shop-Modal:
 * - Öffnen / Schließen
 * - Kora-Anzeige synchronisieren
 * - Items rendern (aktuell leer)
 */
export function initShopModal() {
    const shopBtn   = getEl('shop-btn');
    const modalShop = getEl('modal-shop');
    const shopClose = getEl('shop-close');

    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            syncShopKora();
            renderShopItems();
            modalShop.classList.remove('hidden');
        });
    }

    if (shopClose) {
        shopClose.addEventListener('click', () => {
            modalShop.classList.add('hidden');
        });
    }

    // Schließen bei Klick auf den Hintergrund (außerhalb des Panels)
    if (modalShop) {
        modalShop.addEventListener('click', (e) => {
            if (e.target === modalShop) {
                modalShop.classList.add('hidden');
            }
        });
    }
}

/**
 * Synchronisiert die Kora-Anzeige im Shop mit dem Wert aus der Main View.
 */
function syncShopKora() {
    const mainKora = getEl('kora-value-main');
    const shopKora = getEl('shop-kora-display');
    if (mainKora && shopKora) {
        shopKora.textContent = mainKora.textContent;
    }
}

/**
 * Rendert die Shop-Items ins Grid.
 * Aktuell leer → zeigt den Empty-State an.
 * Später: items aus shopItems-Array rendern.
 */
function renderShopItems() {
    const grid       = getEl('shop-items-grid');
    const emptyState = getEl('shop-empty-state');
    const items      = getShopItems();

    if (!grid) return;

    grid.innerHTML = '';

    if (items.length === 0) {
        // Empty State sichtbar lassen
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    // Empty State verstecken wenn Items vorhanden
    if (emptyState) emptyState.style.display = 'none';

    // Später: Items rendern
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-info">
                <span class="shop-item-name">${item.name}</span>
                <span class="shop-item-desc">${item.description}</span>
            </div>
            <div class="shop-item-price">
                <span class="kora-icon">💎</span>
                <span>${item.priceKora}</span>
            </div>
            <button class="shop-buy-btn action-btn" ${item.owned ? 'disabled' : ''}>
                ${item.owned ? '✓ Gekauft' : 'Kaufen'}
            </button>
        `;
        grid.appendChild(card);
    });
}

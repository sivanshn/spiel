/**
 * ShopModal.js
 * Verwaltet das Shop-Modal in der Main View.
 * Ermöglicht Kauf von Fähigkeiten und Anzeige von Details.
 */

import { getEl, showPopup } from '../utils/ui.js';
import { getShopItems, purchaseAbility, canAfford } from '../services/shopService.js';
import { socket } from '../services/socket.js';
import { state } from '../app/state.js';
import { translations } from '../i18n/translations.js';

export function initShopModal() {
    const shopBtn   = getEl('shop-btn');
    const modalShop = getEl('modal-shop');
    const shopClose = getEl('shop-close');

    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            renderShopOverview();
            modalShop.classList.remove('hidden');
        });
    }

    if (shopClose) {
        shopClose.addEventListener('click', () => {
            modalShop.classList.add('hidden');
        });
    }

    if (modalShop) {
        modalShop.addEventListener('click', (e) => {
            if (e.target === modalShop) {
                modalShop.classList.add('hidden');
            }
        });
    }

    // Listener für Kauf-Resultat
    socket.on('shop_buy_result', (data) => {
        const lang = state.currentLanguage || 'de';
        
        if (data.success) {
            // Inventar im State aktualisieren
            if (state.myUserData) {
                if (!state.myUserData.abilities) state.myUserData.abilities = {};
                state.myUserData.abilities[data.abilityId] = data.newCount;
            }
            renderShopOverview(); // Buttons aktualisieren
        } else {
            showPopup(lang === 'de' ? 'KAUF FEHLGESCHLAGEN' : 'PURCHASE FAILED', data.message);
        }
    });
}

function renderShopOverview() {
    const grid = getEl('shop-items-grid');
    const emptyState = getEl('shop-empty-state');
    const shopClose = getEl('shop-close');
    const items = getShopItems();
    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];

    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'shop-grid-overview';

    if (shopClose) shopClose.classList.remove('hidden');

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    items.forEach(item => {
        const balance = state.myUserData?.koraBalance || 0;
        const affordable = canAfford(item, balance);
        
        const card = document.createElement('div');
        card.className = 'shop-item-tile';
        
        card.innerHTML = `
            <div class="shop-tile-icon">${item.icon}</div>
            <div class="shop-tile-name">${item.name}</div>
            <div class="shop-tile-price">5 Kora</div>
            <button class="action-btn buy-btn ${!affordable ? 'disabled' : ''}" 
                    ${!affordable ? 'disabled' : ''}>
                ${affordable ? t.shop_buy : t.shop_not_enough_kora}
            </button>
        `;

        // Klick auf die Kachel (nicht den Button) zeigt Details
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('buy-btn')) {
                purchaseAbility(item.id, socket);
            } else {
                renderItemDetail(item);
            }
        });

        grid.appendChild(card);
    });
}

function renderItemDetail(item) {
    const grid = getEl('shop-items-grid');
    const shopClose = getEl('shop-close');
    const lang = state.currentLanguage || 'de';
    if (!grid) return;

    if (shopClose) shopClose.classList.add('hidden');

    grid.className = 'shop-detail-view';
    grid.innerHTML = `
        <div class="detail-scroll-area">
            <div class="detail-title-row">
                <span class="detail-main-icon">${item.icon}</span>
                <h2>${item.name}</h2>
            </div>
            
            <div class="detail-content animate-in">
                <p class="detail-short">${item.short}</p>
                
                <div class="detail-section">
                    <h3>${lang === 'de' ? 'BESCHREIBUNG' : 'DESCRIPTION'}</h3>
                    <p>${item.description}</p>
                </div>
                
                <div class="detail-section">
                    <h3>${lang === 'de' ? 'ZIEL / EFFEKT' : 'GOAL / EFFECT'}</h3>
                    <p>${item.goal}</p>
                </div>
                
                <div class="detail-section">
                    <h3>${lang === 'de' ? 'DETAILS' : 'DETAILS'}</h3>
                    <ul class="detail-abilities">
                        ${item.abilities.split(';').map(a => `<li>${a.trim()}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
        <button class="action-btn back-btn-footer">${lang === 'de' ? 'ZURÜCK' : 'BACK'}</button>
    `;

    grid.querySelector('.back-btn-footer').addEventListener('click', () => {
        renderShopOverview();
    });
}

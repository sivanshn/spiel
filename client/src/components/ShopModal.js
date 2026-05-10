import { getTranslation } from '../i18n/translations.js';
import { closeAllModals } from '../utils/ui.js';

export class ShopModal {
    constructor(socket) {
        this.socket = socket;
        this.modal = document.getElementById('modal-shop');
        this.itemsGrid = document.getElementById('shop-items-grid');
        this.tabs = document.querySelectorAll('.shop-tab-btn');
        this.currentTab = 'abilities';
        this.shopData = null;

        this.init();
    }

    init() {
        // Tab switching
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.render();
            });
        });

        // Socket listeners
        this.socket.on('shop_data', (data) => {
            this.shopData = data;
            if (!this.modal.classList.contains('hidden')) {
                this.render();
            }
        });

        this.socket.on('shop_success', (msg) => {
            // Optional: Show a toast notification
            console.log('Purchase success:', msg);
        });

        this.socket.on('shop_error', (err) => {
            alert(err);
        });
    }

    open() {
        closeAllModals();
        this.modal.classList.remove('hidden');
        this.socket.emit('shop_get_data');
    }

    close() {
        this.modal.classList.add('hidden');
    }

    render() {
        if (!this.shopData) return;

        this.itemsGrid.innerHTML = '';
        const items = this.shopData[this.currentTab] || [];

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            
            const preview = document.createElement('div');
            preview.className = 'item-preview';
            
            if (this.currentTab === 'frames') {
                preview.innerHTML = `<div class="frame-preview ${item.id}"></div>`;
            } else {
                preview.textContent = item.icon || '✨';
            }

            const name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = getTranslation(item.nameKey) || item.id;

            const price = document.createElement('div');
            price.className = 'item-price';
            price.innerHTML = `<span class="kora-icon">💎</span> ${item.priceKora !== undefined ? item.priceKora : item.price}`;

            const buyBtn = document.createElement('button');
            buyBtn.className = 'action-btn primary';
            buyBtn.textContent = getTranslation('shop_buy');
            buyBtn.onclick = () => this.buyItem(item.id);

            card.appendChild(preview);
            card.appendChild(name);
            card.appendChild(price);
            card.appendChild(buyBtn);
            this.itemsGrid.appendChild(card);
        });
    }

    buyItem(itemId) {
        this.socket.emit('shop_buy', { category: this.currentTab, itemId });
    }
}

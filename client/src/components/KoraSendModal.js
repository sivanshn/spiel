import { getEl, showPopup } from '../utils/ui.js';
import { state } from '../app/state.js';

export class KoraSendModal {
    constructor(socket) {
        this.socket = socket;
        this.modal = getEl('modal-kora-send');
        this.targetPlayer = null;
        this.init();
    }

    init() {
        if (!this.modal) return;

        const cancelBtn = getEl('ks-cancel-btn');
        const sendBtn = getEl('ks-send-btn');
        const amountInput = getEl('ks-amount');
        const quickBtns = document.querySelectorAll('.ks-quick-btn');

        if (cancelBtn) cancelBtn.onclick = () => this.close();

        if (sendBtn) {
            sendBtn.onclick = () => {
                const amount = parseInt(amountInput.value);
                if (isNaN(amount) || amount <= 0) {
                    showPopup("FEHLER", "Bitte einen gültigen Betrag eingeben.");
                    return;
                }
                
                const myKora = state.myUserData ? state.myUserData.koraBalance : 0;
                if (amount > myKora) {
                    showPopup("FEHLER", "Du hast nicht genug Kora!");
                    return;
                }

                this.socket.emit('send_kora', {
                    targetId: this.targetPlayer.id,
                    targetName: this.targetPlayer.name,
                    amount: amount
                });
                this.close();
            };
        }

        if (quickBtns) {
            quickBtns.forEach(btn => {
                btn.onclick = () => {
                    const val = btn.getAttribute('data-amount');
                    if (val === 'all') {
                        amountInput.value = state.myUserData ? state.myUserData.koraBalance : 0;
                    } else {
                        amountInput.value = val;
                    }
                };
            });
        }
    }

    open(player) {
        this.targetPlayer = player;
        const targetNameEl = getEl('ks-target-name');
        const ownKoraEl = getEl('ks-own-kora');
        const amountInput = getEl('ks-amount');

        if (targetNameEl) targetNameEl.textContent = player.name;
        if (ownKoraEl) ownKoraEl.textContent = state.myUserData ? state.myUserData.koraBalance : 0;
        if (amountInput) amountInput.value = '';

        this.modal.classList.remove('hidden');
        this.modal.style.zIndex = '3100'; // Above profile
    }

    close() {
        if (this.modal) this.modal.classList.add('hidden');
    }
}

/**
 * RolesModal.js
 * Verwaltet das Rollen-Info-Modal in der Main View.
 * Ermöglicht Wechsel zwischen Kachel-Übersicht und Detailansicht.
 */

import { getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { translations } from '../i18n/translations.js';

export function initRolesModal() {
    const rolesBtn   = getEl('roles-btn');
    const modalRoles = getEl('modal-roles');
    const rolesClose = getEl('roles-close');

    if (rolesBtn) {
        rolesBtn.addEventListener('click', () => {
            renderRolesOverview();
            modalRoles.classList.remove('hidden');
        });
    }

    if (rolesClose) {
        rolesClose.addEventListener('click', () => {
            modalRoles.classList.add('hidden');
        });
    }

    if (modalRoles) {
        modalRoles.addEventListener('click', (e) => {
            if (e.target === modalRoles) {
                modalRoles.classList.add('hidden');
            }
        });
    }
}

function getRoleData() {
    const lang = state.currentLanguage || 'de';
    const t = translations[lang] || translations['de'];
    return [
        { id: 'thief', icon: '👤', name: t.role_thief_name, short: t.role_thief_short, goal: t.role_thief_goal, abilities: t.role_thief_abilities },
        { id: 'police', icon: '🛡️', name: t.role_police_name, short: t.role_police_short, goal: t.role_police_goal, abilities: t.role_police_abilities },
        { id: 'corrupt_police', icon: '🕵️', name: t.role_corrupt_name, short: t.role_corrupt_short, goal: t.role_corrupt_goal, abilities: t.role_corrupt_abilities },
        { id: 'special_agent', icon: '🔍', name: t.role_agent_name, short: t.role_agent_short, goal: t.role_agent_goal, abilities: t.role_agent_abilities }
    ];
}

function renderRolesOverview() {
    const list = getEl('roles-list');
    const rolesClose = getEl('roles-close');
    if (!list) return;

    if (rolesClose) rolesClose.classList.remove('hidden');

    const data = getRoleData();
    list.innerHTML = '';
    list.className = 'roles-grid'; // Sicherstellen, dass das Grid aktiv ist

    data.forEach(role => {
        const card = document.createElement('div');
        card.className = 'role-tile';
        card.setAttribute('data-role', role.id);
        
        card.innerHTML = `
            <div class="role-tile-icon">${role.icon}</div>
            <div class="role-tile-name">${role.name}</div>
        `;

        card.addEventListener('click', () => {
            renderRoleDetail(role.id);
        });

        list.appendChild(card);
    });
}

function renderRoleDetail(roleId) {
    const list = getEl('roles-list');
    const rolesClose = getEl('roles-close');
    if (!list) return;

    if (rolesClose) rolesClose.classList.add('hidden');

    const lang = state.currentLanguage || 'de';
    const data = getRoleData().find(r => r.id === roleId);
    if (!data) return;

    list.className = 'role-detail-view'; // Layout-Wechsel
    list.innerHTML = `
        <div class="detail-scroll-area">
            <div class="detail-title-row">
                <span class="detail-main-icon">${data.icon}</span>
                <h2>${data.name}</h2>
            </div>
            
            <div class="detail-content animate-in">
                <p class="detail-short">${data.short}</p>
                
                <div class="detail-section">
                    <h3>${lang === 'de' ? 'ZIEL' : 'GOAL'}</h3>
                    <p>${data.goal}</p>
                </div>
                
                <div class="detail-section">
                    <h3>${lang === 'de' ? 'FÄHIGKEITEN' : 'ABILITIES'}</h3>
                    <ul class="detail-abilities">
                        ${data.abilities.split(';').map(a => `<li>${a.trim()}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
        <button class="action-btn back-btn-footer">${lang === 'de' ? 'ZURÜCK' : 'BACK'}</button>
    `;

    list.querySelector('.back-btn-footer').addEventListener('click', () => {
        renderRolesOverview();
    });
}

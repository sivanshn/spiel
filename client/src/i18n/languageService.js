import { translations } from './translations.js';
import { state } from '../app/state.js';

export function updateLanguage(lobbyListContainer) {
    const texts = translations[state.currentLanguage];
    if (!texts) return;

    // Standard data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.textContent = texts[key];
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) el.placeholder = texts[key];
    });

    // Dynamic UI updates if needed (e.g. Empty Msg)
    if (!state.currentLobby && lobbyListContainer && lobbyListContainer.querySelector('.empty-msg')) {
        lobbyListContainer.querySelector('.empty-msg').textContent = texts.main_empty_lobbies;
    }
}

export function setLanguage(lang, lobbyListContainer) {
    state.currentLanguage = lang;
    localStorage.setItem('game_lang', lang);
    
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    
    updateLanguage(lobbyListContainer);
}

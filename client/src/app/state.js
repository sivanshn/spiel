export const state = {
    myId: null,
    myUserData: null,
    selectedStationId: null,
    currentLobby: null,
    lastState: null,
    currentLanguage: localStorage.getItem('game_lang') || 'de'
};

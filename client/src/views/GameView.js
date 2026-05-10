import { socket } from '../services/socket.js';
import { showScreen, showPopup, getEl } from '../utils/ui.js';
import { state } from '../app/state.js';
import { renderLobbyPlayers } from './LobbyWaitingPanel.js';
import { getRoleColor, getRoleIcon, translateRole, translatePhase, getDistance } from '../utils/gameUtils.js';
import { toggleMute, getMuteState, isVoiceReady, initVoiceChat } from '../services/voiceService.js';
import { translations } from '../i18n/translations.js';

export function initGameView() {
    const btnEndTurn = getEl('btn-end-turn');
    const btnMove = getEl('btn-move');
    const btnInvestigate = getEl('btn-investigate');
    const btnArrest = getEl('btn-arrest');
    const btnAbilities = getEl('btn-abilities-toggle');

    if (btnEndTurn) {
        btnEndTurn.addEventListener('click', () => {
            socket.emit('end_turn');
        });
    }

    if (btnMove) {
        btnMove.addEventListener('click', () => {
            if (state.selectedStationId) {
                socket.emit('move_to', state.selectedStationId);
                state.selectedStationId = null;
            }
        });
    }

    if (btnInvestigate) {
        btnInvestigate.addEventListener('click', () => {
            socket.emit('investigate');
        });
    }

    if (btnArrest) {
        btnArrest.addEventListener('click', () => {
            socket.emit('arrest');
        });
    }

    if (btnAbilities) {
        btnAbilities.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = getEl('abilities-dropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', () => {
        const dropdown = getEl('abilities-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    });

    socket.on('investigation_result', (data) => {
        showPopup("HINWEIS", data.result);
    });

    socket.on('ability_success', (data) => {
        showPopup("ERFOLG", data.message);
        state.selectedStationId = null;
        if (state.lastState) updateUI(state.lastState);
    });

    socket.on('game_started', () => {
        showScreen('game');
        if (state.lastState) {
            updateUI(state.lastState);
        }
    });

    socket.on('state_update', (gameState) => {
        state.lastState = gameState;
        if (gameState.phase === 'end') {
            showScreen('result');
            const title = getEl('result-title');
            const msg = getEl('result-msg');
            if (gameState.winner === 'police') {
                title.textContent = "POLIZEI GEWINNT!";
                title.style.color = "#3b82f6";
                msg.textContent = "Der Dieb wurde erfolgreich festgenommen.";
            } else if (gameState.winner === 'thief_team') {
                title.textContent = "DIEB GEWINNT!";
                title.style.color = "#f43f5e";
                msg.textContent = "Der Dieb hat alle Diamanten gesammelt. Dieb und korrupter Polizist gewinnen!";
            } else {
                title.textContent = "DIEB GEWINNT!";
                title.style.color = "#f43f5e";
                msg.textContent = "Der Dieb ist allen entkommen.";
            }
        }
        updateUI(gameState);
    });

    socket.on('game_ended', (data) => {
        setTimeout(() => {
            const rewardBadge = getEl('result-reward');
            if (rewardBadge) rewardBadge.classList.add('hidden');
            
            showScreen('main');
            const lobbyListPanel = getEl('lobby-list-panel');
            const lobbyWaitingPanel = getEl('lobby-waiting-panel');
            
            if (lobbyListPanel && lobbyWaitingPanel) {
                lobbyListPanel.classList.add('hidden');
                lobbyWaitingPanel.classList.remove('hidden');
            }
            
            if (state.currentLobby) {
                renderLobbyPlayers(state.currentLobby);
            }
        }, 5000);
    });
}

function updateUI(gameState) {
    const screensGame = getEl('screen-game');
    if (!screensGame || (!screensGame.classList.contains('active') && gameState.phase !== 'end')) return;

    const myPlayer = gameState.players[state.myId];
    const isMyTurn = gameState.activePlayerId === state.myId;

    const diamondCounter = getEl('diamond-counter');
    const playerListPanel = getEl('game-player-list');
    const gamePhaseTxt = getEl('game-phase');
    const actionBar = getEl('action-bar');
    const btnMove = getEl('btn-move');
    const btnInvestigate = getEl('btn-investigate');
    const btnArrest = getEl('btn-arrest');
    const abilitiesDropdown = getEl('abilities-dropdown');

    if (diamondCounter) {
        diamondCounter.textContent = `${gameState.collectedCount} / ${gameState.requiredDiamonds}`;
    }

    if (playerListPanel) {
        const lang = state.currentLanguage || 'de';
        const trans = (translations[lang] || translations['de']);
        playerListPanel.innerHTML = `<div class="player-list-header">${trans.game_player_list_title}</div>`;
        const youSuffix = lang === 'de' ? ' (Du)' : ' (You)';

        Object.values(gameState.players).forEach(p => {
            const item = document.createElement('div');
            item.className = 'player-list-entry';
            const isMe = p.id === state.myId;
            const roleName = translateRole(p.role, lang);
            const isMicOn = p.micEnabled !== false;
            const micIcon = isMicOn ? '🎤' : '🔇';
            const micClass = isMicOn ? 'mic-on' : 'mic-off';
            const micTitle = isMicOn ? (lang === 'de' ? 'Mikrofon an' : 'Microphone on') : (lang === 'de' ? 'Mikrofon aus' : 'Microphone off');

            item.innerHTML = `
                <span class="player-list-name">${p.name}${isMe ? youSuffix : ''}</span>
                <span class="player-list-separator"> — </span>
                <span class="player-list-role" style="color: ${getRoleColor(p.role)}">${roleName}</span>
                <span class="mic-status ${micClass} ${isMe ? 'clickable' : ''}" title="${micTitle}">${micIcon}</span>
            `;

            if (isMe) {
                const micEl = item.querySelector('.mic-status');
                micEl.onclick = async () => {
                    if (!isVoiceReady()) await initVoiceChat();
                    const currentlyMuted = toggleMute();
                    const lobbyId = state.currentLobby ? state.currentLobby.id : null;
                    if (lobbyId) {
                        socket.emit('voice_mute_toggle', { lobbyId, isMuted: currentlyMuted });
                    }
                };
            }
            playerListPanel.appendChild(item);
        });
    }

    if (abilitiesDropdown) {
        const lang = state.currentLanguage || 'de';
        const t = translations[lang] || translations['de'];
        const myUser = state.myUserData;
        
        abilitiesDropdown.innerHTML = '';
        const abilities = (myUser && myUser.abilities) ? Object.entries(myUser.abilities).filter(([id, count]) => count > 0) : [];

        if (abilities.length === 0) {
            abilitiesDropdown.innerHTML = `<div class="ability-entry empty">${t.game_no_abilities}</div>`;
        } else {
            abilities.forEach(([id, count]) => {
                const entry = document.createElement('div');
                entry.className = `ability-entry`;
                const name = t[`ability_${id}_name`] || id;
                entry.innerHTML = `<span class="ability-icon">${id === 'roadblock' ? '🚧' : '✨'}</span> ${name} x${count}`;
                
                entry.onclick = (e) => {
                    e.stopPropagation();
                    if (!isMyTurn) return;
                    if (state.selectedStationId) {
                        socket.emit('use_ability', { abilityId: id, targetId: state.selectedStationId });
                        abilitiesDropdown.classList.add('hidden');
                        updateUI(gameState);
                    } else {
                        showPopup(lang === 'de' ? 'HINWEIS' : 'NOTE', lang === 'de' ? 'Bitte wähle zuerst eine Station auf der Map aus.' : 'Please select a station on the map first.');
                    }
                };
                abilitiesDropdown.appendChild(entry);
            });
        }
    }

    const abilitiesContainer = document.querySelector('.abilities-container');

    if (actionBar && isMyTurn && gameState.phase !== 'waiting' && gameState.phase !== 'end') {
        actionBar.classList.remove('hidden');
        if (abilitiesContainer) abilitiesContainer.classList.remove('hidden');

        if (btnMove) {
            btnMove.classList.remove('hidden');
            btnMove.textContent = `MOVE (${myPlayer.ap_move} ÜBRIG)`;
            let isValidMove = false;
            if (state.selectedStationId && myPlayer && myPlayer.ap_move > 0 && gameState.map) {
                const dist = getDistance(gameState.map, myPlayer.position, state.selectedStationId);
                if (dist === 1) isValidMove = true;
            }
            btnMove.disabled = !isValidMove;
        }

        if (myPlayer && myPlayer.role !== 'thief') {
            if (btnInvestigate) {
                btnInvestigate.classList.remove('hidden');
                btnInvestigate.textContent = `UNTERSUCHEN (${myPlayer.ap_investigate} ÜBRIG)`;
                btnInvestigate.disabled = (myPlayer.ap_investigate < 1);
            }
            if (btnArrest) {
                btnArrest.classList.remove('hidden');
                btnArrest.textContent = `FESTNAHME (${myPlayer.ap_investigate} ÜBRIG)`;
                btnArrest.disabled = (myPlayer.ap_investigate < 1);
            }
        } else {
            if (btnInvestigate) btnInvestigate.classList.add('hidden');
            if (btnArrest) btnArrest.classList.add('hidden');
        }
    } else if (actionBar) {
        actionBar.classList.add('hidden');
        if (abilitiesContainer) abilitiesContainer.classList.add('hidden');
    }

    if (gamePhaseTxt) {
        let phaseText = "";
        if (isMyTurn) phaseText = "DEIN ZUG!";
        else {
            const activePlayer = gameState.players[gameState.activePlayerId];
            phaseText = activePlayer ? `${activePlayer.name.toUpperCase()} IST DRAN` : translatePhase(gameState.phase).toUpperCase();
        }
        if (gameState.timeLeft !== undefined && gameState.phase !== 'waiting' && gameState.phase !== 'end') {
            gamePhaseTxt.textContent = `${phaseText} — ${gameState.timeLeft}s`;
            if (gameState.timeLeft <= 5) gamePhaseTxt.classList.add('warning');
            else gamePhaseTxt.classList.remove('warning');
        } else {
            gamePhaseTxt.textContent = phaseText;
            gamePhaseTxt.classList.remove('warning');
        }
    }

    renderMap(gameState, myPlayer, isMyTurn);
}

function renderMap(gameState, me, isMyTurn) {
    const gameMap = getEl('game-map');
    const { map, players, roadblocks } = gameState;
    if (!map || !gameMap) return;
    gameMap.innerHTML = '';

    // Connections
    map.connections.forEach(conn => {
        const s1 = map.stations[conn[0]];
        const s2 = map.stations[conn[1]];
        if (s1 && s2) {
            const isBlocked = roadblocks && roadblocks.some(rb => 
                (rb.stationAId === conn[0] && rb.stationBId === conn[1]) ||
                (rb.stationAId === conn[1] && rb.stationBId === conn[0])
            );
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", s1.x); line.setAttribute("y1", s1.y);
            line.setAttribute("x2", s2.x); line.setAttribute("y2", s2.y);
            line.setAttribute("class", isBlocked ? "connection blocked" : "connection");
            gameMap.appendChild(line);
        }
    });

    // Diamonds (Only visible to Thief team)
    const isThiefTeam = me && (me.role === 'thief' || me.role === 'corrupt_police');
    if (gameState.diamonds && isThiefTeam) {
        gameState.diamonds.forEach(d => {
            if (d.isCollected) return;
            const s1 = map.stations[d.stationA];
            const s2 = map.stations[d.stationB];
            if (s1 && s2) {
                const midX = (s1.x + s2.x) / 2;
                const midY = (s1.y + s2.y) / 2;
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", midX - 6); rect.setAttribute("y", midY - 6);
                rect.setAttribute("width", 12); rect.setAttribute("height", 12);
                rect.setAttribute("class", "diamond");
                rect.style.transformOrigin = `${midX}px ${midY}px`;
                gameMap.appendChild(rect);
            }
        });
    }

    // Stations
    Object.values(map.stations).forEach(station => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "station");

        if (isMyTurn) {
            g.onclick = () => {
                if (state.selectedStationId === station.id) {
                    state.selectedStationId = null;
                } else {
                    state.selectedStationId = station.id;
                }
                renderMap(gameState, me, isMyTurn);
                updateUI(gameState);
            };
            g.style.cursor = 'pointer';
        }

        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hitArea.setAttribute("cx", station.x); hitArea.setAttribute("cy", station.y); hitArea.setAttribute("r", 25);
        hitArea.setAttribute("fill", "transparent");
        g.appendChild(hitArea);

        // Selection Ring (New Style)
        if (state.selectedStationId === station.id) {
            const selectionRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            selectionRing.setAttribute("cx", station.x);
            selectionRing.setAttribute("cy", station.y);
            selectionRing.setAttribute("r", 17);
            selectionRing.setAttribute("fill", "none");
            selectionRing.setAttribute("stroke", "#3b82f6"); // Blue
            selectionRing.setAttribute("stroke-width", "4");
            selectionRing.setAttribute("class", "selection-ring");
            g.appendChild(selectionRing);
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", station.x); circle.setAttribute("cy", station.y); circle.setAttribute("r", 10);
        circle.setAttribute("class", "station-circle");

        if (station.type === 'thief_start') circle.setAttribute("stroke", "#f43f5e");
        else if (station.type === 'police_start') circle.setAttribute("stroke", "#3b82f6");
        else if (station.type === 'escape') circle.setAttribute("stroke", "#22c55e");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", station.x); text.setAttribute("y", station.y + 30);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("class", "station-text");
        text.textContent = station.name.toUpperCase();

        g.appendChild(circle);
        g.appendChild(text);
        gameMap.appendChild(g);
    });

    // Traces
    if (me && me.role === 'thief' && gameState.thiefTraces) {
        for (let i = 0; i < gameState.thiefTraces.length - 1; i++) {
            const s1 = map.stations[gameState.thiefTraces[i].stationId];
            const s2 = map.stations[gameState.thiefTraces[i + 1].stationId];
            if (s1 && s2) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", s1.x); line.setAttribute("y1", s1.y);
                line.setAttribute("x2", s2.x); line.setAttribute("y2", s2.y);
                line.setAttribute("class", "thief-trace-edge");
                gameMap.appendChild(line);
            }
        }
        gameState.thiefTraces.forEach(trace => {
            const station = map.stations[trace.stationId];
            if (station) {
                const tCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                tCircle.setAttribute("cx", station.x); tCircle.setAttribute("cy", station.y); tCircle.setAttribute("r", 20);
                tCircle.setAttribute("class", "thief-trace");
                gameMap.appendChild(tCircle);
            }
        });
    }

    // Players
    const visiblePlayersByStation = {};
    Object.values(players).forEach(p => {
        let isVisible = (me && (me.role === 'thief' || me.role === 'corrupt_police')) || (p.role === 'police' || p.role === 'corrupt_police') || (p.id === state.myId);
        if (isVisible) {
            if (!visiblePlayersByStation[p.position]) visiblePlayersByStation[p.position] = [];
            visiblePlayersByStation[p.position].push(p);
        }
    });

    Object.entries(visiblePlayersByStation).forEach(([stationId, group]) => {
        const station = map.stations[stationId];
        if (!station) return;
        group.forEach((p, index) => {
            const isMe = p.id === state.myId;
            const total = group.length;
            let offsetX = 0, offsetY = 0;
            if (total > 1) {
                const angle = (index / total) * 2 * Math.PI;
                const radius = 25;
                offsetX = Math.cos(angle) * radius;
                offsetY = Math.sin(angle) * radius;
            }

            const pGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            pGroup.setAttribute("class", "player-marker");
            let displayIcon = getRoleIcon(p.role);
            if (p.role === 'corrupt_police' && me && me.role === 'police') displayIcon = getRoleIcon('police');

            const pIconSize = 40;
            const pIcon = document.createElementNS("http://www.w3.org/2000/svg", "image");
            pIcon.setAttribute("x", station.x + offsetX - pIconSize / 2);
            pIcon.setAttribute("y", station.y + offsetY - pIconSize / 2);
            pIcon.setAttribute("width", pIconSize); pIcon.setAttribute("height", pIconSize);
            pIcon.setAttribute("href", displayIcon);

            if (isMe) {
                const pHighlight = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                pHighlight.setAttribute("cx", station.x + offsetX); pHighlight.setAttribute("cy", station.y + offsetY);
                pHighlight.setAttribute("r", pIconSize / 2 + 4); pHighlight.setAttribute("fill", "none");
                pHighlight.setAttribute("stroke", "#facc15"); pHighlight.setAttribute("stroke-width", "3");
                pGroup.appendChild(pHighlight);
            }
            pGroup.appendChild(pIcon);
            const pName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            pName.setAttribute("x", station.x + offsetX); pName.setAttribute("y", station.y + offsetY - 18);
            pName.setAttribute("class", "player-label");
            pName.textContent = p.name.toUpperCase() + (isMe ? " (ICH)" : "");
            pGroup.appendChild(pName);
            gameMap.appendChild(pGroup);
        });
    });
}

import { socket } from '../services/socket.js';
import { showScreen, showPopup, getEl, showConfirm } from '../utils/ui.js';
import { state } from '../app/state.js';
import { renderLobbyPlayers } from './LobbyWaitingPanel.js';
import { getRoleColor, getRoleIcon, translateRole, translatePhase, getDistance, getAvatarUrl } from '../utils/gameUtils.js';
import { toggleMute, getMuteState, isVoiceReady, initVoiceChat, updateVoiceVolumes } from '../services/voiceService.js';
import { translations } from '../i18n/translations.js';

let heartbeatAudio = null;
function playHeartbeat(active) {
    if (active) {
        if (!heartbeatAudio) {
            heartbeatAudio = new Audio('https://www.soundjay.com/human/heartbeat-01.mp3');
            heartbeatAudio.loop = true;
        }
        heartbeatAudio.play().catch(() => { });
    } else if (heartbeatAudio) {
        heartbeatAudio.pause();
    }
}

export function initGameView() {
    const btnArrest = getEl('btn-arrest');
    const btnRoadblock = getEl('btn-roadblock');
    const btnLeaveGame = getEl('btn-leave-game');
    const btnEndTurn = getEl('btn-end-turn');
    const btnMove = getEl('btn-move');
    const btnInvestigate = getEl('btn-investigate');
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

    if (btnRoadblock) {
        btnRoadblock.addEventListener('click', () => {
            if (state.selectedStationId) {
                socket.emit('use_ability', { abilityId: 'roadblock', targetId: state.selectedStationId });
                state.selectedStationId = null;
            } else {
                showPopup('HINWEIS', 'Wähle zuerst eine Station aus, die du absperren möchtest.');
            }
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
            if (dropdown) {
                const isHidden = dropdown.classList.toggle('hidden');
                btnAbilities.classList.toggle('open', !isHidden);
            }
        });
    }

    if (btnLeaveGame) {
        btnLeaveGame.addEventListener('click', () => {
            console.log("Leave game button clicked!");
            showConfirm(
                state.currentLanguage === 'en' ? "LEAVE GAME" : "SPIEL VERLASSEN",
                state.currentLanguage === 'en' ? "Are you sure you want to leave the game?" : "Bist du sicher, dass du das Spiel verlassen willst?",
                () => {
                    socket.emit('leave_lobby');
                    showScreen('main');
                }
            );
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
        console.log('[Game] Signal empfangen: Spiel startet!');
        showScreen('game');

        // Falls wir schon einen State haben, direkt rendern
        if (state.lastState) {
            updateUI(state.lastState);
        } else {
            // Ansonsten kurz warten und nochmal versuchen (für langsame Verbindungen)
            setTimeout(() => {
                if (state.lastState) updateUI(state.lastState);
            }, 500);
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
            } else {
                title.textContent = "DIEB GEWINNT!";
                title.style.color = "#f43f5e";
            }

            if (gameState.endMessage) {
                msg.textContent = gameState.endMessage;
            } else {
                if (gameState.winner === 'police') {
                    msg.textContent = "Der Dieb wurde erfolgreich festgenommen.";
                } else if (gameState.winner === 'thief_team') {
                    msg.textContent = "Der Dieb hat alle Diamanten gesammelt. Dieb und korrupter Polizist gewinnen!";
                } else {
                    msg.textContent = "Der Dieb ist allen entkommen.";
                }
            }
        }
        updateUI(gameState);
    });

    socket.on('traitor_arrested', (data) => {
        triggerScreenShake();
        console.log('[Game] Verräter gefasst:', data.userId);
    });

    socket.on('fever_mode_start', () => {
        triggerScreenShake();
        // Hier könnte man die Musik ändern
        console.log('[Game] FIEBER-MODUS gestartet!');
    });

    socket.on('timer_update', (timeLeft) => {
        if (state.lastState) state.lastState.timeLeft = timeLeft;
        const timerSpan = document.querySelector('.timer');
        if (timerSpan) {
            timerSpan.textContent = `${timeLeft}s`;
            const phaseTxt = getEl('game-phase');
            if (phaseTxt) {
                if (timeLeft <= 10) phaseTxt.classList.add('warning');
                else phaseTxt.classList.remove('warning');
            }
        }
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

    socket.on('notification', (data) => {
        if (data.title === 'GROSSFAHNDUNG' || data.title === 'DIAMANT ALARM') {
            triggerScreenShake();
        }
    });

    window.addEventListener('voice_sabotaged', (e) => {
        triggerScreenShake();
        showNotification('📻 FUNKSTÖRUNG', 'Dein Funkgerät wurde sabotiert! Du kannst für 30 Sek. nicht reden.', 5000);
    });

    window.sabotagePlayer = (targetId) => {
        socket.emit('sabotage_mute', targetId);
    };

    socket.on('map_ping', (data) => {
        if (!state.activePings) state.activePings = [];
        state.activePings.push({ stationId: data.stationId, time: Date.now() });

        // Render map update to show ping
        if (state.lastState) renderMap(state.lastState, state.lastState.players[state.myId], state.lastState.activePlayerId === state.myId);

        // Remove ping after 5 seconds
        setTimeout(() => {
            state.activePings = state.activePings.filter(p => p.stationId !== data.stationId);
            if (state.lastState) renderMap(state.lastState, state.lastState.players[state.myId], state.lastState.activePlayerId === state.myId);
        }, 5000);
    });
}

function triggerScreenShake() {
    const gameContainer = getEl('screen-game');
    if (gameContainer) {
        gameContainer.classList.add('shake');
        setTimeout(() => {
            gameContainer.classList.remove('shake');
        }, 500);
    }
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
    const btnEndTurn = getEl('btn-end-turn');
    const btnInvestigate = getEl('btn-investigate');
    const btnArrest = getEl('btn-arrest');
    const btnRoadblock = getEl('btn-roadblock');
    const abilitiesDropdown = getEl('abilities-dropdown');

    if (diamondCounter) {
        diamondCounter.textContent = `${gameState.collectedCount} / ${gameState.requiredDiamonds}`;
        if (gameState.isFeverMode) diamondCounter.classList.add('warning');
    }

    const hudLeft = getEl('hud-left-v');
    if (hudLeft) {
        let feverBadge = hudLeft.querySelector('.fever-badge');
        if (gameState.isFeverMode) {
            if (!feverBadge) {
                feverBadge = document.createElement('div');
                feverBadge.className = 'hud-item fever-badge warning';
                feverBadge.style.color = '#f43f5e';
                feverBadge.innerHTML = '🔥 FIEBER-MODUS 🔥';
                hudLeft.appendChild(feverBadge);
            }
        } else if (feverBadge) {
            feverBadge.remove();
        }
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

            // Apply frame to list entry if available
            const frameClass = p.currentFrame ? `frame_${p.currentFrame}` : '';

            // Sabotage Button nur für korrupten Polizisten (und nur gegen andere Cops)
            let sabotageBtn = '';
            const iAmCorrupt = myPlayer && myPlayer.role === 'corrupt_police';
            const canSabotage = iAmCorrupt && (p.role === 'police' || p.role === 'corrupt_police') && !isMe && !myPlayer.hasSabotagedThisRound && !myPlayer.isImprisoned;
            if (canSabotage) {
                sabotageBtn = `<span class="sabotage-btn-small" onclick="window.sabotagePlayer('${p.id}')" title="Funk sabotieren">🔇</span>`;
            }

            item.innerHTML = `
                <div class="avatar-container small ${frameClass}">
                    <img src="${getAvatarUrl(p.avatar)}" alt="Avatar">
                </div>
                <div class="player-list-info">
                    <span class="player-list-name">${p.name}${isMe ? youSuffix : ''}</span>
                    <span class="player-list-separator"> — </span>
                    <span class="player-list-role" style="color: ${getRoleColor(p.role)}">${roleName}</span>
                    ${sabotageBtn}
                    <span class="mic-status ${micClass} ${isMe ? 'clickable' : ''}" title="${micTitle}">${micIcon}</span>
                </div>
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

                // Also update HUD Profile Box if it exists
                const hudLeft = getEl('hud-left-v');
                if (hudLeft) {
                    let hudProfile = hudLeft.querySelector('.hud-profile-box');
                    if (!hudProfile) {
                        hudProfile = document.createElement('div');
                        hudProfile.className = 'hud-profile-box hud-item';
                        hudLeft.prepend(hudProfile);
                    }
                    hudProfile.innerHTML = `
                        <div class="avatar-container small ${p.currentFrame ? 'frame_' + p.currentFrame : ''}">
                            <img src="${getAvatarUrl(p.avatar)}" alt="Avatar">
                        </div>
                        <div class="hud-profile-info">
                            <span class="hud-profile-name">${p.name}</span>
                            <span class="hud-profile-kora"><span class="kora-icon">₵</span> ${p.koraBalance || 0}</span>
                        </div>
                    `;
                }
            }
            playerListPanel.appendChild(item);
        });
    }

    const gameContainer = getEl('screen-game');
    if (!gameContainer) return;

    // PRISON UI
    let prisonBox = document.getElementById('prison-box');
    if (!prisonBox) {
        prisonBox = document.createElement('div');
        prisonBox.id = 'prison-box';
        prisonBox.className = 'prison-box';
        prisonBox.innerHTML = '<div class="prison-title">GEFÄNGNIS</div><div id="prison-cells" class="prison-cells"></div>';
        gameContainer.appendChild(prisonBox);
    }
    const prisonCells = document.getElementById('prison-cells');
    if (prisonCells) prisonCells.innerHTML = '';
    const isMeThief = myPlayer && myPlayer.role === 'thief';

    // Heartbeat Overlay (Nur für Dieb wenn Polizei nah)
    let hbOverlay = document.getElementById('hb-overlay');
    if (isMeThief && gameState.isThiefNearPolice) {
        if (!hbOverlay) {
            hbOverlay = document.createElement('div');
            hbOverlay.id = 'hb-overlay';
            hbOverlay.className = 'heartbeat-overlay';
            gameContainer.appendChild(hbOverlay);
        }
        playHeartbeat(true);
    } else {
        if (hbOverlay) hbOverlay.remove();
        playHeartbeat(false);
    }

    // Last Stand Overlay (Für alle wenn Endgame)
    let lsOverlay = document.getElementById('ls-overlay');
    if (gameState.isLastStand) {
        if (!lsOverlay) {
            lsOverlay = document.createElement('div');
            lsOverlay.id = 'ls-overlay';
            lsOverlay.className = 'last-stand-border';
            gameContainer.appendChild(lsOverlay);
        }
    } else {
        if (lsOverlay) lsOverlay.remove();
    }

    if (abilitiesDropdown) {
        const lang = state.currentLanguage || 'de';
        const t = translations[lang] || translations['de'];
        const myUser = state.myUserData;

        abilitiesDropdown.innerHTML = '';
        const abilities = (myPlayer && myPlayer.abilities) ? Object.entries(myPlayer.abilities).filter(([id, count]) => count > 0) : [];

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

    // Action-Bar Sichtbarkeit & Status
    if (actionBar && gameState.phase !== 'waiting' && gameState.phase !== 'end') {
        actionBar.classList.remove('hidden');
        const gameActionBar = getEl('game-action-bar');
        if (gameActionBar) gameActionBar.classList.remove('hidden');

        // Alle Buttons im Container finden
        const allButtons = actionBar.querySelectorAll('button');
        allButtons.forEach(btn => {
            btn.disabled = !isMyTurn;
            if (!isMyTurn) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Warten auf den nächsten Zug...';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.title = '';
            }
        });

        if (btnMove) {
            btnMove.classList.remove('hidden');
            btnMove.textContent = `MOVE (${myPlayer.ap_move || 0} UEBRIG)`;
            let isValidMove = false;
            if (isMyTurn && state.selectedStationId) {
                const startPos = myPlayer.position;
                const dist = getDistance(gameState.map, startPos, state.selectedStationId);
                if (dist > 0 && dist <= myPlayer.ap_move) isValidMove = true;
            }
            btnMove.disabled = !isMyTurn || !isValidMove;
        }

        if (myPlayer && myPlayer.role !== 'thief') {
            if (btnInvestigate) {
                btnInvestigate.classList.remove('hidden');
                btnInvestigate.disabled = !isMyTurn || myPlayer.ap_investigate <= 0 || !state.selectedStationId;
                btnInvestigate.textContent = `UNTERSUCHEN (${myPlayer.ap_investigate || 0} UEBRIG)`;
            }
            if (btnArrest) {
                btnArrest.classList.remove('hidden');
                btnArrest.disabled = !isMyTurn || myPlayer.ap_arrest <= 0 || !state.selectedStationId;
                btnArrest.textContent = `FESTNAHME (${myPlayer.ap_investigate || 0} UEBRIG)`;
            }
            if (btnRoadblock) {
                btnRoadblock.classList.remove('hidden');
                btnRoadblock.disabled = !isMyTurn || !myPlayer.abilities || !myPlayer.abilities.roadblock || myPlayer.abilities.roadblock <= 0 || !state.selectedStationId;
                btnRoadblock.textContent = `STRASSE SPERRE (${myPlayer.abilities.roadblock || 0})`;
            }
        } else {
            if (btnInvestigate) btnInvestigate.classList.add('hidden');
            if (btnArrest) btnArrest.classList.add('hidden');
            if (btnRoadblock) btnRoadblock.classList.add('hidden');
        }
    } else if (actionBar) {
        actionBar.classList.add('hidden');
    }

    if (gamePhaseTxt) {
        let phaseText = "";
        if (isMyTurn) phaseText = "DEIN ZUG!";
        else {
            const activePlayer = gameState.players[gameState.activePlayerId];
            phaseText = activePlayer ? `${activePlayer.name.toUpperCase()} IST DRAN` : translatePhase(gameState.phase).toUpperCase();
        }
        if (gameState.timeLeft !== undefined && gameState.phase !== 'waiting' && gameState.phase !== 'end') {
            gamePhaseTxt.innerHTML = `${phaseText} — <span class="timer">${gameState.timeLeft}s</span>`;
            if (gameState.timeLeft <= 5) gamePhaseTxt.classList.add('warning');
            else gamePhaseTxt.classList.remove('warning');
        } else {
            gamePhaseTxt.textContent = phaseText;
            gamePhaseTxt.classList.remove('warning');
        }
    }

    updateVoiceVolumes(gameState, state.myId);
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

    // Traces (Dynamic Spurensystem) - Vor den Stationen rendern für einen "sauberen" Look
    if (gameState.thiefTraces) {
        const isThiefTeam = me && (me.role === 'thief' || me.role === 'corrupt_police');
        const isMassHunt = gameState.isMassHuntActive;

        if (isThiefTeam || isMassHunt) {
            // 1. Verbindungslinien (Edges) zuerst zeichnen (ganz unten)
            if (isThiefTeam) {
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
            }

            // 2. Spuren-Kreise (Nodes)
            gameState.thiefTraces.forEach(trace => {
                const station = map.stations[trace.stationId];
                if (station) {
                    const roundDiff = gameState.round - trace.round;
                    if (!isThiefTeam && isMassHunt && roundDiff < 2) return;

                    const tCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    tCircle.setAttribute("cx", station.x); tCircle.setAttribute("cy", station.y);
                    tCircle.setAttribute("r", 25); // Vergrößert auf 25, damit es unter dem Polizisten (r=18) hervorschaut

                    let traceClass = "thief-trace";
                    if (roundDiff === 0) traceClass += " trace-hot";
                    else if (roundDiff === 1) traceClass += " trace-warm";
                    else if (roundDiff === 2) traceClass += " trace-cold";
                    else traceClass += " trace-frozen";

                    if (isMassHunt && roundDiff > 0) traceClass += " mass-hunt";

                    tCircle.setAttribute("class", traceClass);
                    tCircle.style.transformOrigin = `${station.x}px ${station.y}px`;
                    gameMap.appendChild(tCircle);
                }
            });
        }
    }

    // Stations
    Object.values(map.stations).forEach(station => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "station");

        if (isMyTurn) {
            g.onclick = (e) => {
                // ALT-Click für Pings (Polizei)
                if (e.altKey && me && (me.role === 'police' || me.role === 'corrupt_police')) {
                    socket.emit('map_ping', { stationId: station.id });
                    return;
                }

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

        const isMobile = window.innerWidth <= 930;
        const hitRadius = isMobile ? 45 : 25;
        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hitArea.setAttribute("cx", station.x); hitArea.setAttribute("cy", station.y); hitArea.setAttribute("r", hitRadius);
        hitArea.setAttribute("fill", "transparent");
        g.appendChild(hitArea);

        // Selection Ring (New Style)
        if (state.selectedStationId === station.id) {
            const ringRadius = isMobile ? 22 : 17;
            const selectionRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            selectionRing.setAttribute("cx", station.x);
            selectionRing.setAttribute("cy", station.y);
            selectionRing.setAttribute("r", ringRadius);
            selectionRing.setAttribute("fill", "none");
            selectionRing.setAttribute("stroke", "#3b82f6"); // Blue
            selectionRing.setAttribute("stroke-width", "4");
            selectionRing.setAttribute("class", "selection-ring");
            g.appendChild(selectionRing);
        }

        const stationRadius = isMobile ? 15 : 10;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", station.x); circle.setAttribute("cy", station.y); circle.setAttribute("r", stationRadius);
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


    // IDEA 2: Ping / Reveal
    if (gameState.revealedThiefPos) {
        const station = map.stations[gameState.revealedThiefPos];
        if (station) {
            const ping = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ping.setAttribute("cx", station.x); ping.setAttribute("cy", station.y); ping.setAttribute("r", 25);
            ping.setAttribute("class", "thief-ping");
            gameMap.appendChild(ping);
        }
    }

    // Active Team Pings
    if (state.activePings) {
        state.activePings.forEach(ping => {
            const station = map.stations[ping.stationId];
            if (station) {
                const pingCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                pingCircle.setAttribute("cx", station.x); pingCircle.setAttribute("cy", station.y); pingCircle.setAttribute("r", 25);
                pingCircle.setAttribute("class", "team-ping");
                pingCircle.style.transformOrigin = `${station.x}px ${station.y}px`;
                gameMap.appendChild(pingCircle);

                const pingText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                pingText.setAttribute("x", station.x); pingText.setAttribute("y", station.y - 35);
                pingText.setAttribute("class", "ping-label");
                pingText.textContent = "HINWEIS!";
                gameMap.appendChild(pingText);
            }
        });
    }

    // Players
    const visiblePlayersByStation = {};
    const prisonCells = document.getElementById('prison-cells');
    if (prisonCells) prisonCells.innerHTML = '';

    Object.values(players).forEach(p => {
        // Gefangene Spieler kommen ins Prison-Box
        if (p.isImprisoned) {
            if (prisonCells) {
                const pDiv = document.createElement('div');
                pDiv.className = 'hud-avatar-box';
                pDiv.style.width = '40px'; pDiv.style.height = '40px';
                pDiv.style.position = 'relative';
                // Wichtig: In p.avatar oder p.avatarId prüfen
                const avatarId = p.avatarId || p.avatar;
                pDiv.innerHTML = `<img src="${getAvatarUrl(avatarId)}" style="width:100%">
                                  <div class="imprisoned-badge">GEFASST</div>`;
                prisonCells.appendChild(pDiv);
            }
            return;
        }

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

            const isMobile = window.innerWidth <= 930;
            const pIconSize = isMobile ? 55 : 40;
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


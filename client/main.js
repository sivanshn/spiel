import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const socket = io(SERVER_URL);

const screens = {
    login: document.getElementById('screen-login'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const playerStatusBar = document.getElementById('player-status-bar');
const gamePhaseTxt = document.getElementById('game-phase');
const playerRoleTxt = document.getElementById('player-role');
const gameMap = document.getElementById('game-map');
const roundCounter = document.getElementById('round-counter');
const turnTimerTxt = document.getElementById('turn-timer');
const btnEndTurn = document.getElementById('btn-end-turn');
const btnMove = document.getElementById('btn-move');
const btnInvestigate = document.getElementById('btn-investigate');
const btnArrest = document.getElementById('btn-arrest');
const btnDebugStart = document.getElementById('btn-debug-start');
const actionBar = document.getElementById('action-bar');
const notificationModal = document.getElementById('notification-modal');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-msg');
const modalClose = document.getElementById('modal-close');

let myId = null;
let selectedStationId = null;
let lastState = null;

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
    if (screenId === 'login') {
        usernameInput.focus();
    }
}

function showPopup(title, message) {
    modalTitle.textContent = title;
    modalMsg.textContent = message;
    notificationModal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
    notificationModal.classList.add('hidden');
});

joinBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        socket.emit('join_game', { name });
    }
});

usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

btnEndTurn.addEventListener('click', () => {
    socket.emit('end_turn');
});

btnMove.addEventListener('click', () => {
    if (selectedStationId) {
        socket.emit('move_to', selectedStationId);
        selectedStationId = null;
    }
});

btnInvestigate.addEventListener('click', () => {
    socket.emit('investigate');
});

btnArrest.addEventListener('click', () => {
    socket.emit('arrest');
});

btnDebugStart.addEventListener('click', () => {
    socket.emit('start_game_debug');
});

socket.on('investigation_result', (data) => {
    showPopup("HINWEIS", data.result);
});

socket.on('connect', () => {
    myId = socket.id;
});

socket.on('join_success', () => {
    showScreen('game');
});

socket.on('error_msg', (msg) => {
    showPopup("ACHTUNG", msg);
});

socket.on('state_update', (gameState) => {
    lastState = gameState;
    if (gameState.phase === 'end') {
        showScreen('result');
        const title = document.getElementById('result-title');
        const msg = document.getElementById('result-msg');
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
    } else if (gameState.phase === 'waiting' || gameState.phase === 'thief_turn') {
        // Falls wir gerade vom Result-Screen kommen
        if (screens.result.classList.contains('active')) {
            showScreen('game');
        }
    }
    updateUI(gameState);
});

function updateUI(state) {
    const myPlayer = state.players[myId];
    const isMyTurn = state.activePlayerId === myId;
    
    // Rolle anzeigen
    if (myPlayer && myPlayer.role) {
        playerRoleTxt.textContent = translateRole(myPlayer.role).toUpperCase();
        playerRoleTxt.style.color = getRoleColor(myPlayer.role);
    } else {
        playerRoleTxt.textContent = "WARTEN...";
        playerRoleTxt.style.color = "#94a3b8";
    }

    // Action Bar
    if (isMyTurn && state.phase !== 'waiting') {
        actionBar.classList.remove('hidden');
        
        // MOVE Button
        btnMove.classList.remove('hidden');
        btnMove.textContent = `MOVE (${myPlayer.ap_move} ÜBRIG)`;
        
        let isValidMove = false;
        if (selectedStationId && myPlayer && myPlayer.ap_move > 0 && state.map) {
            const dist = getDistance(state.map, myPlayer.position, selectedStationId);
            if (dist === 1) isValidMove = true;
        }
        btnMove.disabled = !isValidMove;

        // UNTERSUCHEN & FESTNAHME Buttons
        if (myPlayer && myPlayer.role !== 'thief') {
            btnInvestigate.classList.remove('hidden');
            btnInvestigate.textContent = `UNTERSUCHEN (${myPlayer.ap_investigate} ÜBRIG)`;
            btnInvestigate.disabled = (myPlayer.ap_investigate < 1);

            btnArrest.classList.remove('hidden');
            btnArrest.textContent = `FESTNAHME (${myPlayer.ap_investigate} ÜBRIG)`;
            btnArrest.disabled = (myPlayer.ap_investigate < 1);
        } else {
            btnInvestigate.classList.add('hidden');
            btnArrest.classList.add('hidden');
        }
    } else {
        actionBar.classList.add('hidden');
    }

    // Debug Button
    if (state.phase === 'waiting') {
        btnDebugStart.classList.remove('hidden');
    } else {
        btnDebugStart.classList.add('hidden');
    }

    // Status Bar (Eigene Aktionspunkte)
    playerStatusBar.innerHTML = '';
    if (myPlayer) {
        const pill = document.createElement('div');
        pill.className = 'status-pill';
        if (state.activePlayerId === myId) pill.classList.add('active-player');
        
        let apText = "";
        if (myPlayer.role === 'thief') {
            apText = `${myPlayer.ap_move} BEWEGUNG`;
        } else {
            apText = `${myPlayer.ap_move} BEW. | ${myPlayer.ap_investigate} UNT.`;
        }

        pill.textContent = `${myPlayer.name} (DU) [${apText}]`;
        if (myPlayer.role) pill.style.borderColor = getRoleColor(myPlayer.role);
        playerStatusBar.appendChild(pill);
    }

    // Info
    let phaseText = "";
    if (isMyTurn) {
        phaseText = "DEIN ZUG!";
    } else {
        const activePlayer = state.players[state.activePlayerId];
        if (activePlayer) {
            phaseText = `${activePlayer.name.toUpperCase()} IST DRAN`;
        } else {
            phaseText = translatePhase(state.phase).toUpperCase();
        }
    }
    gamePhaseTxt.textContent = phaseText;
    roundCounter.textContent = `RUNDE ${state.round}`;

    // Timer
    if (state.phase !== 'waiting') {
        turnTimerTxt.classList.remove('hidden');
        turnTimerTxt.textContent = `${state.timeLeft}s`;
        if (state.timeLeft <= 5) turnTimerTxt.classList.add('warning');
        else turnTimerTxt.classList.remove('warning');
    } else {
        turnTimerTxt.classList.add('hidden');
    }

    // Diamanten Counter
    const diamondCounter = document.getElementById('diamond-counter');
    if (diamondCounter) {
        diamondCounter.textContent = `${state.collectedCount} / ${state.requiredDiamonds}`;
    }

    // Karte zeichnen
    renderMap(state, myPlayer, isMyTurn);
}

function getRoleColor(role) {
    if (role === 'thief') return '#f43f5e';
    if (role === 'police') return '#3b82f6';
    if (role === 'corrupt_police') return '#a855f7';
    return '#94a3b8';
}

function translateRole(role) {
    const roles = { 'thief': 'Dieb', 'police': 'Polizei', 'corrupt_police': 'Korrupt' };
    return roles[role] || 'Warten...';
}

function translatePhase(phase) {
    const phases = { 'waiting': 'Lobby', 'thief_turn': 'Dieb am Zug', 'police_turn': 'Polizei am Zug', 'end': 'Spiel Ende' };
    return phases[phase] || phase;
}

function getDistance(map, startId, endId) {
    if (startId === endId) return 0;
    let queue = [[startId, 0]];
    let visited = new Set([startId]);
    
    while (queue.length > 0) {
        let [current, dist] = queue.shift();
        
        const neighbors = map.connections
            .filter(c => c[0] === current || c[1] === current)
            .map(c => c[0] === current ? c[1] : c[0]);
            
        for (let neighbor of neighbors) {
            if (neighbor === endId) return dist + 1;
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, dist + 1]);
            }
        }
    }
    return Infinity;
}

function renderMap(state, me, isMyTurn) {
    const { map, players } = state;
    if (!map) return;
    gameMap.innerHTML = '';

    // Verbindungen
    map.connections.forEach(conn => {
        const s1 = map.stations[conn[0]];
        const s2 = map.stations[conn[1]];
        if (s1 && s2) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", s1.x); line.setAttribute("y1", s1.y);
            line.setAttribute("x2", s2.x); line.setAttribute("y2", s2.y);
            line.setAttribute("class", "connection");
            gameMap.appendChild(line);
        }
    });

    // Diamanten auf Verbindungen zeichnen
    if (state.diamonds) {
        state.diamonds.forEach(d => {
            if (d.isCollected) return;
            const s1 = map.stations[d.stationA];
            const s2 = map.stations[d.stationB];
            if (s1 && s2) {
                const midX = (s1.x + s2.x) / 2;
                const midY = (s1.y + s2.y) / 2;
                
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", midX - 6);
                rect.setAttribute("y", midY - 6);
                rect.setAttribute("width", 12);
                rect.setAttribute("height", 12);
                rect.setAttribute("class", "diamond");
                // Rotation (45 Grad) wird über CSS-Animation gehandhabt
                rect.style.transformOrigin = `${midX}px ${midY}px`;
                
                gameMap.appendChild(rect);
            }
        });
    }

    // Stationen
    Object.values(map.stations).forEach(station => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "station");
        
        // Klickbar machen wenn am Zug
        if (isMyTurn) {
            g.onclick = () => {
                selectedStationId = station.id;
                renderMap(state, me, isMyTurn); // Neu zeichnen für Highlight
                updateUI(state); // UI Buttons aktualisieren
            };
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", station.x); circle.setAttribute("cy", station.y); circle.setAttribute("r", 10);
        circle.setAttribute("class", "station-circle");
        
        // Highlight für Auswahl
        if (selectedStationId === station.id) {
            circle.setAttribute("stroke", "#facc15");
            circle.setAttribute("stroke-width", "4");
            circle.setAttribute("r", "14");
        } else if (station.type === 'thief_start') circle.setAttribute("stroke", "#f43f5e");
        else if (station.type === 'police_start') circle.setAttribute("stroke", "#3b82f6");
        else if (station.type === 'escape') circle.setAttribute("stroke", "#22c55e");
        
        if (station.hasDiamond) circle.setAttribute("fill", "#facc15");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", station.x); text.setAttribute("y", station.y + 30);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("class", "station-text");
        text.textContent = station.name.toUpperCase();

        g.appendChild(circle);
        g.appendChild(text);
        gameMap.appendChild(g);
    });

    // Spuren des Diebes zeichnen (Nur für Dieb sichtbar)
    if (me && me.role === 'thief' && state.thiefTraces) {
        // Zuerst die Kanten (Linien) zwischen den Spuren
        for (let i = 0; i < state.thiefTraces.length - 1; i++) {
            const s1 = map.stations[state.thiefTraces[i].stationId];
            const s2 = map.stations[state.thiefTraces[i+1].stationId];
            if (s1 && s2) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", s1.x); line.setAttribute("y1", s1.y);
                line.setAttribute("x2", s2.x); line.setAttribute("y2", s2.y);
                line.setAttribute("class", "thief-trace-edge");
                gameMap.appendChild(line);
            }
        }

        // Dann die Kreise
        state.thiefTraces.forEach(trace => {
            const station = map.stations[trace.stationId];
            if (station) {
                const tCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                tCircle.setAttribute("cx", station.x); tCircle.setAttribute("cy", station.y); tCircle.setAttribute("r", 20);
                tCircle.setAttribute("class", "thief-trace");
                gameMap.appendChild(tCircle);
            }
        });
    }

    // Spieler-Figuren (Gruppiert nach Station für Versatz)
    const visiblePlayersByStation = {};
    Object.values(players).forEach(p => {
        let isVisible = false;
        if (me && (me.role === 'thief' || me.role === 'corrupt_police')) isVisible = true;
        if (p.role === 'police' || p.role === 'corrupt_police') isVisible = true; 
        if (p.id === myId) isVisible = true;

        if (isVisible) {
            if (!visiblePlayersByStation[p.position]) visiblePlayersByStation[p.position] = [];
            visiblePlayersByStation[p.position].push(p);
        }
    });

    Object.entries(visiblePlayersByStation).forEach(([stationId, group]) => {
        const station = map.stations[stationId];
        if (!station) return;

        group.forEach((p, index) => {
            const isMe = p.id === myId;
            const total = group.length;

            // Offset berechnen
            let offsetX = 0;
            let offsetY = 0;
            if (total > 1) {
                const angle = (index / total) * 2 * Math.PI;
                const radius = 25;
                offsetX = Math.cos(angle) * radius;
                offsetY = Math.sin(angle) * radius;
            }

            const pGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            pGroup.setAttribute("class", "player-marker");

            // Tarn-Logik
            let displayColor = getRoleColor(p.role);
            if (p.role === 'corrupt_police' && me && me.role === 'police') {
                displayColor = getRoleColor('police');
            }

            const pCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            pCircle.setAttribute("cx", station.x + offsetX);
            pCircle.setAttribute("cy", station.y + offsetY);
            pCircle.setAttribute("r", 12);
            pCircle.setAttribute("fill", displayColor);
            pCircle.setAttribute("stroke", "white");
            pCircle.setAttribute("stroke-width", isMe ? "3" : "1");
            pGroup.appendChild(pCircle);

            const pName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            pName.setAttribute("x", station.x + offsetX);
            pName.setAttribute("y", station.y + offsetY - 18);
            pName.setAttribute("class", "player-label");
            pName.textContent = p.name.toUpperCase() + (isMe ? " (ICH)" : "");
            pGroup.appendChild(pName);

            gameMap.appendChild(pGroup);
        });
    });
}

// Initialer Fokus auf das Namensfeld
usernameInput.focus();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('<h1>Polizei gegen Dieb - Server läuft!</h1><p>Socket.io ist bereit.</p>');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Für Entwicklung offen, später auf Vercel-Domain einschränken
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Die neue Map 1 Daten
const mapData = {
    stations: {
        'nordtor': { id: 'nordtor', name: 'Nordtor', x: 500, y: 120, type: 'thief_start' },
        'universitaet': { id: 'universitaet', name: 'Universität', x: 250, y: 120 },
        'westviertel': { id: 'westviertel', name: 'Westviertel', x: 250, y: 300 },
        'altstadt': { id: 'altstadt', name: 'Altstadt', x: 650, y: 150 },
        'museum': { id: 'museum', name: 'Museum', x: 820, y: 150, hasDiamond: true },
        'osthafen': { id: 'osthafen', name: 'Osthafen', x: 920, y: 300 },
        'rathaus': { id: 'rathaus', name: 'Rathaus', x: 550, y: 350 },
        'kunstviertel': { id: 'kunstviertel', name: 'Kunstviertel', x: 730, y: 430 },
        'zentralstation': { id: 'zentralstation', name: 'Zentralstation', x: 400, y: 480 },
        'docklands': { id: 'docklands', name: 'Docklands', x: 180, y: 550 },
        'polizei_a': { id: 'polizei_a', name: 'Polizei Start A', x: 60, y: 550, type: 'police_start' },
        'hafen': { id: 'hafen', name: 'Hafen', x: 250, y: 650, hasDiamond: true },
        'marktplatz': { id: 'marktplatz', name: 'Marktplatz', x: 500, y: 650, hasDiamond: true },
        'brueckenplatz': { id: 'brueckenplatz', name: 'Brückenplatz', x: 600, y: 500 },
        'suedviertel': { id: 'suedviertel', name: 'Südviertel', x: 730, y: 650 },
        'suedbahnhof': { id: 'suedbahnhof', name: 'Südbahnhof', x: 450, y: 820 },
        'tech_park': { id: 'tech_park', name: 'Tech Park', x: 600, y: 820 },
        'stadtpark': { id: 'stadtpark', name: 'Stadtpark', x: 750, y: 750 },
        'flucht': { id: 'flucht', name: 'Flucht', x: 820, y: 850, type: 'escape' },
        'polizei_b': { id: 'polizei_b', name: 'Polizei Start B', x: 920, y: 650, type: 'police_start' }
    },
    connections: [
        ['nordtor', 'universitaet'], ['nordtor', 'altstadt'], ['nordtor', 'rathaus'],
        ['universitaet', 'westviertel'],
        ['westviertel', 'zentralstation'],
        ['altstadt', 'museum'], ['altstadt', 'rathaus'],
        ['museum', 'osthafen'],
        ['osthafen', 'suedviertel'],
        ['rathaus', 'zentralstation'], ['rathaus', 'kunstviertel'],
        ['kunstviertel', 'suedviertel'],
        ['zentralstation', 'docklands'], ['zentralstation', 'brueckenplatz'], ['zentralstation', 'marktplatz'],
        ['docklands', 'polizei_a'], ['docklands', 'hafen'],
        ['hafen', 'marktplatz'],
        ['marktplatz', 'suedbahnhof'], ['marktplatz', 'suedviertel'],
        ['brueckenplatz', 'suedviertel'],
        ['suedviertel', 'stadtpark'], ['suedviertel', 'polizei_b'],
        ['suedbahnhof', 'tech_park'],
        ['tech_park', 'flucht'],
        ['stadtpark', 'flucht']
    ]
};

let gameState = {
    players: {},
    phase: 'waiting', 
    round: 1,
    map: mapData,
    isLocked: false,
    thiefTraces: [] // { stationId, round }
};

let turnTimer = null;
const TURN_TIME_LIMIT = 60; // 1 Minute

function assignRoles() {
    const ids = Object.keys(gameState.players);
    if (ids.length < 1) return; // Mindestens ein Spieler muss da sein

    gameState.isLocked = true; 

    const shuffled = ids.sort(() => 0.5 - Math.random());
    gameState.players[shuffled[0]].role = 'thief';
    gameState.players[shuffled[0]].position = 'nordtor';
    gameState.players[shuffled[0]].ap_move = 2; 
    gameState.players[shuffled[0]].ap_investigate = 0; 
    
    // Erste Spur am Startpunkt
    gameState.thiefTraces.push({ 
        stationId: 'nordtor', 
        round: gameState.round 
    });

    for (let i = 1; i < shuffled.length; i++) {
        const role = (i === 1) ? 'corrupt_police' : 'police';
        gameState.players[shuffled[i]].role = role;
        gameState.players[shuffled[i]].position = i % 2 === 0 ? 'polizei_a' : 'polizei_b';
        gameState.players[shuffled[i]].ap_move = 2;
        gameState.players[shuffled[i]].ap_investigate = 2;
    }
    
    io.emit('state_update', gameState); // Temporär für Initialisierung
    startTurn(shuffled[0], 'thief_turn');
}

function startTurn(playerId, phase) {
    if (turnTimer) clearInterval(turnTimer);
    
    gameState.phase = phase;
    gameState.activePlayerId = playerId;
    gameState.timeLeft = TURN_TIME_LIMIT;
    
    const player = gameState.players[playerId];
    if (player) {
        player.turnStartPosition = player.position;
        player.ap_move = 2;
        player.ap_investigate = (player.role === 'thief' ? 0 : 2);
    }

    turnTimer = setInterval(() => {
        gameState.timeLeft--;
        if (gameState.timeLeft <= 0) {
            clearInterval(turnTimer);
            endTurn(playerId);
        } else {
            broadcastState();
        }
    }, 1000);
    
    broadcastState();
}

function endTurn(playerId) {
    if (turnTimer) clearInterval(turnTimer);
    
    const player = gameState.players[playerId];
    if (!player) return;

    if (player.role === 'thief') {
        const policePlayers = Object.values(gameState.players).filter(p => p.role !== 'thief');
        startTurn(policePlayers[0].id, 'police_turn');
    } else {
        const policePlayers = Object.values(gameState.players).filter(p => p.role !== 'thief');
        const currentIndex = policePlayers.findIndex(p => p.id === playerId);
        
        if (currentIndex < policePlayers.length - 1) {
            startTurn(policePlayers[currentIndex + 1].id, 'police_turn');
        } else {
            gameState.round++;
            const thief = Object.values(gameState.players).find(p => p.role === 'thief');
            startTurn(thief.id, 'thief_turn');
        }
    }
}

// BFS zur Distanzberechnung auf dem Graph
function getDistance(startId, endId) {
    if (startId === endId) return 0;
    let queue = [[startId, 0]];
    let visited = new Set([startId]);
    
    while (queue.length > 0) {
        let [current, dist] = queue.shift();
        
        const neighbors = mapData.connections
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

// Hilfsfunktion: State gefiltert an einen bestimmten Socket senden
function emitState(socket) {
    try {
        const player = gameState.players[socket.id];
        let filteredState = JSON.parse(JSON.stringify(gameState)); // Deep Copy

        // Sensible Daten filtern
        if (!player || player.role !== 'thief') {
            delete filteredState.thiefTraces;
        }

        socket.emit('state_update', filteredState);
    } catch (err) {
        console.error("Fehler in emitState:", err);
    }
}

// Globales Update an alle (jeder bekommt seinen gefilterten State)
function broadcastState() {
    const sockets = io.sockets.sockets;
    sockets.forEach(socket => {
        emitState(socket);
    });
}

io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden:', socket.id);

    socket.on('join_game', (data) => {
        if (gameState.isLocked) {
            socket.emit('error_msg', 'Das Spiel läuft bereits.');
            return;
        }
        gameState.players[socket.id] = {
            id: socket.id,
            name: data.name || 'Unbekannt',
            role: null,
            position: null,
            ap: 0
        };
        socket.emit('join_success');
        if (Object.keys(gameState.players).length === 4) assignRoles();
        broadcastState();
    });

    socket.on('start_game_debug', () => {
        console.log('DEBUG: Spiel wird manuell gestartet...');
        assignRoles();
    });

    socket.on('move_to', (targetStationId) => {
        const player = gameState.players[socket.id];
        if (!player || gameState.activePlayerId !== socket.id) return;
        
        if (player.ap_move < 1) {
            socket.emit('error_msg', 'Keine Bewegungspunkte mehr übrig!');
            return;
        }

        const dist = getDistance(player.position, targetStationId);
        
        if (dist === 1) {
            player.position = targetStationId;
            player.ap_move -= 1;
            player.turnStartPosition = player.position;
            
            // Spur hinterlassen (nur für den Dieb)
            if (player.role === 'thief') {
                gameState.thiefTraces.push({ 
                    stationId: targetStationId, 
                    round: gameState.round 
                });
                // Maximal 4 Spuren behalten (entspricht ca. 2 Runden)
                if (gameState.thiefTraces.length > 4) {
                    gameState.thiefTraces = gameState.thiefTraces.slice(-4);
                }
            }

            // Auto-End Check
            if (player.ap_move === 0 && player.ap_investigate === 0) {
                endTurn(socket.id);
            }
            
            broadcastState();
        } else if (dist > 1) {
            socket.emit('error_msg', 'Du kannst dich nur einen Schritt nach dem anderen bewegen!');
        }
    });

    socket.on('investigate', () => {
        const player = gameState.players[socket.id];
        if (!player || gameState.activePlayerId !== socket.id || player.role === 'thief') return;
        
        if (player.ap_investigate < 1) {
            socket.emit('error_msg', 'Keine Untersuchungen mehr übrig!');
            return;
        }

        player.ap_investigate -= 1;
        player.turnStartPosition = player.position;
        
        // Auto-End Check
        const shouldEnd = (player.ap_move === 0 && player.ap_investigate === 0);
        
        const currentStation = player.position;
        const thief = Object.values(gameState.players).find(p => p.role === 'thief');
        
        let result = "Keine Spur gefunden.";
        const hasTrace = gameState.thiefTraces.some(t => t.stationId === currentStation);
        if (thief.position === currentStation || hasTrace) {
            result = "Spur vom Dieb gefunden!";
        }
        
        socket.emit('investigation_result', { stationId: currentStation, result });
        
        if (shouldEnd) {
            endTurn(socket.id);
        }

        broadcastState();
    });

    socket.on('end_turn', () => {
        const player = gameState.players[socket.id];
        if (!player || gameState.activePlayerId !== socket.id) return;

        player.ap_move = 0;
        player.ap_investigate = 0;
        endTurn(socket.id);
        broadcastState();
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length === 0) {
            gameState.isLocked = false;
            gameState.phase = 'waiting';
            gameState.round = 1;
            gameState.thiefTraces = [];
        }
        broadcastState();
    });
});

server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

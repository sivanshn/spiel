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
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

const mapData = {
    stations: {
        'nordtor': { id: 'nordtor', name: 'Nordtor', x: 500, y: 120, type: 'thief_start' },
        'universitaet': { id: 'universitaet', name: 'Universität', x: 250, y: 120 },
        'westviertel': { id: 'westviertel', name: 'Westviertel', x: 250, y: 300 },
        'altstadt': { id: 'altstadt', name: 'Altstadt', x: 650, y: 150 },
        'museum': { id: 'museum', name: 'Museum', x: 820, y: 150 },
        'osthafen': { id: 'osthafen', name: 'Osthafen', x: 920, y: 300 },
        'rathaus': { id: 'rathaus', name: 'Rathaus', x: 550, y: 350 },
        'kunstviertel': { id: 'kunstviertel', name: 'Kunstviertel', x: 730, y: 430 },
        'zentralstation': { id: 'zentralstation', name: 'Zentralstation', x: 400, y: 480 },
        'docklands': { id: 'docklands', name: 'Docklands', x: 180, y: 550 },
        'polizei_a': { id: 'polizei_a', name: 'Polizei Start A', x: 60, y: 550, type: 'police_start' },
        'hafen': { id: 'hafen', name: 'Hafen', x: 250, y: 650 },
        'marktplatz': { id: 'marktplatz', name: 'Marktplatz', x: 500, y: 650 },
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
    thiefTraces: [], 
    diamonds: [], 
    collectedCount: 0,
    requiredDiamonds: 2
};

let turnTimer = null;
const TURN_TIME_LIMIT = 60; 

function assignRoles() {
    const ids = Object.keys(gameState.players);
    if (ids.length < 1) return; 

    gameState.isLocked = true; 

    const shuffled = ids.sort(() => 0.5 - Math.random());

    const availableStations = Object.keys(gameState.map.stations).filter(id => gameState.map.stations[id].type !== 'escape');
    const shuffledStations = availableStations.sort(() => 0.5 - Math.random());

    gameState.players[shuffled[0]].role = 'thief';
    gameState.players[shuffled[0]].position = shuffledStations[0];
    gameState.players[shuffled[0]].ap_move = 2; 
    gameState.players[shuffled[0]].ap_investigate = 0; 
    
    gameState.thiefTraces.push({ 
        stationId: shuffledStations[0], 
        round: gameState.round 
    });

    for (let i = 1; i < shuffled.length; i++) {
        const role = (i === 1) ? 'corrupt_police' : 'police';
        gameState.players[shuffled[i]].role = role;
        gameState.players[shuffled[i]].position = shuffledStations[i]; // Jeder bekommt eine andere zufällige Station
        gameState.players[shuffled[i]].ap_move = 2;
        gameState.players[shuffled[i]].ap_investigate = 2;
    }
    
    io.emit('state_update', gameState); 
    initializeDiamonds();
    startTurn(shuffled[0], 'thief_turn');
}

function initializeDiamonds() {
    const allConns = [...mapData.connections];
    const shuffledConns = allConns.sort(() => 0.5 - Math.random());
    
    gameState.diamonds = [];
    gameState.collectedCount = 0;
    
    for (let i = 0; i < 2; i++) {
        const conn = shuffledConns[i];
        gameState.diamonds.push({
            stationA: conn[0],
            stationB: conn[1],
            isCollected: false
        });
        console.log(`Diamant platziert auf Verbindung: ${conn[0]} - ${conn[1]}`);
    }
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
            cleanupTraces();
            const thief = Object.values(gameState.players).find(p => p.role === 'thief');
            startTurn(thief.id, 'thief_turn');
        }
    }
}

function cleanupTraces() {
    const thief = Object.values(gameState.players).find(p => p.role === 'thief');
    gameState.thiefTraces = gameState.thiefTraces.filter(t => t.round >= gameState.round - 1);
    
    if (thief && thief.position) {
        gameState.thiefTraces = gameState.thiefTraces.filter(t => t.stationId !== thief.position);
        gameState.thiefTraces.push({ 
            stationId: thief.position, 
            round: gameState.round 
        });
    }

    const uniqueTraces = {};
    gameState.thiefTraces.forEach(t => {
        if (!uniqueTraces[t.stationId] || t.round > uniqueTraces[t.stationId].round) {
            uniqueTraces[t.stationId] = t;
        }
    });
    gameState.thiefTraces = Object.values(uniqueTraces);
}

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

function emitState(socket) {
    try {
        const player = gameState.players[socket.id];
        let filteredState = JSON.parse(JSON.stringify(gameState)); 

        if (!player || player.role !== 'thief') {
            delete filteredState.thiefTraces;
        }

        socket.emit('state_update', filteredState);
    } catch (err) {
        console.error("Fehler in emitState:", err);
    }
}

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

    socket.on('reset_game', () => {
        gameState.phase = 'waiting';
        gameState.round = 1;
        gameState.isLocked = false;
        gameState.thiefTraces = [];
        gameState.diamonds = [];
        gameState.collectedCount = 0;
        gameState.winner = null;
        gameState.activePlayerId = null;
        
        Object.values(gameState.players).forEach(p => {
            p.role = null;
            p.position = null;
            p.ap_move = 0;
            p.ap_investigate = 0;
        });

        broadcastState();
    });

    socket.on('move_to', (targetStationId) => {
        const player = gameState.players[socket.id];
        if (!player || gameState.activePlayerId !== socket.id) return;
        
        if (player.ap_move < 1) {
            socket.emit('error_msg', 'Keine Bewegungspunkte mehr übrig!');
            return;
        }

        const previousPosition = player.position;
        const dist = getDistance(player.position, targetStationId);
        
        if (dist === 1) {
            player.position = targetStationId;
            const fromStation = previousPosition;
            player.ap_move -= 1;
            player.turnStartPosition = player.position;
            
            if (player.role === 'thief') {
                const usedEdge = [fromStation, targetStationId].sort();
                const diamond = gameState.diamonds.find(d => {
                    const dEdge = [d.stationA, d.stationB].sort();
                    return !d.isCollected && dEdge[0] === usedEdge[0] && dEdge[1] === usedEdge[1];
                });

                if (diamond) {
                    diamond.isCollected = true;
                    gameState.collectedCount++;
                    console.log(`Dieb hat Diamant gesammelt! (${gameState.collectedCount}/${gameState.requiredDiamonds})`);
                    
                    if (gameState.collectedCount >= gameState.requiredDiamonds) {
                        gameState.phase = 'end';
                        gameState.winner = 'thief_team';
                        gameState.activePlayerId = null;
                    }
                }

                gameState.thiefTraces = gameState.thiefTraces.filter(t => t.stationId !== targetStationId);
                gameState.thiefTraces.push({ 
                    stationId: targetStationId, 
                    round: gameState.round 
                });
                cleanupTraces();
            }

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
        
        const currentStation = player.position;
        const thief = Object.values(gameState.players).find(p => p.role === 'thief');
        
        let result = "Keine Spur";
        const foundTrace = gameState.thiefTraces.find(t => t.stationId === currentStation);
        
        if (foundTrace) {
            if (foundTrace.round === gameState.round) {
                result = "Frische Spur";
            } else if (foundTrace.round === gameState.round - 1) {
                result = "Alte Spur";
            }
        } else if (thief.position === currentStation) {
            result = "Frische Spur";
        }
        
        socket.emit('investigation_result', { stationId: currentStation, result });
        
        if (player.ap_move === 0 && player.ap_investigate === 0) {
            endTurn(socket.id);
        }

        broadcastState();
    });

    socket.on('arrest', () => {
        const player = gameState.players[socket.id];
        if (!player || gameState.activePlayerId !== socket.id || player.role === 'thief') return;
        
        if (player.ap_investigate < 1) {
            socket.emit('error_msg', 'Keine Aktionspunkte mehr für eine Festnahme!');
            return;
        }

        player.ap_investigate -= 1;
        player.turnStartPosition = player.position;
        
        const currentStation = player.position;
        const thief = Object.values(gameState.players).find(p => p.role === 'thief');
        
        if (thief && thief.position === currentStation) {
            gameState.phase = 'end';
            gameState.winner = 'police';
            gameState.activePlayerId = null;
            broadcastState();
        } else {
            socket.emit('investigation_result', { 
                stationId: currentStation, 
                result: "Fehlgeschlagen! Der Dieb ist nicht hier." 
            });
            
            if (player.ap_move === 0 && player.ap_investigate === 0) {
                endTurn(socket.id);
            }
            broadcastState();
        }
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

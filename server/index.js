const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { registerSocketHandlers } = require('./src/socket/socketHandler');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('<h1>Polizei gegen Dieb - Server läuft!</h1><p>Socket.io ist bereit.</p>');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    registerSocketHandlers(io, socket);
});

server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { registerSocketHandlers } = require('./src/socket/socketHandler');

const path = require('path');
const app = express();
app.use(cors());

// Serve static files from the React/Vite app
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/api/health', (req, res) => {
    res.send('<h1>Polizei gegen Dieb - Server läuft!</h1><p>Socket.io ist bereit.</p>');
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
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
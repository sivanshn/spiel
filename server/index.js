const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { registerSocketHandlers } = require('./src/socket/socketHandler');

const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());

const distPath = path.join(__dirname, '../client/dist');
console.log('Checking client dist path:', distPath);
if (fs.existsSync(distPath)) {
    console.log('Client dist folder found.');
    app.use(express.static(distPath));
} else {
    console.error('CRITICAL: Client dist folder NOT found at', distPath);
}

app.get('/api/health', (req, res) => {
    res.send('<h1>Polizei gegen Dieb - Server läuft!</h1><p>Socket.io ist bereit.</p>');
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
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

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
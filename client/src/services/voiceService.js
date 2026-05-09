import { socket } from './socket.js';
import { state } from '../app/state.js';

const peerConnections = {};
let localStream = null;
let isMuted = false;
let voiceReady = false;

const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

/** Mikrofon anfordern und Voice-Chat starten */
export async function initVoiceChat() {
    if (voiceReady) return;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        voiceReady = true;
        console.log('[Voice] Mikrofon aktiv');
    } catch (err) {
        console.warn('[Voice] Mikrofon nicht verfügbar:', err.message);
        return;
    }

    // Eingehende Offer von bestehenden Peers verarbeiten
    socket.on('voice_offer', async ({ fromId, offer }) => {
        console.log('[Voice] Offer von', fromId);
        const pc = getOrCreatePeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice_answer', { targetId: fromId, answer });
    });

    // Eingehende Answer verarbeiten
    socket.on('voice_answer', async ({ fromId, answer }) => {
        const pc = peerConnections[fromId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE-Kandidaten verarbeiten
    socket.on('voice_ice_candidate', async ({ fromId, candidate }) => {
        const pc = peerConnections[fromId];
        if (pc && candidate) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
        }
    });

    // Neuer Peer hat die Lobby betreten → wir senden ein Offer
    socket.on('voice_peer_joined', async ({ peerId }) => {
        console.log('[Voice] Neuer Peer beigetreten:', peerId);
        await connectToPeer(peerId);
    });

    // Peer hat Lobby verlassen → Verbindung trennen
    socket.on('voice_peer_left', ({ peerId }) => {
        console.log('[Voice] Peer verlassen:', peerId);
        disconnectFromPeer(peerId);
    });

    // Stumm-Status eines anderen Peers empfangen
    socket.on('voice_mute_update', ({ fromId, isMuted: peerMuted }) => {
        updatePeerMuteUI(fromId, peerMuted);
    });
}

/** WebRTC-Verbindung zu einem Peer aufbauen (wir sind Initiator) */
export async function connectToPeer(peerId) {
    if (peerConnections[peerId] || !voiceReady) return;
    console.log('[Voice] Verbinde mit Peer:', peerId);

    const pc = getOrCreatePeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice_offer', { targetId: peerId, offer });
}

function getOrCreatePeerConnection(peerId) {
    if (peerConnections[peerId]) return peerConnections[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections[peerId] = pc;

    // Lokales Audio hinzufügen
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // Remote Audio abspielen
    pc.ontrack = (event) => {
        let audioEl = document.getElementById(`voice-audio-${peerId}`);
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `voice-audio-${peerId}`;
            audioEl.autoplay = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
        }
        audioEl.srcObject = event.streams[0];
    };

    // ICE-Kandidaten senden
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('voice_ice_candidate', { targetId: peerId, candidate: event.candidate });
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            disconnectFromPeer(peerId);
        }
    };

    return pc;
}

/** Verbindung zu einem Peer trennen */
export function disconnectFromPeer(peerId) {
    const pc = peerConnections[peerId];
    if (pc) { pc.close(); delete peerConnections[peerId]; }

    const audioEl = document.getElementById(`voice-audio-${peerId}`);
    if (audioEl) audioEl.remove();

    updatePeerMuteUI(peerId, null); // Indicator entfernen
}

/** Alle Voice-Verbindungen trennen (beim Verlassen der Lobby) */
export function disconnectAll() {
    Object.keys(peerConnections).forEach(disconnectFromPeer);
}

/** Mikrofon stummschalten / aktivieren */
export function toggleMute() {
    if (!localStream) return isMuted;
    isMuted = !isMuted;

    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });

    // Anderen Spielern bescheid geben
    if (state.currentLobby) {
        socket.emit('voice_mute_toggle', { lobbyId: state.currentLobby.id, isMuted });
    }

    return isMuted;
}

export function getMuteState() { return isMuted; }
export function isVoiceReady() { return voiceReady; }

/** Stumm-Status-Anzeige eines anderen Spielers aktualisieren */
function updatePeerMuteUI(peerId, isMuted) {
    const indicator = document.querySelector(`[data-peer-id="${peerId}"] .voice-indicator`);
    if (!indicator) return;
    if (isMuted === null) {
        indicator.remove();
        return;
    }
    indicator.textContent = isMuted ? '🔇' : '🎤';
    indicator.className = `voice-indicator ${isMuted ? 'muted' : 'active'}`;
}

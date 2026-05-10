export function getRoleColor(role) {
    if (role === 'thief') return '#f43f5e';
    if (role === 'police') return '#3b82f6';
    if (role === 'corrupt_police') return '#a855f7';
    return '#94a3b8';
}

export function getRoleIcon(role) {
    if (role === 'thief') return '/thief_icon.png';
    if (role === 'police') return '/police_icon.png';
    if (role === 'corrupt_police') return '/corrupt_icon.png';
    return '';
}

export function translateRole(role, lang = 'de') {
    const roles = {
        de: { 'thief': 'Dieb', 'police': 'Polizei', 'corrupt_police': 'Korrupter Polizist', 'unknown': 'Unbekannt' },
        en: { 'thief': 'Thief', 'police': 'Police', 'corrupt_police': 'Corrupt Police', 'unknown': 'Unknown' }
    };
    return (roles[lang] && roles[lang][role]) || role;
}

export function getAvatarUrl(avatarId) {
    const oldDefaults = ['goat', 'monkey', 'cat', 'dog', 'fox', 'panda', 'default_avatar'];
    if (!avatarId || oldDefaults.includes(avatarId)) {
        return '/default_avatar.png';
    }
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarId}`;
}

export function translatePhase(phase) {
    const phases = { 'waiting': 'Lobby', 'thief_turn': 'Dieb am Zug', 'police_turn': 'Polizei am Zug', 'end': 'Spiel Ende' };
    return phases[phase] || phase;
}

export function getDistance(map, startId, endId) {
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

const mapData = require('../game/mapData');

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

module.exports = { getDistance };

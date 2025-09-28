import { db } from './firebase-config.js';

// The main initialization function for the leaderboard module
export function initLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    const loading = document.getElementById('leaderboard-loading');

    if (!leaderboardList) {
        console.error('Elemento del leaderboard no encontrado.');
        return;
    }

    const q = db.collection('users').orderBy('score', 'desc').limit(10);

    q.onSnapshot(snapshot => {
        if (loading) loading.style.display = 'none';

        if (snapshot.empty) {
            leaderboardList.innerHTML = '<li>¡Aún no hay puntajes! Sé el primero.</li>';
            return;
        }

        leaderboardList.innerHTML = '';
        let rank = 1;
        snapshot.forEach(doc => {
            leaderboardList.appendChild(renderLeaderboardItem(doc.data(), rank++));
        });

    }, error => {
        console.error("Error al cargar el Salón de la Fama: ", error);
        if (loading) loading.textContent = 'Error al cargar el Salón de la Fama.';
    });
}

function renderLeaderboardItem(data, rank) {
    const li = document.createElement('li');

    const displayName = escapeHTML(data.displayName || 'Usuario Anónimo');
    const score = data.score || 0;
    const photoURL = data.photoURL || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23${hashCode(data.uid || 'default')}"/><text x="50%" y="50%" style="fill:%23fff;font-size:20px;font-family:sans-serif;text-anchor:middle;dominant-baseline:central">${escapeHTML(data.displayName[0] || '?')}</text></svg>`;

    li.innerHTML = `
        <span class="leaderboard-rank">#${rank}</span>
        <img src="${photoURL}" alt="Avatar de ${displayName}" class="leaderboard-avatar">
        <span class="player-name">${displayName}</span>
        <span class="player-score">${score}</span>
    `;
    return li;
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color.substring(1, 7);
}

// Add styles for the avatar
const style = document.createElement('style');
style.innerHTML = `
    li {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .leaderboard-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
    .leaderboard-rank {
        font-family: var(--font-display);
        font-size: 1.2rem;
        color: var(--text-secondary-color);
        width: 40px;
        text-align: center;
    }
    .player-name {
        flex-grow: 1;
    }
`;
document.head.appendChild(style);

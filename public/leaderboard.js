
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase-config.js'; // Import centralized db

const leaderboardCollection = collection(db, 'leaderboard');

// --- Public Function to Submit Score ---
export async function submitPlayerScore(name, score, rank) {
    if (!name || typeof score !== 'number' || !rank) {
        throw new Error("Datos de jugador inválidos para enviar.");
    }
    try {
        await addDoc(leaderboardCollection, {
            name: name,
            score: score,
            rank: rank,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error al enviar la puntuación: ", error);
        throw error; 
    }
}


// --- Leaderboard Rendering Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const leaderboardList = document.getElementById('leaderboard-list');
    const loading = document.getElementById('leaderboard-loading');
    const noScoresMsg = document.getElementById('no-scores-message');

    // Query to get top 5 scores, ordered by score descending
    const q = query(leaderboardCollection, orderBy('score', 'desc'), limit(5));

    onSnapshot(q, (snapshot) => {
        if (loading) loading.style.display = 'none';

        if (snapshot.empty) {
            if (noScoresMsg) noScoresMsg.style.display = 'block';
            if (leaderboardList) leaderboardList.innerHTML = '';
        } else {
            if (noScoresMsg) noScoresMsg.style.display = 'none';
            if (leaderboardList) {
                leaderboardList.innerHTML = '';
                snapshot.forEach(doc => {
                    leaderboardList.appendChild(renderLeaderboardItem(doc));
                });
            }
        }
    }, (error) => {
        console.error("Error al cargar el Salón de la Fama: ", error);
        if (loading) {
            loading.innerHTML = '<p>Error al cargar el Salón de la Fama. Por favor, recarga la página.</p>';
        }
    });
});

function renderLeaderboardItem(doc) {
    const data = doc.data();
    const li = document.createElement('li');
    li.className = 'leaderboard-item';

    li.innerHTML = `
        <div class="leaderboard-player">
            <div class="player-name">${escapeHTML(data.name)}</div>
            <div class="player-rank">Rango: ${escapeHTML(data.rank)}</div>
        </div>
        <div class="leaderboard-score">${data.score}</div>
    `;
    return li;
}

function escapeHTML(str) {
    return str.replace(/[&<>"'/]/g, function (s) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        return entityMap[s];
    });
}

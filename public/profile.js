import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// Function to show a specific section and hide others
function showSection(sectionId) {
    const sections = document.querySelectorAll('main > section');
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

async function renderProgressChart() {
    const user = getCurrentUser();
    if (!user) return;

    const scoreHistoryRef = db.collection('users').doc(user.uid).collection('scoreHistory').orderBy('timestamp', 'asc');
    const snapshot = await scoreHistoryRef.get();

    if (snapshot.empty) {
        return; // No history to show
    }

    const labels = [];
    const data = [];

    snapshot.forEach(doc => {
        const record = doc.data();
        labels.push(record.timestamp.toDate().toLocaleDateString());
        data.push(record.score);
    });

    const ctx = document.getElementById('progress-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Puntuación a lo largo del tiempo',
                data: data,
                borderColor: 'var(--accent-neon-cyan)',
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Fetches and renders the user's profile data
async function loadProfileData() {
    const user = getCurrentUser();
    if (!user) return;

    const profileContainer = document.getElementById('profile-container');
    profileContainer.innerHTML = '<div class="loading-spinner">Cargando perfil...</div>';

    const userRef = db.collection('users').doc(user.uid);
    
    try {
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            profileContainer.innerHTML = `
                <div class="profile-card">
                    <img src="${data.photoURL}" alt="Avatar" class="profile-avatar">
                    <h3 class="profile-name">${data.displayName}</h3>
                    <div class="profile-stats">
                        <div class="stat-item">
                            <span class="stat-label">Rango</span>
                            <span class="stat-value">${data.rank || 'No asignado'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Puntuación Máxima</span>
                            <span class="stat-value">${data.score || 0}</span>
                        </div>
                    </div>
                    <div class="chart-container" style="margin-top: 2rem;">
                        <canvas id="progress-chart"></canvas>
                    </div>
                    <p class="profile-member-since">Miembro desde: ${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                    <button id="close-profile-btn" class="btn btn-primary" style="margin-top: 1.5rem;">Cerrar</button>
                </div>
            `;
            document.getElementById('close-profile-btn').addEventListener('click', () => {
                window.location.reload();
            });

            renderProgressChart(); // Call the new function
        } else {
            profileContainer.innerHTML = '<p>No se encontró el perfil de usuario.</p>';
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        profileContainer.innerHTML = '<p>Error al cargar el perfil.</p>';
    }
}

// Main function to be called from other modules
export function initProfile() {
    // This function is called to ensure event listeners are set up.
    // The actual listeners are now added in auth.js where the elements are created.
}

// This function will be called by the event listener in auth.js
export function showProfileSection() {
    showSection('profile-section');
    loadProfileData();
}

// Add styles for the profile section
const style = document.createElement('style');
style.innerHTML = `
    .profile-card {
        max-width: 500px;
        margin: 0 auto;
        background-color: var(--surface-color);
        padding: 2rem;
        border-radius: var(--border-radius);
        border: 1px solid var(--border-color);
        text-align: center;
        box-shadow: var(--shadow-lg);
    }
    .profile-avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid var(--accent-neon-cyan);
        margin-bottom: 1rem;
    }
    .profile-name {
        font-family: var(--font-display);
        font-size: 2rem;
        color: var(--primary-color);
        margin-bottom: 1.5rem;
    }
    .profile-stats {
        display: flex;
        justify-content: space-around;
        margin-bottom: 1.5rem;
    }
    .stat-item {
        display: flex;
        flex-direction: column;
    }
    .stat-label {
        font-size: 0.9rem;
        color: var(--text-secondary-color);
        text-transform: uppercase;
    }
    .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        font-family: var(--font-display);
        color: var(--text-color);
    }
    .profile-member-since {
        font-size: 0.9rem;
        color: var(--text-secondary-color);
    }
`;
document.head.appendChild(style);
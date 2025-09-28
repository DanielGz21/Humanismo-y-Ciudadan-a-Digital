import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './notifications.js';
import { showAvatarSelection } from './avatars.js'; // Importamos la nueva función

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

// NUEVA FUNCIÓN: Maneja la lógica para habilitar la edición del nombre
function enableNameEditing(data) {
    const nameElement = document.querySelector('.profile-name');
    const nameContainer = nameElement.parentElement;

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-name-container';
    editContainer.innerHTML = `
        <input type="text" id="edit-name-input" class="edit-name-input" value="${data.displayName}">
        <button id="save-name-btn" class="btn btn-primary">Guardar</button>
    `;

    nameContainer.replaceChild(editContainer, nameElement);
    
    // Move the edit button inside the new container to replace it as well.
    const editButton = document.getElementById('edit-name-btn');
    if(editButton) editButton.style.display = 'none';


    document.getElementById('save-name-btn').addEventListener('click', async () => {
        const newName = document.getElementById('edit-name-input').value.trim();
        if (newName && newName !== data.displayName) {
            await updateUserProfileName(newName);
        } else {
            loadProfileData();
        }
    });
}

// NUEVA FUNCIÓN: Actualiza el nombre del usuario en Firebase Auth y Firestore
async function updateUserProfileName(newName) {
    const user = getCurrentUser();
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);

    try {
        await user.updateProfile({
            displayName: newName
        });

        await userRef.update({
            displayName: newName
        });

        showToast('¡Nombre actualizado con éxito!', 'success');
        loadProfileData(); 
        setTimeout(() => window.location.reload(), 1500); 
    } catch (error) {
        console.error("Error al actualizar el nombre:", error);
        showToast('No se pudo actualizar el nombre.', 'error');
    }
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
                    <img src="${data.photoURL}" alt="Avatar" class="profile-avatar" id="avatar-btn" style="cursor: pointer;" title="Haz clic para cambiar tu avatar">
                    <div class="profile-name-container">
                         <h3 class="profile-name">${data.displayName}</h3>
                         <button id="edit-name-btn" class="btn-icon" title="Editar nombre"><i class="fas fa-pencil-alt"></i></button>
                    </div>
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
            
            document.getElementById('edit-name-btn').addEventListener('click', () => enableNameEditing(data));
            
            // NUEVO: Listener para el botón del avatar
            document.getElementById('avatar-btn').addEventListener('click', showAvatarSelection);

            renderProgressChart();
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
    .profile-name-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .profile-name {
        font-family: var(--font-display);
        font-size: 2rem;
        color: var(--primary-color);
        margin: 0;
    }
    .btn-icon {
        background: none;
        border: none;
        color: var(--text-secondary-color);
        font-size: 1.2rem;
        cursor: pointer;
        transition: color var(--transition-speed);
    }
    .btn-icon:hover {
        color: var(--accent-neon-cyan);
    }
    .edit-name-container {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    .edit-name-input {
        flex-grow: 1;
        background-color: var(--background-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 0.5rem;
        font-size: 1.2rem;
        color: var(--text-color);
        font-family: var(--font-primary);
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
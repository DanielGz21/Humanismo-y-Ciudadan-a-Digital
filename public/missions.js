import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

let unsubscribeMissionListener = null;

// Inicializa el componente de la misión diaria
export function initMissions() {
    const user = getCurrentUser();
    if (!user) {
        const missionContainer = document.getElementById('mission-container');
        if(missionContainer) missionContainer.style.display = 'none';
        return;
    };

    const missionId = new Date().toISOString().split('T')[0];
    const missionRef = db.collection('daily_missions').doc(missionId);

    missionRef.get().then(doc => {
        if (doc.exists) {
            const mission = doc.data();
            const progressRef = db.collection('users').doc(user.uid).collection('mission_progress').doc(missionId);
            
            unsubscribeMissionListener = progressRef.onSnapshot(progressDoc => {
                const progress = progressDoc.exists ? progressDoc.data() : { progress: 0, completed: false };
                renderMissionUI(mission, progress);
            });
        } else {
            const missionContainer = document.getElementById('mission-container');
            if(missionContainer) missionContainer.style.display = 'none';
        }
    });
}

// Renderiza la interfaz de la misión
function renderMissionUI(mission, progress) {
    const missionContainer = document.getElementById('mission-container');
    if (!missionContainer) return;

    missionContainer.style.display = 'block';

    const progressPercent = Math.min((progress.progress / mission.goal) * 100, 100);

    let html = `
        <h4>Misión Diaria</h4>
        <p class="mission-description">${mission.description}</p>
        <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
        <p class="mission-progress-text">${progress.progress || 0} / ${mission.goal}</p>
    `;

    if (progress.completed) {
        html += `<p class="mission-complete">¡Completada! +${mission.reward} puntos ganados.</p>`;
    }

    missionContainer.innerHTML = html;
}

// Función para detener el listener cuando el usuario cierra sesión
export function cleanupMissions() {
    if (unsubscribeMissionListener) {
        unsubscribeMissionListener();
        unsubscribeMissionListener = null;
    }
}
import { initUI } from './ui.js';
import { initGame } from './script.js';
import { initQuizSelection } from './quiz-selection.js';
import { initLeaderboard } from './leaderboard.js';
import { initComments } from './comments.js';
import { initAuth, isCurrentUserAdmin } from './auth.js'; // isCurrentUserAdmin ahora es async
import { initProfile } from './profile.js';
import { initAdminPanel } from './admin.js';
import { initMissions, cleanupMissions } from './missions.js';

// This is the main entry point of the application.

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    console.log("App cargada. Esperando estado de autenticación...");

    // initAuth configura el listener onAuthStateChanged
    initAuth(async (user) => { // La función callback ahora es asíncrona
        if (user) {
            console.log("Usuario confirmado. Inicializando módulos...");
            
            initQuizSelection();
            initGame(user);
            initLeaderboard();
            initComments(user);
            initProfile();
            initMissions();

            // --- LÓGICA DE ADMINISTRADOR ACTUALIZADA ---
            // Esperamos a que la función asíncrona determine si es admin
            if (await isCurrentUserAdmin()) {
                const adminLink = document.getElementById('admin-link-container');
                if(adminLink) adminLink.style.display = 'list-item';
                initAdminPanel();
            }

        } else {
            console.log("Usuario no autenticado. Mostrando solo la opción de login.");
            cleanupMissions();
            initGame(null);
        }
    });
});
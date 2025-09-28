import { initUI } from './ui.js';
import { auth } from './firebase-config.js';
import { initGame } from './script.js';
import { initQuizSelection } from './quiz-selection.js';
import { initLeaderboard } from './leaderboard.js';
import { initComments } from './comments.js';
import { initAuth } from './auth.js';

// This is the main entry point of the application.

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    console.log("App cargada. Esperando estado de autenticación...");

    // Initialize authentication logic first.
    // initAuth will set up the onAuthStateChanged listener.
    initAuth((user) => {
        // This callback is executed only when the auth state is known.
        if (user) {
            console.log("Usuario confirmado. Inicializando módulos...");
            // If the user is logged in, initialize all data-dependent modules.
            initQuizSelection(); // Show quiz selection screen
            initGame(user); // Set up game event listeners
            initLeaderboard();
            initComments(user);
        } else {
            console.log("Usuario no autenticado. Mostrando solo la opción de login.");
            // If no user, some modules might not need to be initialized
            // or can be initialized in a "logged-out" state.
            initGame(null);
        }
    });
});

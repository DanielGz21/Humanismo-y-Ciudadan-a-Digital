import { auth, db } from './firebase-config.js';
import { showProfileSection } from './profile.js';
import { showToast } from './notifications.js';

let currentUser = null;
const ADMIN_UIDS = ['D4QP7hTeRERO4ZLC6DD532fyIfY2'];

// This is the new main initialization function for the auth module.
export function initAuth(onAuthStateReady) {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            renderLoggedIn(user);
        } else {
            renderLoggedOut();
        }
        // This callback notifies the main app that the auth state is known.
        if (onAuthStateReady) {
            onAuthStateReady(user);
        }
    });
}

export function getCurrentUser() {
    return currentUser;
}

export function isCurrentUserAdmin() {
    return currentUser && ADMIN_UIDS.includes(currentUser.uid);
}

function renderLoggedIn(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    authContainer.innerHTML = `
        <a href="#" id="profile-link" class="user-profile">
            <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
            <span class="user-name">${user.displayName}</span>
        </a>
        <button id="logout-btn" class="btn btn-secondary">Salir</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', signOutUser);
    document.getElementById('profile-link').addEventListener('click', (e) => {
        e.preventDefault();
        showProfileSection();
    });
}

function renderLoggedOut() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    authContainer.innerHTML = `<button id="login-btn" class="btn btn-primary">Iniciar Sesión</button>`;
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
}

function showLoginModal() {
    // Check if modal already exists
    if (document.getElementById('login-modal')) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Elige un método de inicio de sesión</h2>
            <div class="modal-buttons">
                <button id="google-login-btn" class="btn btn-primary">Iniciar con Google</button>
                <button id="facebook-login-btn" class="btn btn-primary">Iniciar con Facebook</button>
                <button id="twitter-login-btn" class="btn btn-primary">Iniciar con Twitter</button>
                <button id="microsoft-login-btn" class="btn btn-primary">Iniciar con Microsoft</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('google-login-btn').addEventListener('click', () => { signInWithProvider('google'); });
    document.getElementById('facebook-login-btn').addEventListener('click', () => { signInWithProvider('facebook'); });
    document.getElementById('twitter-login-btn').addEventListener('click', () => { signInWithProvider('twitter'); });
    document.getElementById('microsoft-login-btn').addEventListener('click', () => { signInWithProvider('microsoft'); });
}

function signInWithProvider(providerName) {
    let provider;
    switch (providerName) {
        case 'google':
            provider = new firebase.auth.GoogleAuthProvider();
            break;
        case 'facebook':
            provider = new firebase.auth.FacebookAuthProvider();
            break;
        case 'twitter':
            provider = new firebase.auth.TwitterAuthProvider();
            break;
        case 'microsoft':
            provider = new firebase.auth.MicrosoftAuthProvider();
            break;
        default:
            showToast('Proveedor de inicio de sesión no válido', 'error');
            return;
    }

    auth.signInWithPopup(provider)
        .then(result => {
            // Close the modal on successful login
            const modal = document.getElementById('login-modal');
            if (modal) {
                modal.style.display = 'none';
            }

            const isNewUser = result.additionalUserInfo.isNewUser;
            if (isNewUser) {
                showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
            }
            createUserProfileIfNotExists(result.user);
        })
        .catch(error => {
            console.error(`Error durante el inicio de sesión con ${providerName}:`, error.message);
            showToast(`Error al iniciar sesión con ${providerName}`, 'error');
        });
}

function signOutUser() {
    auth.signOut().then(() => {
        showToast('Has cerrado sesión.', 'info');
        setTimeout(() => window.location.reload(), 1000);
    }).catch(error => console.error('Error durante el cierre de sesión:', error.message));
}

function createUserProfileIfNotExists(user) {
    const userRef = db.collection('users').doc(user.uid);
    userRef.get().then(doc => {
        if (!doc.exists) {
            userRef.set({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                rank: 'Novato',
                score: 0,
                currentQuestionIndex: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

// Inject styles once on module load
const style = document.createElement('style');
style.innerHTML = `
    .user-profile { display: flex; align-items: center; gap: 1rem; text-decoration: none; }
    .user-avatar { width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--accent-neon-cyan); }
    .user-name { font-weight: 600; color: var(--text-color); }
    .btn-secondary { border-color: var(--text-secondary-color); color: var(--text-secondary-color); box-shadow: 0 0 5px var(--text-secondary-color), inset 0 0 5px var(--text-secondary-color); }
    .btn-secondary:hover { background-color: var(--text-secondary-color); color: var(--background-color); box-shadow: 0 0 15px var(--text-secondary-color); }
    .modal {
        display: none; /* Hidden by default */
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.6);
        justify-content: center;
        align-items: center;
    }
    .modal-content {
        background-color: var(--background-color);
        padding: 2rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        width: 90%;
        max-width: 500px;
        text-align: center;
        position: relative;
    }
    .close-btn {
        color: var(--text-secondary-color);
        position: absolute;
        top: 1rem;
        right: 1.5rem;
        font-size: 2rem;
        font-weight: bold;
        cursor: pointer;
    }
    .close-btn:hover {
        color: var(--text-color);
    }
    .modal-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
    }
`;
document.head.appendChild(style);
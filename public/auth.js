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
    document.getElementById('login-btn').addEventListener('click', signInWithGoogle);
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            const isNewUser = result.additionalUserInfo.isNewUser;
            if (isNewUser) {
                showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
            }
            createUserProfileIfNotExists(result.user);
        })
        .catch(error => {
            console.error('Error durante el inicio de sesión:', error.message);
            showToast('Error al iniciar sesión', 'error');
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
                rank: 'Novato Temporal',
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
`;
document.head.appendChild(style);
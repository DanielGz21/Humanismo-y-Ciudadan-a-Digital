import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { auth, db } from './firebase-config.js'; // Import centralized auth and db
import { init as initGame, showMissionBriefing } from './script.js';

// --- Tone.js Audio Context Resume ---
import 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';

// --- Local Auth State ---
let currentUser = null;
let isUserAdmin = false;
let gameInitialized = false;

const provider = new GoogleAuthProvider();

// --- Auth Public API ---
export const signInWithGoogle = () => {
    // Resume audio context on user gesture
    if (Tone.context.state !== 'running') {
        Tone.context.resume();
    }
    signInWithPopup(auth, provider).catch(err => console.error("Sign in error:", err));
};

export const logOut = () => {
    signOut(auth).catch(err => console.error("Sign out error:", err));
};

export const getCurrentUser = () => currentUser;
export const isCurrentUserAdmin = () => isUserAdmin;

// --- Auth State Management & Firestore Sync ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            isUserAdmin = false;
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                isAdmin: false,
                createdAt: new Date()
            });
        } else {
            isUserAdmin = userDoc.data().isAdmin === true;
            await setDoc(userRef, { 
                displayName: user.displayName, 
                photoURL: user.photoURL, 
                lastLogin: new Date() 
            }, { merge: true });
        }
        currentUser = user;
    } else {
        currentUser = null;
        isUserAdmin = false;
    }
    updateUIAfterAuthStateChange(user);
});

// --- UI Update Function --- 
function updateUIAfterAuthStateChange(user) {
    const welcomeGate = document.getElementById('welcome-gate');
    const mainContent = document.getElementById('main-content');
    const userProfileEl = document.getElementById('user-profile');
    const signInBtn = document.getElementById('signin-btn');
    const commentTextarea = document.getElementById('comment-text');
    const commentSubmitBtn = document.querySelector('#comment-form button');

    if (user) {
        // User is signed in
        welcomeGate.classList.add('hidden');
        mainContent.classList.add('visible');
        showMissionBriefing(); // Show mission briefing section

        if (!gameInitialized) {
            initGame();
            gameInitialized = true;
        }

        userProfileEl.innerHTML = `
            <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
            <span class="user-name">${user.displayName}</span>
            <button id="signout-btn" class="btn auth-btn">Salir</button>
        `;
        userProfileEl.style.display = 'flex';
        if (signInBtn) signInBtn.style.display = 'none';
        
        const signOutBtn = document.getElementById('signout-btn');
        if (signOutBtn) signOutBtn.addEventListener('click', logOut);
        
        if(commentTextarea) commentTextarea.placeholder = "Deja tu huella en el tiempo...";
        if(commentSubmitBtn) commentSubmitBtn.disabled = false;

    } else {
        // User is signed out
        welcomeGate.classList.remove('hidden');
        mainContent.classList.remove('visible');
        gameInitialized = false;

        userProfileEl.style.display = 'none';
        if (signInBtn) signInBtn.style.display = 'block';
        
        if(commentTextarea) commentTextarea.placeholder = "Inicia sesión para dejar un comentario.";
        if(commentSubmitBtn) commentSubmitBtn.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', signInWithGoogle);
    }

    const signInBtn = document.getElementById('signin-btn');
    if (signInBtn) {
        signInBtn.addEventListener('click', signInWithGoogle);
    }

    // Initial UI check
    updateUIAfterAuthStateChange(auth.currentUser);
});
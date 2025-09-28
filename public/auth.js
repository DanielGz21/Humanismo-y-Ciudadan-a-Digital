
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyCCwYwEHGqy7bee1KiCwkKTJh6YZettHIM",
    authDomain: "chronotechcomments.firebaseapp.com",
    projectId: "chronotechcomments",
    storageBucket: "chronotechcomments.appspot.com",
    messagingSenderId: "651005636861",
    appId: "1:651005636861:web:ed73d2ec131535fd6e0e94",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- Local Auth State ---
let currentUser = null;
let isUserAdmin = false;

// --- Auth Public API ---
export const signInWithGoogle = () => signInWithPopup(auth, provider).catch(err => console.error(err));
export const logOut = () => signOut(auth).catch(err => console.error(err));
export const getCurrentUser = () => currentUser;
export const isCurrentUserAdmin = () => isUserAdmin;

// --- Auth State Management & Firestore Sync ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // First-time login: create user profile in Firestore
            isUserAdmin = false;
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                isAdmin: false, // Default role
                createdAt: new Date()
            });
        } else {
            // Returning user: check for admin role and update details
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
    const userProfileEl = document.getElementById('user-profile');
    const signInBtn = document.getElementById('signin-btn');
    const commentTextarea = document.getElementById('comment-text');
    const commentSubmitBtn = document.querySelector('#comment-form button');

    if (user) {
        // User is signed in
        userProfileEl.innerHTML = `
            <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
            <span class="user-name">${user.displayName}</span>
            <button id="signout-btn" class="btn auth-btn">Salir</button>
        `;
        userProfileEl.style.display = 'flex';
        signInBtn.style.display = 'none';
        document.getElementById('signout-btn').addEventListener('click', logOut);
        
        commentTextarea.placeholder = "Deja tu huella en el tiempo...";
        commentSubmitBtn.disabled = false;

    } else {
        // User is signed out
        userProfileEl.style.display = 'none';
        signInBtn.style.display = 'block';
        
        commentTextarea.placeholder = "Inicia sesión para dejar un comentario.";
        commentSubmitBtn.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signin-btn').addEventListener('click', signInWithGoogle);
    updateUIAfterAuthStateChange(auth.currentUser); // Initial UI check
});

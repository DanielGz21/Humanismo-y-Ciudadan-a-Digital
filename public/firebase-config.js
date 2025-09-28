
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
// IMPORTANT: This should be the only place this config object exists.
const firebaseConfig = {
    apiKey: "AIzaSyCCwYwEHGqy7bee1KiCwkKTJh6YZettHIM",
    authDomain: "chronotechcomments.firebaseapp.com",
    projectId: "chronotechcomments",
    storageBucket: "chronotechcomments.appspot.com",
    messagingSenderId: "651005636861",
    appId: "1:651005636861:web:ed73d2ec131535fd6e0e94",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the necessary Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

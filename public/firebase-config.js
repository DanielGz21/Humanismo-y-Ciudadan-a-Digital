// TODO: Reemplaza este objeto con tu propia configuración de Firebase.
// Ve a la consola de Firebase -> Configuración del proyecto -> Tus apps -> App web.
// Copia el objeto de configuración y pégalo aquí.
const firebaseConfig = {
  apiKey: "AIzaSyCCwYwEHGqy7bee1KiCwkKTJh6YZettHIM",
  authDomain: "chronotechcomments.firebaseapp.com",
  projectId: "chronotechcomments",
  storageBucket: "chronotechcomments.firebasestorage.app",
  messagingSenderId: "651005636861",
  appId: "1:651005636861:web:ed73d2ec131535fd6e0e94"
};

// Inicializa Firebase
const app = firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();
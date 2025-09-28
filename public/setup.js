import { db, auth } from './firebase-config.js';

console.log("Módulo setup.js cargado. Esperando estado de autenticación...");

// We will only run the script logic once we have a confirmed user.
const unsubscribe = auth.onAuthStateChanged(user => {
    if (user) {
        // Now we have a user, we can unsubscribe from the listener to prevent this from running again.
        unsubscribe();

        console.log(`Usuario autenticado (${user.displayName}). Intentando escribir preguntas...`);

        const questionsRef = db.collection('questions').doc('generations-quiz');

        questionsRef.get().then(doc => {
            if (doc.exists) {
                console.log("Las preguntas ya existen en Firestore. No se requiere ninguna acción.");
                alert("Información: Las preguntas ya existen en la base de datos. Ya puedes eliminar la etiqueta <script> de setup.js en tu index.html.");
            } else {
                // If they don't exist, create them.
                const questionsData = [
                    {
                        question: "¿Qué generación se caracteriza por su escepticismo y por haber crecido con los inicios de la era digital (PCs, videojuegos)?",
                        options: ["Baby Boomers", "Generación X", "Millennials", "Generación Z"],
                        answer: "Generación X"
                    },
                    {
                        question: "¿Cuál de estas tecnologías fue disruptiva para la Generación Silenciosa?",
                        options: ["La radio", "El smartphone", "Internet", "La televisión a color"],
                        answer: "La radio"
                    },
                    {
                        question: "Los Millennials son considerados los primeros 'nativos digitales'. ¿Qué plataforma social fue icónica para ellos en sus inicios?",
                        options: ["TikTok", "Facebook", "Instagram", "Snapchat"],
                        answer: "Facebook"
                    },
                    {
                        question: "¿Qué concepto describe mejor la brecha de habilidades entre quienes usan tecnología y quienes no?",
                        options: ["Brecha digital", "Analfabetismo digital", "Ciudadanía digital", "Humanismo digital"],
                        answer: "Brecha digital"
                    }
                ];

                questionsRef.set({ questionSet: questionsData })
                    .then(() => {
                        console.log("¡ÉXITO! Las preguntas han sido cargadas a Firestore.");
                        alert("¡ÉXITO! Las preguntas se cargaron en la base de datos. Por favor, elimina la etiqueta <script> de setup.js en tu index.html para no volver a cargarlas.");
                    })
                    .catch(error => {
                        console.error("Error al escribir las preguntas: ", error);
                        alert("Error al escribir las preguntas. Revisa la consola. ¿Están bien las reglas de seguridad?");
                    });
            }
        });
    } else {
        // This will run on initial load when the user is not yet authenticated.
        console.log("Setup script: aún no hay un usuario autenticado.");
    }
});

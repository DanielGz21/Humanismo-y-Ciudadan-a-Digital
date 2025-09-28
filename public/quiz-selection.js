import { db } from './firebase-config.js';
import { startGame } from './script.js';

export function initQuizSelection() {
    const quizListContainer = document.getElementById('quiz-list-container');
    const quizSelectionSection = document.getElementById('quiz-selection');
    const heroSection = document.getElementById('hero');

    if (!heroSection || !quizSelectionSection || !quizListContainer) {
        console.error("Error: No se encontraron los elementos de la sección de selección de quiz.");
        return;
    }

    // Show the quiz selection screen
    heroSection.style.display = 'none';
    quizSelectionSection.style.display = 'block';

    db.collection('quizzes').get().then(querySnapshot => {
        if (querySnapshot.empty) {
            quizListContainer.innerHTML = '<p>No hay juegos disponibles en este momento.</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const quiz = doc.data();
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';
            quizCard.innerHTML = `
                <h3>${quiz.title}</h3>
                <p>${quiz.description}</p>
                <button class="btn btn-primary">Jugar</button>
            `;
            quizCard.querySelector('button').addEventListener('click', () => {
                quizSelectionSection.style.display = 'none';
                startGame(doc.id); // Pass the quiz ID to startGame
            });
            quizListContainer.appendChild(quizCard);
        });
    }).catch(error => {
        console.error("Error fetching quizzes: ", error);
        quizListContainer.innerHTML = '<p>Error al cargar los juegos.</p>';
    });
}

const style = document.createElement('style');
style.innerHTML = `
    #quiz-list-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        justify-content: center;
    }
    .quiz-card {
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 1.5rem;
        width: 300px;
        text-align: center;
        box-shadow: var(--shadow-md);
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    .quiz-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
    }
    .quiz-card h3 {
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--primary-color);
        margin-bottom: 1rem;
    }
    .quiz-card p {
        color: var(--text-secondary-color);
        margin-bottom: 1.5rem;
    }
`;
document.head.appendChild(style);
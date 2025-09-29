import { db } from './firebase-config.js';
import { startGame } from './script.js';
import { getCurrentUser } from './auth.js';

function renderQuizCards(quizzes, containerElement) {
    containerElement.innerHTML = ''; // Clear existing content
    if (quizzes.length === 0) {
        containerElement.innerHTML = '<p>No hay quizzes disponibles en este momento.</p>';
        return;
    }

    quizzes.forEach(quizDoc => {
        const quiz = quizDoc.data();
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.innerHTML = `
            <h3>${quiz.title}</h3>
            <p>${quiz.description}</p>
            <button class="btn btn-primary">Jugar</button>
        `;
        quizCard.querySelector('button').addEventListener('click', () => {
            document.getElementById('quiz-selection').style.display = 'none';
            startGame(quizDoc.id); // Pass the quiz ID to startGame
        });
        containerElement.appendChild(quizCard);
    });
}

const WEAK_TOPIC_THRESHOLD = 70; // Define a threshold for identifying weak topics

function getRecommendedQuizzes(allQuizzes, userData) {
    if (!userData || !userData.quizHistory) {
        // If no user data or no quiz history, recommend uncompleted quizzes
        const completedQuizIds = new Set(userData?.completedQuizzes || []);
        return allQuizzes.filter(quizDoc => !completedQuizIds.has(quizDoc.id));
    }

    const completedQuizIds = new Set(userData.completedQuizzes || []);
    const uncompletedQuizzes = allQuizzes.filter(quizDoc => !completedQuizIds.has(quizDoc.id));

    const quizHistory = userData.quizHistory;
    const topicScores = {}; // { topic: { totalScore: 0, count: 0 } }

    // Calculate average score per topic
    for (const quizId in quizHistory) {
        const entry = quizHistory[quizId];
        if (entry.topic && typeof entry.score === 'number') {
            if (!topicScores[entry.topic]) {
                topicScores[entry.topic] = { totalScore: 0, count: 0 };
            }
            topicScores[entry.topic].totalScore += entry.score;
            topicScores[entry.topic].count++;
        }
    }

    const weakTopics = new Set();
    for (const topic in topicScores) {
        const avgScore = topicScores[topic].totalScore / topicScores[topic].count;
        if (avgScore < WEAK_TOPIC_THRESHOLD) {
            weakTopics.add(topic);
        }
    }

    const recommended = [];
    const otherUncompleted = [];

    // Prioritize uncompleted quizzes from weak topics
    for (const quizDoc of uncompletedQuizzes) {
        const quiz = quizDoc.data();
        if (quiz.topic && weakTopics.has(quiz.topic)) {
            recommended.push(quizDoc);
        } else {
            otherUncompleted.push(quizDoc);
        }
    }

    // If not enough recommendations from weak topics, add other uncompleted quizzes
    if (recommended.length < 5) { // Recommend at least 5 quizzes if possible
        recommended.push(...otherUncompleted.slice(0, 5 - recommended.length));
    }

    // If still not enough, add some random quizzes (e.g., from all quizzes)
    if (recommended.length === 0 && allQuizzes.length > 0) {
        // Fallback to random uncompleted quizzes if no weak topics or all completed
        const randomUncompleted = uncompletedQuizzes.sort(() => Math.random() - 0.5).slice(0, 3);
        recommended.push(...randomUncompleted);
    }
    
    // Ensure no duplicates and limit to a reasonable number
    const uniqueRecommended = Array.from(new Set(recommended.map(q => q.id)))
                                .map(id => recommended.find(q => q.id === id));

    return uniqueRecommended.slice(0, 5); // Limit to top 5 recommendations
}

export async function initQuizSelection() {
    const quizListContainer = document.getElementById('quiz-list-container');
    const quizSelectionSection = document.getElementById('quiz-selection');
    const heroSection = document.getElementById('hero');
    const recommendedQuizzesContainer = document.getElementById('recommended-quizzes-container'); // New line

    if (!heroSection || !quizSelectionSection || !quizListContainer) {
        console.error("Error: No se encontraron los elementos de la sección de selección de quiz.");
        return;
    }

    // Show the quiz selection screen
    heroSection.style.display = 'none';
    quizSelectionSection.style.display = 'block';

    const user = getCurrentUser();
    let userData = null;
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
        }
    }

    try {
        const querySnapshot = await db.collection('quizzes').get();
        const allQuizzes = querySnapshot.docs;

        // Display all quizzes
        renderQuizCards(allQuizzes, quizListContainer);

        // Display recommended quizzes
        if (recommendedQuizzesContainer) { // Check if the container exists
            const recommendedQuizzes = getRecommendedQuizzes(allQuizzes, userData);
            if (recommendedQuizzes.length > 0) {
                const recommendedTitle = document.createElement('h2');
                recommendedTitle.textContent = 'Quizzes Recomendados';
                recommendedTitle.style.textAlign = 'center';
                recommendedTitle.style.marginTop = '2rem';
                recommendedQuizzesContainer.before(recommendedTitle); // Add title before the container
                renderQuizCards(recommendedQuizzes, recommendedQuizzesContainer);
            } else {
                recommendedQuizzesContainer.innerHTML = '<p style="text-align: center;">No hay quizzes recomendados en este momento.</p>';
            }
        }

    } catch (error) {
        console.error("Error fetching quizzes: ", error);
        quizListContainer.innerHTML = '<p>Error al cargar los juegos.</p>';
    }
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
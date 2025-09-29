import { db } from './firebase-config.js';
import { showToast } from './notifications.js';
import { getCurrentUser } from './auth.js';
import { checkAchievements } from './achievements.js'; // Importar checkAchievements

let score = 0;
let currentQuizTopic = null; // Global variable to store the current quiz topic
let currentQuizScore = 0; // Score for the current quiz
let currentQuestionIndex = 0;
let questions = [];
let timerInterval;
const TIME_LIMIT = 15;
let remainingAttempts;
let currentQuizId = null; // Variable para almacenar el ID del quiz actual

// The main initialization function for the game logic
export function initGame(user) {
    const nextBtn = document.getElementById('next-btn');
    if (user) {
        nextBtn.addEventListener('click', handleNextClick);
    }
    // The startButton from the hero section is no longer used to start the game.
}

export async function startGame(quizId) {
    currentQuizId = quizId; // Almacenar el ID del quiz actual
    
    // Fetch quiz details to get the topic
    const quizRef = db.collection('quizzes').doc(quizId);
    try {
        const quizDoc = await quizRef.get();
        if (quizDoc.exists) {
            currentQuizTopic = quizDoc.data().topic || 'General'; // Assuming 'topic' field exists, default to 'General'
        } else {
            console.warn(`Quiz document with ID ${quizId} not found.`);
            currentQuizTopic = 'General';
        }
    } catch (error) {
        console.error("Error fetching quiz topic: ", error);
        currentQuizTopic = 'General';
    }

    await fetchQuestions(quizId);
    
    const user = getCurrentUser();
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists) {
        score = doc.data().score || 0;
    } else {
        score = 0;
    }
    
    currentQuizScore = 0; // Initialize quiz score for the current quiz
    currentQuestionIndex = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('hero').style.display = 'none';
    document.getElementById('quiz-selection').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    loadQuestion();
}

async function fetchQuestions(quizId) {
    const questionsRef = db.collection('quizzes').doc(quizId);
    try {
        const doc = await questionsRef.get();
        if (doc.exists) {
            questions = doc.data().questionSet.sort(() => Math.random() - 0.5);
        } else {
            showToast("Error: No se encontraron las preguntas para este juego.", "error");
            questions = [];
        }
    } catch (error) {
        console.error("Error fetching questions: ", error);
        showToast("Error al cargar las preguntas.", "error");
        questions = [];
    }
}

function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showFinalScore();
        return;
    }

    remainingAttempts = 3;
    document.getElementById('attempts').textContent = remainingAttempts;

    clearInterval(timerInterval);
    let timeLeft = TIME_LIMIT;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showToast("¡Tiempo agotado!", 'error');
            document.querySelectorAll('#options .btn').forEach(btn => btn.disabled = true);
            const correctAnswer = questions[currentQuestionIndex].answer;
            const detailedFeedback = questions[currentQuestionIndex].feedback;
            document.getElementById('feedback').textContent = `¡Tiempo agotado! La respuesta era: ${correctAnswer}`;
            if (detailedFeedback) {
                const feedbackEl = document.getElementById('detailed-feedback');
                feedbackEl.textContent = detailedFeedback;
                feedbackEl.style.display = 'block';
            }
            document.getElementById('next-btn').style.display = 'block';
        }
    }, 1000);

    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
    document.getElementById('feedback').textContent = '';
    document.getElementById('detailed-feedback').textContent = '';
    document.getElementById('detailed-feedback').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';
    currentQuestion.options.forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        button.classList.add('btn');
        button.addEventListener('click', () => selectAnswer(button, optionText));
        optionsEl.appendChild(button);
    });
}

function getRank(score) {
    if (score <= 50) return 'Novato';
    if (score <= 100) return 'Aprendiz';
    if (score <= 150) return 'Conocedor';
    if (score <= 200) return 'Experto';
    return 'Maestro';
}

async function saveProgress(currentScore, nextQuestionIndex, quizId = null) {
    const user = getCurrentUser();
    if (user) {
        const userRef = db.collection('users').doc(user.uid);
        try {
            const doc = await userRef.get();
            if(doc.exists) {
                const currentRank = doc.data().rank || 'Novato';
                const newRank = getRank(currentScore);
                const dataToUpdate = {
                    score: currentScore,
                    currentQuestionIndex: nextQuestionIndex
                };

                if (newRank !== currentRank) {
                    dataToUpdate.rank = newRank;
                    showToast(`¡Has ascendido a ${newRank}!`, 'success');
                }
                
                const batch = db.batch(); // Moved batch declaration here

                // Si el quiz ha terminado (nextQuestionIndex === 0) y tenemos un quizId
                if (nextQuestionIndex === 0 && quizId) {
                    dataToUpdate.completedQuizzes = firebase.firestore.FieldValue.arrayUnion(quizId);
                    
                    // Store quiz-specific score and topic in quizHistory
                    const quizHistoryEntry = {
                        score: currentQuizScore, // Score for the just-completed quiz
                        topic: currentQuizTopic,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    batch.set(userRef, {
                        quizHistory: {
                            [quizId]: quizHistoryEntry
                        }
                    }, { merge: true }); // Use merge: true to update only quizHistory
                }
                
                batch.update(userRef, dataToUpdate);

                const scoreHistoryRef = userRef.collection('scoreHistory').doc();
                batch.set(scoreHistoryRef, {
                    score: currentScore,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();

                // Después de guardar el progreso, verificar logros
                const newAchievements = await checkAchievements(user, db);
                newAchievements.forEach(ach => showToast(`¡Logro desbloqueado: ${ach.name}!`, 'success'));
            }
        } catch (error) {
            console.error("Error al guardar el progreso: ", error);
        }
    }
}

function selectAnswer(selectedButton, selectedOption) {
    const correctAnswer = questions[currentQuestionIndex].answer;
    const detailedFeedback = questions[currentQuestionIndex].feedback;

    if (selectedOption === correctAnswer) {
        clearInterval(timerInterval);
        showToast('¡Correcto! +10 Puntos', 'success');
        document.getElementById('feedback').textContent = "¡Correcto!";
        if (detailedFeedback) {
            const feedbackEl = document.getElementById('detailed-feedback');
            feedbackEl.textContent = detailedFeedback;
            feedbackEl.style.display = 'block';
        }
        selectedButton.style.borderColor = "var(--accent-neon-cyan)";
        score += 10;
        currentQuizScore += 10; // Increment score for the current quiz
        document.getElementById('score').textContent = score;
        document.querySelectorAll('#options .btn').forEach(btn => btn.disabled = true);
        document.getElementById('next-btn').style.display = 'block';
        saveProgress(score, currentQuestionIndex + 1, currentQuizId);
    } else {
        remainingAttempts--;
        document.getElementById('attempts').textContent = remainingAttempts;
        selectedButton.disabled = true;
        selectedButton.style.borderColor = "var(--accent-neon-magenta)";

        if (remainingAttempts > 0) {
            showToast(`Incorrecto. Te quedan ${remainingAttempts} intentos.`, 'error');
        } else {
            clearInterval(timerInterval);
            showToast('No te quedan más intentos.', 'error');
            document.getElementById('feedback').textContent = `La respuesta correcta era: ${correctAnswer}`;
            if (detailedFeedback) {
                const feedbackEl = document.getElementById('detailed-feedback');
                feedbackEl.textContent = detailedFeedback;
                feedbackEl.style.display = 'block';
            }
            document.querySelectorAll('#options .btn').forEach(btn => btn.disabled = true);
            document.getElementById('next-btn').style.display = 'block';
            saveProgress(score, currentQuestionIndex + 1, currentQuizId);
        }
    }
}

function handleNextClick() {
    currentQuestionIndex++;
    saveProgress(score, currentQuestionIndex, currentQuizId);
    loadQuestion();
}

function showFinalScore() {
    clearInterval(timerInterval);
    showToast('¡Aventura Completada!', 'info');
    document.getElementById('game-container').innerHTML = `
        <h2 class="section-title">¡Aventura Completada!</h2>
        <p style="text-align: center; font-size: 1.2rem;">Tu puntuación final es: ${score}</p>
        <button id="restart-btn" class="btn btn-primary" style="margin: 2rem auto; display: block;">Jugar de Nuevo</button>
    `;
    document.getElementById('restart-btn').addEventListener('click', () => window.location.reload());
    
    // Las secciones de Salón de Honor y Foro ahora son visibles por defecto y su visibilidad se gestiona en app.js
    // document.getElementById('leaderboard-section').style.display = 'block';
    // document.getElementById('comments-section').style.display = 'block';

    saveProgress(score, 0, currentQuizId); // Guardar el progreso final y verificar logros
}

const style = document.createElement('style');
style.innerHTML = `
    .detailed-feedback {
        margin-top: 1rem;
        padding: 1rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        color: var(--text-secondary-color);
    }
`;
document.head.appendChild(style);
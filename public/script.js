import { db } from './firebase-config.js';
import { showToast } from './notifications.js';
import { getCurrentUser } from './auth.js';

let score = 0;
let currentQuestionIndex = 0;
let questions = [];
let timerInterval;
const TIME_LIMIT = 15;
let remainingAttempts;

// The main initialization function for the game logic
export function initGame(user) {
    const nextBtn = document.getElementById('next-btn');
    if (user) {
        nextBtn.addEventListener('click', handleNextClick);
    }
    // The startButton from the hero section is no longer used to start the game.
}

export async function startGame(quizId) {
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

async function saveProgress(currentScore, nextQuestionIndex) {
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
                
                const batch = db.batch();
                batch.update(userRef, dataToUpdate);

                const scoreHistoryRef = userRef.collection('scoreHistory').doc();
                batch.set(scoreHistoryRef, {
                    score: currentScore,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();
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
        document.getElementById('score').textContent = score;
        document.querySelectorAll('#options .btn').forEach(btn => btn.disabled = true);
        document.getElementById('next-btn').style.display = 'block';
        saveProgress(score, currentQuestionIndex + 1);
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
            saveProgress(score, currentQuestionIndex + 1);
        }
    }
}

function handleNextClick() {
    currentQuestionIndex++;
    saveProgress(score, currentQuestionIndex);
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
    
    // Desbloquear y mostrar el Salón de Honor y el Foro
    document.getElementById('leaderboard-section').style.display = 'block';
    document.getElementById('comments-section').style.display = 'block';

    saveProgress(score, 0); // Guardar el progreso final
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
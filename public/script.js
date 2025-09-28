import { db } from './firebase-config.js';
import { showToast } from './notifications.js';
import { getCurrentUser } from './auth.js';

let score = 0;
let currentQuestionIndex = 0;
let questions = [];

// The main initialization function for the game logic
export function initGame(user) {
    const startButton = document.getElementById('start-adventure-btn');
    const nextBtn = document.getElementById('next-btn');

    if (user) {
        startButton.textContent = "Comenzar Aventura";
        startButton.disabled = false;
        nextBtn.addEventListener('click', handleNextClick);
        startButton.addEventListener('click', startGame, { once: true });
    } else {
        startButton.textContent = "Inicia Sesión para Jugar";
        startButton.disabled = true;
    }
}

async function startGame() {
    await fetchQuestions();
    
    const user = getCurrentUser();
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists && doc.data().currentQuestionIndex > 0 && doc.data().currentQuestionIndex < questions.length) {
        currentQuestionIndex = doc.data().currentQuestionIndex;
        score = doc.data().score || 0;
        showToast('Progreso restaurado.', 'info');
    } else {
        currentQuestionIndex = 0;
        score = 0;
        await userRef.set({ score: 0, currentQuestionIndex: 0 }, { merge: true });
    }
    
    document.getElementById('score').textContent = score;
    document.getElementById('hero').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    loadQuestion();
}

async function fetchQuestions() {
    const questionsRef = db.collection('questions').doc('generations-quiz');
    try {
        const doc = await questionsRef.get();
        if (doc.exists) {
            questions = doc.data().questionSet.sort(() => Math.random() - 0.5);
        } else {
            showToast("Error: No se encontraron las preguntas.", "error");
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

    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
    document.getElementById('feedback').textContent = '';
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

function selectAnswer(selectedButton, selectedOption) {
    const correctAnswser = questions[currentQuestionIndex].answer;
    document.querySelectorAll('#options .btn').forEach(btn => btn.disabled = true);

    if (selectedOption === correctAnswser) {
        showToast('¡Correcto! +10 Puntos', 'success');
        document.getElementById('feedback').textContent = "¡Correcto!";
        selectedButton.style.borderColor = "var(--accent-neon-cyan)";
        score += 10;
        document.getElementById('score').textContent = score;
    } else {
        showToast('Respuesta incorrecta', 'error');
        document.getElementById('feedback').textContent = `Incorrecto. La respuesta era: ${correctAnswser}`;
        selectedButton.style.borderColor = "var(--accent-neon-magenta)";
    }
    
    saveProgress(score, currentQuestionIndex + 1);
    document.getElementById('next-btn').style.display = 'block';
}

function saveProgress(currentScore, nextQuestionIndex) {
    const user = getCurrentUser();
    if (user) {
        const userRef = db.collection('users').doc(user.uid);
        userRef.update({ 
            score: currentScore,
            currentQuestionIndex: nextQuestionIndex
        }).catch(error => console.error("Error al guardar el progreso: ", error));
    }
}

function handleNextClick() {
    currentQuestionIndex++;
    loadQuestion();
}

function showFinalScore() {
    showToast('¡Aventura Completada!', 'info');
    document.getElementById('game-container').innerHTML = `
        <h2 class="section-title">¡Aventura Completada!</h2>
        <p style="text-align: center; font-size: 1.2rem;">Tu puntuación final es: ${score}</p>
        <button id="restart-btn" class="btn btn-primary" style="margin: 2rem auto; display: block;">Jugar de Nuevo</button>
    `;
    document.getElementById('restart-btn').addEventListener('click', () => window.location.reload());
    saveProgress(score, 0);
}
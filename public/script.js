import { submitPlayerScore } from './leaderboard.js';
import { getCurrentUser } from './auth.js';

// --- Global Game State & Config ---
let playerName = "Agente"; // Default name
let currentScene = 0;
let score = 0;
let totalTimeElapsed = 0;
const totalChallengeScenes = 8;
let sceneCompleted = new Array(totalChallengeScenes + 1).fill(false);
let gameTimer;
let timeRemaining = 0;
let currentRank = null;
let attemptsLeft = 3;

const TIME_LIMIT = [60, 30, 30, 30, 30, 30, 30, 30];

const sceneEras = [
    "Calibración Temporal", "Presente (Alpha/Z)", "Generación Silenciosa",
    "Baby Boomers", "Generación X", "Millennials", "Generación Z", "Generación Alpha"
];

const sceneData = [
    { // Scene 0: Calibración
        feedback: "¡Excelente! Has calibrado tu memoria temporal. Reconocer estos íconos demuestra que entiendes cómo la tecnología de ayer sienta las bases para la de hoy.",
        didYouKnow: "<strong>¿Sabías que?</strong> El primer 'huevo de pascua' en un software se encontró en el juego 'Adventure' de Atari en 1979. Era el nombre del programador, oculto en una habitación secreta."
    },
    { // Scene 1: Presente (Alpha/Z)
        feedback: "¡Perfecto! Tu precisión demuestra que entiendes la comunicación rápida y directa de la era digital, donde cada caracter cuenta.",
        didYouKnow: "<strong>¿Sabías que?</strong> La Generación Z tiene una capacidad de atención promedio de 8 segundos, optimizada para consumir rápidamente grandes cantidades de información visual."
    },
    { // Scene 2: Generación Silenciosa
        feedback: "¡Sintonía correcta! Lograste navegar las ondas de radio, el principal medio de comunicación y entretenimiento de la Generación Silenciosa.",
        didYouKnow: "<strong>¿Sabías que?</strong> Durante la Gran Depresión, las familias se reunían alrededor de la radio para escuchar los discursos del presidente Roosevelt, conocidos como 'charlas junto a la chimenea'."
    },
    { // Scene 3: Baby Boomers
        feedback: "¡Canal encontrado! Seleccionaste la programación que definió a los Baby Boomers, la primera generación que creció con la televisión como centro del hogar.",
        didYouKnow: "<strong>¿Sabías que?</strong> La llegada del hombre a la Luna en 1969 fue uno de los eventos televisivos más vistos de la historia y un momento icónico para los Baby Boomers."
    },
    { // Scene 4: Generación X
        feedback: "¡Comando ejecutado! Has usado la lógica de las primeras computadoras personales, la herramienta que definió la independencia y el ingenio de la Generación X.",
        didYouKnow: "<strong>¿Sabías que?</strong> La Generación X, a menudo llamada la 'generación de la llave', se crió con una supervisión adulta mínima, lo que fomentó su independencia y escepticismo."
    },
    { // Scene 5: Millennials
        feedback: "¡Red establecida! Conectaste los pilares de las primeras redes sociales, el espacio digital donde los Millennials fueron pioneros en crear comunidades en línea.",
        didYouKnow: "<strong>¿Sabías que?</strong> Los Millennials fueron la primera generación en experimentar el 11-S durante sus años de formación, un evento que moldeó profundamente su visión del mundo."
    },
    { // Scene 6: Generación Z
        feedback: "¡Contenido viral! Has creado un video corto y atractivo, el formato preferido por la Generación Z para consumir información y entretenimiento.",
        didYouKnow: "<strong>¿Sabías que?</strong> La Generación Z es la más diversa y con mayor conciencia social hasta la fecha, utilizando las plataformas digitales para abogar por el cambio."
    },
    { // Scene 7: Generación Alpha
        feedback: "¡IA consultada! Has interactuado con una inteligencia artificial, una herramienta que será tan fundamental para la Generación Alpha como lo fue internet para los Millennials.",
        didYouKnow: "<strong>¿Sabías que?</strong> Se proyecta que la Generación Alpha será la más educada y tecnológicamente inmersa de la historia, sin conocer un mundo sin IA, asistentes de voz y dispositivos inteligentes."
    }
];

const rankTiers = [
    { scoreMin: 80, timeMax: 180, name: "Maestro Chronotech 🥇" },
    { scoreMin: 60, timeMax: 200, name: "Técnico Avanzado 🥈" },
    { scoreMin: 40, timeMax: 220, name: "Viajero Cadete 🥉" },
    { scoreMin: 20, timeMax: 240, name: "Aprendiz Temporal" },
    { scoreMin: 0, timeMax: 999, name: "Novato Temporal" }
];

// --- Tone.js Sound System Setup ---
document.body.addEventListener('click', () => { if (Tone.context.state !== 'running') Tone.context.resume(); }, { once: true });
const successTone = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 } }).toDestination();
const failTone = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 } }).toDestination();
function playSuccess() { successTone.triggerAttackRelease(["C5", "E5", "G5"], "8n"); }
function playFail() { failTone.triggerAttackRelease("4n"); }

// --- Core Game Logic ---
function updateHUD(era) {
    document.getElementById('current-era').textContent = era;
}

function scrollToElement(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function loadScene(index) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const nextScene = document.querySelector(`[data-scene="${index}"]`);
    if (!nextScene) return;

    nextScene.classList.add('active');
    currentScene = index;
    stopTimer();
    attemptsLeft = 3;
    document.getElementById('restart-mission-btn').style.display = 'none';


    // Scene-specific setup
    if (index === 1) {
        setupTypingChallenge();
    }

    if (index < totalChallengeScenes) {
        updateHUD(sceneEras[index]);
        if (index > 0 && !sceneCompleted[index]) startTimer(index);
    } else if (index === 9) { // Reflection Scene
        updateHUD("Certificado");
        calculateAndDisplayRank();
    } else {
        updateHUD(index === 8 ? "Construyendo Puente" : "Odisea Finalizada");
    }
    
    document.getElementById('time-travel-btn').disabled = sceneCompleted[currentScene] ? (currentScene >= totalChallengeScenes -1) : true;
    window.scrollTo({ top: document.getElementById('game-section').offsetTop, behavior: 'smooth' });
}

function showFeedback(id, msg, success, delay = 2000) {
    const feedback = document.getElementById(id);
    if (!feedback) return;

    if (success && !sceneCompleted[currentScene]) {
        stopTimer();
        const timeTaken = TIME_LIMIT[currentScene] - timeRemaining;
        totalTimeElapsed += timeTaken > 0 ? timeTaken : 0;
        updateScore(10);
        sceneCompleted[currentScene] = true;
        playSuccess();
        setButtonsDisabled(currentScene, true);

        // Show educational content
        const eduContent = document.getElementById(`educational-${currentScene}`);
        if (eduContent && sceneData[currentScene]) {
            eduContent.querySelector('.edu-feedback').innerHTML = sceneData[currentScene].feedback;
            eduContent.querySelector('.did-you-know').innerHTML = sceneData[currentScene].didYouKnow;
            eduContent.style.display = 'block';
        }

    } else if (!success) {
        playFail();
        attemptsLeft--;
        if (attemptsLeft > 0) {
            msg = `${msg} Te quedan ${attemptsLeft} intentos.`;
        } else {
            msg = `¡Misión fallida! Has agotado tus intentos.`;
            setButtonsDisabled(currentScene, true);
            document.getElementById('restart-mission-btn').style.display = 'block';
        }
    }

    feedback.textContent = msg; feedback.className = 'feedback ' + (success ? 'success' : 'error');
    feedback.style.display = 'block';

    if (!success && attemptsLeft > 0) {
         setTimeout(() => {
            feedback.style.display = 'none';
        }, delay);
    } else {
        setTimeout(() => {
            feedback.style.display = 'none';
            if (success || timeRemaining <= 0) document.getElementById('time-travel-btn').disabled = false;
        }, delay);
    }
}

function startGame() {
    currentScene = 0; score = 0; totalTimeElapsed = 0; sceneCompleted.fill(false);
    updateScore(0);
    document.getElementById('hero').style.display = 'none';
    document.getElementById('tutorial').style.display = 'none';
    document.getElementById('game-section').style.display = 'block';
    loadScene(0);
    initializeMemoryGame(false);
}

function restartMission() {
    loadScene(0);
    startGame();
}

function calculateAndDisplayRank() {
    const finalRank = rankTiers.find(tier => score >= tier.scoreMin && totalTimeElapsed <= tier.timeMax) || rankTiers[rankTiers.length - 1];
    currentRank = finalRank.name;

    document.getElementById('final-score-reflection').textContent = score;
    document.getElementById('total-time-reflection').textContent = totalTimeElapsed.toFixed(1);
    document.getElementById('final-rank').textContent = currentRank;
    document.getElementById('final-rank-share').textContent = currentRank;
    document.getElementById('player-final-name').textContent = playerName;

    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
        nameInput.value = playerName;
        nameInput.readOnly = true;
    }
}

async function submitScore() {
    if (playerName.length < 2) {
        alert('Por favor, ingresa un nombre válido.');
        return;
    }

    const submitForm = document.getElementById('submit-score-form');
    const button = submitForm.querySelector('button');
    button.disabled = true; button.textContent = 'Enviando...';

    try {
        await submitPlayerScore(playerName, score, currentRank);
        submitForm.innerHTML = '<p>¡Puntuación enviada al Salón de la Fama!</p>';
        document.getElementById('show-share-btn').style.display = 'block';

        // Show post-game sections
        document.getElementById('leaderboard-section').style.display = 'block';
        document.getElementById('comments-section').style.display = 'block';
        scrollToElement('leaderboard-section');

    } catch (error) {
        button.disabled = false; button.textContent = 'Inscribir en Salón de la Fama';
        alert("Error al enviar la puntuación.");
    }
}

function setButtonsDisabled(index, disabled) { document.querySelectorAll(`[data-scene="${index}"] .btn, [data-scene="${index}"] .puzzle-piece, [data-scene="${index}"] .memory-card, [data-scene="${index}"] .message-input`).forEach(el => el.disabled = disabled); }
function stopTimer() { clearInterval(gameTimer); }
function updateScore(points) { score += points; document.getElementById('score').textContent = score; }

function startTimer(index) {
    stopTimer();
    timeRemaining = TIME_LIMIT[index];
    document.getElementById('time-remaining').textContent = timeRemaining;
    gameTimer = setInterval(() => {
        timeRemaining--;
        document.getElementById('time-remaining').textContent = timeRemaining;
        if (timeRemaining <= 0) {
            stopTimer();
            playFail();
            showFeedback(`feedback-${currentScene}`, '❌ ¡TIEMPO AGOTADO!', false);
            totalTimeElapsed += TIME_LIMIT[index];
            document.getElementById('time-travel-btn').disabled = false;
        }
    }, 1000);
}

function timeTravel() { if (sceneCompleted[currentScene]) loadScene(currentScene + 1); }
function showShare() { loadScene(10); }
function copyLink() { navigator.clipboard.writeText(window.location.href).then(() => { const msg = document.getElementById('copy-msg'); msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2000); }); }

// --- Mini-Game State ---
let flippedCards = [];
let matchedPairs = 0;
let isChecking = false;

const typingPhrases = [
    "La transformación digital es clave para el futuro.",
    "La agilidad es más importante que la perfección.",
    "Innovar es ver lo que todo el mundo ha visto y pensar lo que nadie ha pensado."
];
let currentTypingPhrase = '';

// --- Mini-Game Functions ---
function initializeMemoryGame(start) {
    const grid = document.getElementById('memory-grid');
    const status = document.getElementById('memory-status');
    grid.innerHTML = '';
    status.textContent = 'Haz clic en "Iniciar" para comenzar.';
    flippedCards = [];
    matchedPairs = 0;
    isChecking = false;

    const icons = [
        { icon: '📱', text: 'El smartphone revolucionó la comunicación personal desde 2007.' },
        { icon: '💻', text: 'La computadora portátil nos dio poder de cómputo en cualquier lugar.' },
        { icon: '💾', text: 'El disquete fue el rey del almacenamiento portátil en los 80 y 90.' },
        { icon: '📷', text: 'La cámara digital cambió para siempre el mundo de la fotografía.' },
        { icon: '🕹️', text: 'El joystick o palanca de mando fue la puerta de entrada a los videojuegos.' },
        { icon: '⌚️', text: 'El reloj inteligente lleva la tecnología directamente a nuestra muñeca.' },
        { icon: '💡', text: 'La bombilla eléctrica de Edison iluminó el mundo moderno.' },
        { icon: '📡', text: 'La antena parabólica abrió las puertas a la comunicación global vía satélite.' }
    ];
    const deck = [...icons, ...icons].sort(() => 0.5 - Math.random());

    deck.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.icon = item.icon;
        card.dataset.text = item.text; // Store text in data attribute
        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">${item.icon}</div>
        `;
        grid.appendChild(card);
        card.addEventListener('click', () => flipCard(card));
    });
    
    document.getElementById('start-memory-btn').style.display = 'none';
    if (start) {
        status.textContent = 'Encuentra los 8 pares de íconos tecnológicos.';
        startTimer(0);
        grid.style.pointerEvents = 'auto';
    } else {
        document.getElementById('start-memory-btn').style.display = 'block';
        grid.style.pointerEvents = 'none';
    }
};

function flipCard(card) {
    if (isChecking || card.classList.contains('flipped') || flippedCards.length >= 2) {
        return;
    }

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
        isChecking = true;
        checkForMatch();
    }
}

function checkForMatch() {
    const [card1, card2] = flippedCards;
    const status = document.getElementById('memory-status');

    if (card1.dataset.icon === card2.dataset.icon) {
        // Display the educational text on match
        status.innerHTML = `✅ <strong>¡Par encontrado!</strong> ${card1.dataset.text}`;
        
        // Prevent matched cards from being clicked again
        card1.style.pointerEvents = 'none';
        card2.style.pointerEvents = 'none';

        matchedPairs++;
        flippedCards = [];
        isChecking = false;
        if (matchedPairs === 8) {
            showFeedback('feedback-0', `✅ ¡Calibración de memoria completa, Agente ${playerName}!`, true);
        }
    } else {
        status.innerHTML = `❌ <strong>No coinciden...</strong> Inténtalo de nuevo.`;
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            isChecking = false;
            // Reset status message only if no other match was found in the meantime
            if (!document.querySelector('.memory-card.flipped')) {
                status.textContent = 'Encuentra los 8 pares de íconos tecnológicos.';
            }
        }, 1300);
    }
}

function setupTypingChallenge() {
    currentTypingPhrase = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];
    const phraseElement = document.getElementById('typing-challenge-phrase');
    if (phraseElement) {
        // Wrap each character in a span for individual styling
        phraseElement.innerHTML = currentTypingPhrase.split('').map(char => `<span>${char}</span>`).join('');
    }
    const inputElement = document.getElementById('modern-msg');
    if (inputElement) {
        inputElement.value = '';
        // Add real-time validation listener
        inputElement.addEventListener('input', handleTypingInput);
    }
}

function handleTypingInput(e) {
    const phraseSpans = document.querySelectorAll('#typing-challenge-phrase span');
    const userInput = e.target.value;

    phraseSpans.forEach((charSpan, index) => {
        const typedChar = userInput[index];
        if (typedChar == null) {
            charSpan.className = ''; // Not yet typed
        } else if (typedChar === charSpan.textContent) {
            charSpan.className = 'correct'; // Correctly typed
        } else {
            charSpan.className = 'incorrect'; // Incorrectly typed
        }
    });
}

function sendModernMessage() {
    const userInput = document.getElementById('modern-msg').value; // Use exact input
    if (userInput === currentTypingPhrase) {
        showFeedback('feedback-1', '✅ Mensaje enviado con precisión', true);
        document.getElementById('modern-msg').removeEventListener('input', handleTypingInput);
    } else {
        showFeedback('feedback-1', '❌ El mensaje no coincide. Revisa los errores marcados.', false);
    }
};
function checkRadioPuzzle() { if (document.querySelectorAll('#radio-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#radio-puzzle .selected').length === 4) showFeedback('feedback-2', '✅ Sintonía Lograda', true); else showFeedback('feedback-2', '❌ Frecuencia incorrecta', false); };
function checkTVPuzzle() { if (document.querySelectorAll('#tv-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#tv-puzzle .selected').length === 4) showFeedback('feedback-3', '✅ Programa Creado', true); else showFeedback('feedback-3', '❌ Contenido inapropiado', false); };
function runCode() { if (document.getElementById('code-input').value.trim().toLowerCase() === 'run') showFeedback('feedback-4', '✅ Código Ejecutado', true); else showFeedback('feedback-4', '❌ Error de Comando', false); };
function buildNetwork() { if (document.querySelectorAll('#social-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#social-puzzle .selected').length === 4) showFeedback('feedback-5', '✅ Red Sólida', true); else showFeedback('feedback-5', '❌ Falla en la Conexión', false); };
function createTikTok() { if (document.querySelectorAll('#tiktok-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#tiktok-puzzle .selected').length === 4) showFeedback('feedback-6', '✅ ¡Viral!', true); else showFeedback('feedback-6', '❌ No es tendencia', false); };
function askAI() { if (document.getElementById('ai-input').value.trim().length > 10) showFeedback('feedback-7', '✅ IA Interactuada', true); else showFeedback('feedback-7', '❌ Pregunta insuficiente', false); };
function checkFinalQuiz() {
    const answer1 = document.getElementById('q1-answer').value;
    const answer2 = document.getElementById('q2-answer').value;

    if (answer1 === 'correcto' && answer2 === 'correcto') {
        showFeedback('feedback-8', '¡Felicidades, Maestro Chronotech! Has conectado las eras con éxito.', true);
        setTimeout(() => loadScene(9), 3000);
    } else {
        showFeedback('feedback-8', 'Una o más respuestas son incorrectas. Revisa tus conocimientos y vuelve a intentarlo.', false);
    }
}

function showTutorial() {
    document.getElementById('hero').style.display = 'none';
    document.getElementById('tutorial').style.display = 'block';
    document.getElementById('tutorial').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function showMissionBriefing() {
    const user = getCurrentUser();
    const missionBriefing = document.getElementById('mission-briefing');
    const heroSection = document.getElementById('hero');
    const nameInput = document.getElementById('player-name-input-briefing');

    heroSection.style.display = 'none';
    missionBriefing.style.display = 'block';

    if (user && user.displayName) {
        playerName = user.displayName;
        nameInput.value = playerName;
        nameInput.readOnly = true;
        const briefingText = missionBriefing.querySelector('.scene-desc');
        briefingText.innerHTML = `Saludos, Agente ${playerName}. Has sido seleccionado para la <strong>Operación "Puente Generacional"</strong>.`;
    }
}

function confirmIdentityAndStart() {
    const nameInput = document.getElementById('player-name-input-briefing');
    const name = nameInput.value.trim();

    if (name.length < 2) {
        alert('Por favor, introduce un nombre de agente válido.');
        return;
    }

    playerName = name;
    document.getElementById('mission-briefing').style.display = 'none';
    showTutorial();
}

export function init() {
    updateHUD(sceneEras[0]);
    document.getElementById('time-travel-btn').disabled = true;

    document.getElementById('show-tutorial-btn').addEventListener('click', showTutorial);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('time-travel-btn').addEventListener('click', timeTravel);
    document.getElementById('confirm-name-btn').addEventListener('click', confirmIdentityAndStart);
    document.getElementById('restart-mission-btn').addEventListener('click', restartMission);


    // Scenes buttons
    document.getElementById('start-memory-btn').addEventListener('click', () => initializeMemoryGame(true));
    document.getElementById('send-modern-msg-btn').addEventListener('click', sendModernMessage);
    document.getElementById('check-radio-puzzle-btn').addEventListener('click', checkRadioPuzzle);
    document.getElementById('check-tv-puzzle-btn').addEventListener('click', checkTVPuzzle);
    document.getElementById('run-code-btn').addEventListener('click', runCode);
    document.getElementById('build-network-btn').addEventListener('click', buildNetwork);
    document.getElementById('create-tiktok-btn').addEventListener('click', createTikTok);
    document.getElementById('ask-ai-btn').addEventListener('click', askAI);
    document.getElementById('check-final-quiz-btn').addEventListener('click', checkFinalQuiz);
    
    document.querySelectorAll('.puzzle-piece').forEach(piece => {
        piece.addEventListener('click', () => {
            piece.classList.toggle('selected');
        });
    });
}
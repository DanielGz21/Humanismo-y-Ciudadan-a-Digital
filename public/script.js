
import { submitPlayerScore } from './leaderboard.js';
import { getCurrentUser } from './auth.js';

// --- Global Game State & Config ---
let currentScene = 0;
let score = 0;
let totalTimeElapsed = 0;
const totalChallengeScenes = 8;
let sceneCompleted = new Array(totalChallengeScenes).fill(false);
let gameTimer;
let timeRemaining = 0;
let currentRank = null;

const TIME_LIMIT = [60, 30, 30, 30, 30, 30, 30, 30];

const sceneEras = [
    "Calibración Temporal", "Presente (Alpha/Z)", "Generación Silenciosa",
    "Baby Boomers", "Generación X", "Millennials", "Generación Z", "Generación Alpha"
];

const rankTiers = [
    { scoreMin: 80, timeMax: 180, name: "Maestro Chronotech 🥇" },
    { scoreMin: 60, timeMax: 200, name: "Operador de Élite 🥈" },
    { scoreMin: 40, timeMax: 220, name: "Técnico Avanzado 🥉" },
    { scoreMin: 20, timeMax: 240, name: "Viajero Cadete" },
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

window.scrollToElement = (id) => document.getElementById(id).scrollIntoView({ behavior: 'smooth' });

function loadScene(index) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const nextScene = document.querySelector(`[data-scene="${index}"]`);
    if (!nextScene) return;

    nextScene.classList.add('active');
    currentScene = index;
    stopTimer();

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
    } else if (!success) {
        playFail();
    }

    feedback.textContent = msg; feedback.className = 'feedback ' + (success ? 'success' : 'error');
    feedback.style.display = 'block';
    setButtonsDisabled(currentScene, true);

    setTimeout(() => {
        feedback.style.display = 'none';
        if (success || timeRemaining <= 0) document.getElementById('time-travel-btn').disabled = false;
    }, delay);
}

window.startGame = function() {
    currentScene = 0; score = 0; totalTimeElapsed = 0; sceneCompleted.fill(false);
    updateScore(0);
    document.getElementById('hero').style.display = 'none';
    document.getElementById('tutorial').style.display = 'none';
    document.getElementById('game-section').classList.add('active');
    loadScene(0);
    initializeMemoryGame(false);
}

function calculateAndDisplayRank() {
    const user = getCurrentUser();
    const finalRank = rankTiers.find(tier => score >= tier.scoreMin && totalTimeElapsed <= tier.timeMax) || rankTiers[rankTiers.length - 1];
    currentRank = finalRank.name;

    document.getElementById('final-score-reflection').textContent = score;
    document.getElementById('total-time-reflection').textContent = totalTimeElapsed.toFixed(1);
    document.getElementById('final-rank').textContent = currentRank;
    document.getElementById('final-rank-share').textContent = currentRank;
    document.getElementById('player-final-name').textContent = user ? user.displayName : "Viajero";

    const nameInput = document.getElementById('player-name-input');
    if (user) {
        nameInput.value = user.displayName;
        nameInput.readOnly = true;
    } else {
        nameInput.value = "";
        nameInput.readOnly = false;
    }
}

window.submitScore = async function() {
    const user = getCurrentUser();
    const nameInput = document.getElementById('player-name-input');
    const name = user ? user.displayName : nameInput.value.trim();

    if (name.length < 2) {
        alert('Por favor, ingresa un nombre válido.');
        return;
    }

    const submitForm = document.getElementById('submit-score-form');
    const button = submitForm.querySelector('button');
    button.disabled = true; button.textContent = 'Enviando...';

    try {
        await submitPlayerScore(name, score, currentRank);
        submitForm.innerHTML = '<p>¡Puntuación enviada al Salón de la Fama!</p>';
        document.getElementById('show-share-btn').style.display = 'block';
    } catch (error) {
        button.disabled = false; button.textContent = 'Inscribir en Salón de la Fama';
        alert("Error al enviar la puntuación.");
    }
}

// --- Utility & Setup ---
function setButtonsDisabled(index, disabled) { document.querySelectorAll(`[data-scene="${index}"] .btn, [data-scene="${index}"] .puzzle-piece, [data-scene="${index}"] .memory-card, [data-scene="${index}"] .message-input`).forEach(el => el.disabled = disabled); }
document.addEventListener('DOMContentLoaded', () => { updateHUD(sceneEras[0]); document.getElementById('time-travel-btn').disabled = true; });
function stopTimer() { clearInterval(gameTimer); }
function updateScore(points) { score += points; document.getElementById('score').textContent = score;}
function startTimer(index) { stopTimer(); timeRemaining = TIME_LIMIT[index]; gameTimer = setInterval(() => { timeRemaining--; if (timeRemaining <= 0) { stopTimer(); playFail(); showFeedback(`feedback-${currentScene}`, '❌ ¡TIEMPO AGOTADO!', false); totalTimeElapsed += TIME_LIMIT[index]; document.getElementById('time-travel-btn').disabled = false; } }, 1000);}
window.timeTravel = () => { if (sceneCompleted[currentScene]) loadScene(currentScene + 1); }
window.showShare = () => loadScene(10);
window.copyLink = () => navigator.clipboard.writeText(window.location.href).then(() => { const msg = document.getElementById('copy-msg'); msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2000); });

// --- Mini-Game Functions (Exported to window) ---
window.initializeMemoryGame = (start) => { if(start) startTimer(0); else document.getElementById('start-memory-btn').style.display = 'block'; /* more setup logic */ };
window.sendModernMessage = () => { if (document.getElementById('modern-msg').value.trim().length >= 5) showFeedback('feedback-1', '✅ Mensaje enviado', true); else showFeedback('feedback-1', '❌ Mensaje muy corto', false); };
window.checkRadioPuzzle = () => { if (document.querySelectorAll('#radio-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#radio-puzzle .selected').length === 4) showFeedback('feedback-2', '✅ Sintonía Lograda', true); else showFeedback('feedback-2', '❌ Frecuencia incorrecta', false); };
window.checkTVPuzzle = () => { if (document.querySelectorAll('#tv-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#tv-puzzle .selected').length === 4) showFeedback('feedback-3', '✅ Programa Creado', true); else showFeedback('feedback-3', '❌ Contenido inapropiado', false); };
window.runCode = () => { if (document.getElementById('code-input').value.trim().toLowerCase() === 'run') showFeedback('feedback-4', '✅ Código Ejecutado', true); else showFeedback('feedback-4', '❌ Error de Comando', false); };
window.buildNetwork = () => { if (document.querySelectorAll('#social-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#social-puzzle .selected').length === 4) showFeedback('feedback-5', '✅ Red Sólida', true); else showFeedback('feedback-5', '❌ Falla en la Conexión', false); };
window.createTikTok = () => { if (document.querySelectorAll('#tiktok-puzzle .selected[data-correct="true"]').length === 4 && document.querySelectorAll('#tiktok-puzzle .selected').length === 4) showFeedback('feedback-6', '✅ ¡Viral!', true); else showFeedback('feedback-6', '❌ No es tendencia', false); };
window.askAI = () => { if (document.getElementById('ai-input').value.trim().length > 10) showFeedback('feedback-7', '✅ IA Interactuada', true); else showFeedback('feedback-7', '❌ Pregunta insuficiente', false); };
window.buildBridges = () => { if (sceneCompleted.filter(c=>c).length === totalChallengeScenes) { showFeedback('feedback-8', `¡Puentes Finalizados!`, true, 3000); setTimeout(() => loadScene(9), 3000); } else { showFeedback('feedback-8', `Puentes incompletos.`, false, 4000); } };
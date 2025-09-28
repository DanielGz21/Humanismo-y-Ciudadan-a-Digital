
        // --- Global Game State & Config ---
        let currentScene = 0;
        let score = 0;
        let totalTimeElapsed = 0; // NEW: Tracks time spent on successful missions
        const totalChallengeScenes = 8; 
        let sceneCompleted = new Array(totalChallengeScenes).fill(false);
        let gameTimer;
        let timeRemaining = 0;
        let missionStartTime = 0; // NEW: To calculate time elapsed for grading

        const TIME_LIMIT = [60, 30, 30, 30, 30, 30, 30, 30]; 
        
        const sceneEras = [
            "Calibración Temporal",
            "Presente (Alpha/Z)",
            "Generación Silenciosa",
            "Baby Boomers",
            "Generación X",
            "Millennials",
            "Generación Z",
            "Generación Alpha"
        ];

        const rankTiers = [
            { scoreMin: 80, timeMax: 1000, name: "Maestro Chronotech 🥇" },
            { scoreMin: 80, timeMax: 10000, name: "Operador de Élite 🥈" },
            { scoreMin: 60, timeMax: 10000, name: "Técnico Avanzado 🥉" },
            { scoreMin: 40, timeMax: 10000, name: "Viajero Cadete" },
            { scoreMin: 0, timeMax: 10000, name: "Novato Temporal" }
        ];

        // --- Tone.js Sound System Setup ---
        // Tone.js requires user interaction to start the audio context.
        document.body.addEventListener('click', () => {
            if (Tone.context.state !== 'running') {
                Tone.context.resume();
            }
        }, {once: true});
        
        // Success Tone: Simple poly synth bright chord
        const successTone = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
        }).toDestination();

        // Fail Tone: Noise with low frequency filter
        const failTone = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 },
            filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2, baseFrequency: 200, octaves: 1.5 }
        }).toDestination();
        
        // Timer Tick Tone: Simple beep (monosynth)
        const timerTick = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.01, release: 0.1 }
        }).toDestination();
        
        function playSuccess() { successTone.triggerAttackRelease(["C5", "E5", "G5"], "8n"); }
        function playFail() { failTone.triggerAttackRelease("4n"); }
        function playTick() { timerTick.triggerAttackRelease("C3", "16n"); }

        // --- Core Functions ---
        
        function updateHUD(era) {
            document.getElementById('current-era').textContent = era;
            updateTimeline();
        }

        function scrollToElement(id) {
            document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
        }
        
        function updateTimeline() {
            // Update Markers and lines
            for (let i = 0; i < totalChallengeScenes; i++) {
                const marker = document.querySelector(`.marker-${i}`);
                const line = document.querySelector(`.era-${i}`);
                
                if (marker) {
                    marker.classList.remove('active', 'completed');
                    if (sceneCompleted[i]) {
                        marker.classList.add('completed');
                        if (line) line.classList.add('completed');
                    }
                    if (i === currentScene) {
                        marker.classList.add('active');
                    }
                }
            }
        }

        function updateTimeDisplay() {
            const timeEl = document.getElementById('time-remaining');
            timeEl.textContent = timeRemaining;
            
            if (timeRemaining <= 10 && timeRemaining > 0) {
                timeEl.style.animation = 'urgentFlash 1s infinite';
                playTick(); // Sound effect for urgency
            } else {
                timeEl.style.animation = 'none';
                timeEl.style.color = 'var(--accent)';
            }
        }

        function startTimer(sceneIndex) {
            stopTimer();
            timeRemaining = TIME_LIMIT[sceneIndex];
            missionStartTime = Date.now(); // Mark start time for success calculation
            document.getElementById('progress-container').style.display = 'none'; // Re-hide unused element
            updateTimeDisplay();

            gameTimer = setInterval(() => {
                timeRemaining--;
                updateTimeDisplay();

                if (timeRemaining <= 0) {
                    stopTimer();
                    playFail();
                    showFeedback(`feedback-${currentScene}`, '❌ ¡TIEMPO AGOTADO! La era te ha superado. No obtienes puntos. Viaja a la siguiente era.', false, 4000);
                    // Penaliza el tiempo total para el ranking, simulando una misión larga y fallida
                    totalTimeElapsed += TIME_LIMIT[sceneIndex]; 
                    document.getElementById('time-travel-btn').disabled = false;
                }
            }, 1000);
        }

        function stopTimer() {
            clearInterval(gameTimer);
            document.getElementById('time-remaining').style.animation = 'none';
            document.getElementById('time-remaining').style.color = 'var(--accent)';
        }

        function setButtonsDisabled(sceneIndex, disabled) {
            const currentSceneEl = document.querySelector(`[data-scene="${sceneIndex}"]`);
            if (currentSceneEl) {
                // Disable all clickable elements in the current scene
                currentSceneEl.querySelectorAll('.btn, .puzzle-piece, .memory-card').forEach(el => {
                    el.disabled = disabled;
                });
                // Re-enable the start memory button if starting memory game
                if (sceneIndex === 0) {
                    document.getElementById('start-memory-btn').disabled = disabled;
                }
            }
        }

        function loadScene(index) {
            document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
            const nextScene = document.querySelector(`[data-scene="${index}"]`);
            if (nextScene) {
                nextScene.classList.add('active');
                currentScene = index;
                stopTimer();

                if (index < totalChallengeScenes) {
                    updateHUD(sceneEras[index]);
                    setButtonsDisabled(index, false); 
                    
                    if (index > 0) {
                        startTimer(index);
                    }
                } else if (index === 8) {
                    updateHUD("Construyendo Puente");
                    document.getElementById('time-travel-btn').disabled = true;
                } else if (index === 9) {
                    updateHUD("Certificado");
                    calculateRank();
                } else {
                    updateHUD("Odisea Finalizada");
                }
                
                document.getElementById('time-travel-btn').disabled = !sceneCompleted[currentScene] || currentScene >= totalChallengeScenes;
                window.scrollTo({ top: document.getElementById('game-section').offsetTop, behavior: 'smooth' });
            }
        }

        function timeTravel() {
            if (currentScene < totalChallengeScenes - 1) {
                if (sceneCompleted[currentScene]) {
                    loadScene(currentScene + 1);
                } else {
                    showFeedback(`feedback-${currentScene}`, '¡Completa el desafío actual para avanzar!', false, 2000);
                }
            } else if (currentScene === totalChallengeScenes - 1) { 
                 if (sceneCompleted[currentScene]) {
                    loadScene(8); // Go to Bridge Builder
                } else {
                    showFeedback(`feedback-${currentScene}`, '¡Completa el desafío actual para avanzar!', false, 2000);
                }
            } else if (currentScene === 9) { 
                loadScene(10); // Go to Share
            }
        }

        function updateScore(points) {
            score += points;
            document.getElementById('score').textContent = score;
        }
        
        function calculateRank() {
            const successfulTime = totalTimeElapsed / sceneCompleted.filter(c => c).length; // Avg time per successful mission
            
            let finalRank = rankTiers.find(tier => {
                const scoreCheck = score >= tier.scoreMin;
                // For the top ranks, prioritize score and then speed
                if (tier.name.includes("Maestro") || tier.name.includes("Élite")) {
                    return scoreCheck && successfulTime <= 30; // Harder time limit for top ranks
                }
                return scoreCheck;
            });

            if (!finalRank) {
                finalRank = rankTiers[rankTiers.length - 1]; // Default to Novato
            }

            document.getElementById('final-score-reflection').textContent = score;
            document.getElementById('total-time-reflection').textContent = totalTimeElapsed.toFixed(1);
            document.getElementById('final-rank').textContent = finalRank.name;
            document.getElementById('final-rank-share').textContent = finalRank.name;
        }

        function showFeedback(id, msg, success, delay = 2000) {
            const feedback = document.getElementById(id);
            if (!feedback) return;
            
            stopTimer();
            
            feedback.textContent = msg;
            feedback.className = 'feedback ' + (success ? 'success' : 'error');
            feedback.style.display = 'block';

            if (success && currentScene < totalChallengeScenes) {
                // Calculate time elapsed for success
                const timeTaken = TIME_LIMIT[currentScene] - timeRemaining;
                totalTimeElapsed += timeTaken;
                
                if (!sceneCompleted[currentScene]) {
                    updateScore(10);
                    sceneCompleted[currentScene] = true;
                    updateHUD(sceneEras[currentScene]); 
                }
                playSuccess();
            } else if (!success) {
                playFail();
            }
            
            setButtonsDisabled(currentScene, true);

            setTimeout(() => {
                feedback.style.display = 'none';
                document.getElementById('time-travel-btn').disabled = !sceneCompleted[currentScene];

                if (success && currentScene < totalChallengeScenes) {
                    loadScene(currentScene + 1);
                }
            }, delay);
        }

        function startGame() {
            // Reset state
            currentScene = 0;
            score = 0;
            totalTimeElapsed = 0;
            sceneCompleted = new Array(totalChallengeScenes).fill(false);
            document.getElementById('score').textContent = score;

            document.getElementById('hero').style.display = 'none';
            document.getElementById('tutorial').style.display = 'none';
            document.getElementById('game-section').classList.add('active');
            
            loadScene(0); 
            initializeMemoryGame(false); 
        }
        
        // --- Mini-games Logic ---
        
        function setupPuzzleToggle(puzzleId) {
            const pieces = document.querySelectorAll(`#${puzzleId} .puzzle-piece`);
            pieces.forEach(p => {
                p.addEventListener('click', () => {
                    if (!sceneCompleted[currentScene] && timeRemaining > 0) {
                        p.classList.toggle('selected');
                    }
                });
            });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            setupPuzzleToggle('radio-puzzle');
            setupPuzzleToggle('tv-puzzle');
            setupPuzzleToggle('social-puzzle');
            setupPuzzleToggle('tiktok-puzzle');
            updateHUD(sceneEras[0]); 
            document.getElementById('time-travel-btn').disabled = true; 
        });

        // --- SCENE 0: CALIBRATION (Memory Game) ---
        const memoryIcons = ["💾", "📞", "📺", "💻", "📲", "📡", "📝", "🖱️"];
        let cards = [];
        let flippedCards = [];
        let matchesFound = 0;
        let lockBoard = false;

        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        function initializeMemoryGame(startTimerNow) {
            const grid = document.getElementById('memory-grid');
            const status = document.getElementById('memory-status');
            const icons = memoryIcons.slice(0, 4); 
            const gameArray = [...icons, ...icons];
            shuffle(gameArray);

            grid.innerHTML = '';
            cards = [];
            flippedCards = [];
            matchesFound = 0;
            lockBoard = false;
            
            if (!startTimerNow) {
                status.textContent = "Haz clic en INICIAR para comenzar la Calibración.";
                document.getElementById('start-memory-btn').style.display = 'block';
            }

            gameArray.forEach((icon, index) => {
                const card = document.createElement('div');
                card.classList.add('memory-card');
                card.dataset.icon = icon;
                card.dataset.index = index;
                card.innerHTML = `
                    <div class="card-content card-back">?</div>
                    <div class="card-content card-front">${icon}</div>
                `;
                card.addEventListener('click', flipCard);
                grid.appendChild(card);
                cards.push(card);
            });
            
            if (startTimerNow) {
                startTimer(0);
                status.textContent = "¡Tiempo corre! Busca los pares.";
                document.getElementById('start-memory-btn').style.display = 'none';
            }
        }

        function flipCard(event) {
            if (lockBoard || sceneCompleted[0] || timeRemaining <= 0) return;

            const card = event.currentTarget;
            if (card.classList.contains('matched') || card.classList.contains('flipped')) return;

            card.classList.add('flipped');
            flippedCards.push(card);

            if (flippedCards.length === 2) {
                lockBoard = true;
                checkForMatch();
            }
        }

        function checkForMatch() {
            const [card1, card2] = flippedCards;
            const isMatch = card1.dataset.icon === card2.dataset.icon;

            if (isMatch) {
                disableCards();
            } else {
                unflipCards();
            }
        }

        function disableCards() {
            const [card1, card2] = flippedCards;
            card1.classList.add('matched');
            card2.classList.add('matched');
            card1.removeEventListener('click', flipCard);
            card2.removeEventListener('click', flipCard);
            resetBoard();

            matchesFound++;
            if (matchesFound === 4) {
                stopTimer();
                document.getElementById('memory-status').textContent = "¡Calibración exitosa! Memoria lista.";
                showFeedback('feedback-0', `✅ Calibración completa en ${TIME_LIMIT[0] - timeRemaining} segundos. Puedes avanzar.`, true);
            }
        }

        function unflipCards() {
            setTimeout(() => {
                flippedCards.forEach(card => {
                    card.classList.remove('flipped');
                });
                resetBoard();
            }, 1000);
        }

        function resetBoard() {
            [flippedCards, lockBoard] = [[], false];
        }


        // --- SCENE 1: Present (Gen Alpha/Z) ---
        function sendModernMessage() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const msg = document.getElementById('modern-msg').value;
            if (msg.trim().length >= 5) {
                document.getElementById('modern-sim').textContent = `[${new Date().toLocaleTimeString()}] Mensaje enviado: "${msg.substring(0, 30)}..." vía app instantánea cifrada. Confirmación de entrega en 0.001s.`;
                showFeedback('feedback-1', '✅ Mensaje enviado exitosamente. ¡La inmediatez es tu fuerza!', true);
            } else {
                showFeedback('feedback-1', '❌ Error: El mensaje es demasiado corto o vacío.', false);
            }
        }

        // --- SCENE 2: Silent Generation ---
        function checkRadioPuzzle() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const selected = document.querySelectorAll('#radio-puzzle .puzzle-piece.selected');
            const correctSelected = Array.from(selected).filter(p => p.dataset.correct === 'true');
            
            if (correctSelected.length === 4 && selected.length === 4) {
                showFeedback('feedback-2', '✅ Sintonía Lograda. Entiendes el valor de la comunicación paciente.', true);
            } else {
                showFeedback('feedback-2', '❌ Error de Frecuencia. Solo 4 opciones son correctas para la radio/prensa de esa era.', false);
            }
        }

        // --- SCENE 3: Baby Boomers ---
        function checkTVPuzzle() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const selected = document.querySelectorAll('#tv-puzzle .puzzle-piece.selected');
            const correctSelected = Array.from(selected).filter(p => p.dataset.correct === 'true');
            
            if (correctSelected.length === 4 && selected.length === 4) {
                showFeedback('feedback-3', '✅ Programa Creado. Entiendes los medios de difusión visuales y centralizados.', true);
            } else {
                showFeedback('feedback-3', '❌ Contenido Inapropiado. Vuelve a seleccionar 4 elementos que dominarían la TV en esa época.', false);
            }
        }

        // --- SCENE 4: Gen X ---
        function runCode() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const code = document.getElementById('code-input').value.trim();
            if (code.toLowerCase() === 'run') {
                document.querySelector('#feedback-4').style.display = 'block';
                document.querySelector('#feedback-4').textContent = '>>> Ejecutando... OK. Output: Hola, mundo!';
                
                setTimeout(() => {
                    showFeedback('feedback-4', '✅ Código Ejecutado. Dominaste la lógica primitiva del PC.', true, 3000);
                }, 1000);
            } else {
                showFeedback('feedback-4', '❌ Error de Comando. El comando simple de ejecución es "RUN".', false);
            }
        }

        // --- SCENE 5: Millennials ---
        function buildNetwork() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const selected = document.querySelectorAll('#social-puzzle .puzzle-piece.selected');
            const correctSelected = Array.from(selected).filter(p => p.dataset.correct === 'true');

            if (correctSelected.length === 4 && selected.length === 4) {
                showFeedback('feedback-5', '✅ Red Sólida. Comprendes los pilares de la colaboración y el diálogo en Internet.', true);
            } else {
                showFeedback('feedback-5', '❌ Falla en la Conexión. Asegúrate de elegir los 4 pilares de la comunidad real.', false);
            }
        }

        // --- SCENE 6: Gen Z ---
        function createTikTok() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const selected = document.querySelectorAll('#tiktok-puzzle .puzzle-piece.selected');
            const correctSelected = Array.from(selected).filter(p => p.dataset.correct === 'true');

            if (correctSelected.length === 4 && selected.length === 4) {
                showFeedback('feedback-6', '✅ ¡Viral! Has adaptado tu mensaje al formato de consumo rápido y visual.', true);
            } else {
                showFeedback('feedback-6', '❌ El Video Es Largo. Selecciona 4 elementos para contenido corto y de alta retención.', false);
            }
        }

        // --- SCENE 7: Gen Alpha ---
        function askAI() {
            if (sceneCompleted[currentScene] || timeRemaining <= 0) return;
            const question = document.getElementById('ai-input').value.trim();
            const aiResponseEl = document.getElementById('ai-response');
            
            if (question.length > 10) {
                aiResponseEl.textContent = '🤖 Analizando la pregunta...';
                
                setTimeout(() => {
                    aiResponseEl.textContent = `🤖 IA responde: Tu pregunta ("${question.substring(0, 30)}...") demuestra curiosidad intergeneracional. La clave es: cada herramienta (radio, TV, PC, IA) es solo un *canal*. El mensaje siempre debe ser la empatía.`;
                    showFeedback('feedback-7', '✅ IA Interactuada. Demostraste adaptabilidad al aprendizaje inmersivo.', true, 3500);
                }, 1500);
            } else {
                showFeedback('feedback-7', '❌ Pregunta Insuficiente. Haz una pregunta significativa que muestre tu entendimiento.', false, 2000);
            }
        }
        
        // --- SCENE 8: Bridge Builder ---
        function buildBridges() {
            const challengesCompleted = sceneCompleted.filter(c => c).length;
            const bridgesToBuild = challengesCompleted;
            let success = true;

            if (bridgesToBuild < totalChallengeScenes) {
                showFeedback('feedback-8', `Puentes incompletos. Solo construiste ${bridgesToBuild} de ${totalChallengeScenes}. Vuelve a los desafíos pendientes.`, false, 4000);
                success = false;
            }

            for (let i = 0; i < totalChallengeScenes - 1; i++) { // Only 7 bridges between 8 generations
                const bridgeEl = document.getElementById(`bridge-${i}`);
                if (bridgeEl) { 
                    if (i < bridgesToBuild) {
                        bridgeEl.classList.add('connected');
                    } else {
                        bridgeEl.classList.remove('connected');
                    }
                }
            }
            
            if (success) {
                document.getElementById('feedback-8').textContent = `¡Puentes Finalizados! Has conectado todas las ${totalChallengeScenes} eras.`;
                document.getElementById('feedback-8').classList.add('success');
                document.getElementById('feedback-8').style.display = 'block';
                setTimeout(() => loadScene(9), 3000);
            }
        }

        function showShare() {
            document.getElementById('final-score').textContent = score;
            loadScene(10);
        }

        function copyLink() {
            const el = document.createElement('textarea');
            el.value = window.location.href;
            document.body.appendChild(el);
            el.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    document.getElementById('copy-msg').style.display = 'block';
                    setTimeout(() => document.getElementById('copy-msg').style.display = 'none', 3000);
                }
            } catch (err) {
                console.error('No se pudo copiar el enlace', err);
            }
            document.body.removeChild(el);
        }

import { db } from './firebase-config.js';
import { showToast } from './notifications.js';

let currentEditingQuizId = null;

// Función principal para inicializar el panel de administración
export function initAdminPanel() {
    const adminSection = document.getElementById('admin-section');
    if (!adminSection) return;

    adminSection.style.display = 'block';
    
    // Listeners para cambiar de pestaña (Quizzes y Usuarios)
    document.getElementById('admin-nav-quizzes').addEventListener('click', () => showAdminTab('quizzes'));
    document.getElementById('admin-nav-users').addEventListener('click', () => showAdminTab('users'));

    // Listeners para quizzes
    document.getElementById('add-quiz-btn').addEventListener('click', () => showQuizForm(null));
    
    // Cargar la vista inicial (quizzes)
    showAdminTab('quizzes');
}

// Muestra la pestaña seleccionada (quizzes o users) y activa el botón correspondiente
function showAdminTab(tabName) {
    document.getElementById('admin-quizzes-content').style.display = 'none';
    document.getElementById('admin-users-content').style.display = 'none';
    
    document.getElementById('admin-nav-quizzes').classList.remove('active');
    document.getElementById('admin-nav-users').classList.remove('active');

    document.getElementById(`admin-${tabName}-content`).style.display = 'block';
    document.getElementById(`admin-nav-${tabName}`).classList.add('active');

    if (tabName === 'quizzes') {
        loadQuizzes();
    } else if (tabName === 'users') {
        loadUsers();
    }
}

// --- GESTIÓN DE QUIZZES ---

async function loadQuizzes() {
    const quizList = document.getElementById('admin-quiz-list');
    quizList.innerHTML = '<div class="loading-spinner">Cargando quizzes...</div>';

    try {
        const snapshot = await db.collection('quizzes').orderBy('title').get();
        if (snapshot.empty) {
            quizList.innerHTML = '<p>No hay quizzes para mostrar. ¡Crea el primero!</p>';
            return;
        }

        let quizzesHTML = '';
        snapshot.forEach(doc => {
            const quiz = doc.data();
            quizzesHTML += `
                <div class="admin-list-item">
                    <span>${quiz.title} (${quiz.questionSet.length} preguntas)</span>
                    <div>
                        <button class="btn btn-secondary btn-sm" data-id="${doc.id}">Editar</button>
                        <button class="btn btn-danger btn-sm" data-id="${doc.id}">Eliminar</button>
                    </div>
                </div>
            `;
        });
        quizList.innerHTML = quizzesHTML;

        quizList.querySelectorAll('.btn-secondary').forEach(btn => {
            btn.addEventListener('click', (e) => editQuiz(e.target.dataset.id));
        });
        quizList.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => deleteQuiz(e.target.dataset.id));
        });

    } catch (error) {
        console.error("Error cargando quizzes:", error);
        quizList.innerHTML = '<p>Error al cargar los quizzes.</p>';
    }
}

async function editQuiz(quizId) {
    try {
        const doc = await db.collection('quizzes').doc(quizId).get();
        if (doc.exists) {
            const quizData = { id: doc.id, ...doc.data() };
            showQuizForm(quizData);
        }
    } catch (error) {
        showToast('No se pudo cargar el quiz para editar.', 'error');
    }
}

function showQuizForm(quizData) {
    currentEditingQuizId = quizData ? quizData.id : null;
    const formContainer = document.getElementById('admin-quiz-form-container');
    const formTitle = currentEditingQuizId ? 'Editar Quiz' : 'Crear Nuevo Quiz';

    let questionsHTML = '';
    if (quizData && quizData.questionSet) {
        quizData.questionSet.forEach((q, index) => {
            questionsHTML += renderQuestionForm(index, q);
        });
    } else {
        questionsHTML = renderQuestionForm(0);
    }

    formContainer.innerHTML = `
        <h3>${formTitle}</h3>
        <form id="quiz-form">
            <div class="form-group">
                <label for="quiz-title">Título del Quiz</label>
                <input type="text" id="quiz-title" class="admin-input" value="${quizData ? quizData.title : ''}" required>
            </div>
            <div class="form-group">
                <label for="quiz-description">Descripción</label>
                <textarea id="quiz-description" class="admin-textarea" required>${quizData ? quizData.description : ''}</textarea>
            </div>
            <div class="form-group">
                <label for="quiz-category">Categoría</label>
                <input type="text" id="quiz-category" class="admin-input" value="${quizData ? quizData.category : ''}" required>
            </div>
            <hr>
            <h4>Preguntas</h4>
            <div id="questions-container">
                ${questionsHTML}
            </div>
            <button type="button" id="add-question-btn" class="btn btn-secondary">Añadir Pregunta</button>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Guardar Quiz</button>
                <button type="button" id="cancel-edit-btn" class="btn">Cancelar</button>
            </div>
        </form>
    `;
    formContainer.style.display = 'block';

    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    document.getElementById('quiz-form').addEventListener('submit', saveQuiz);
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        formContainer.style.display = 'none';
        formContainer.innerHTML = '';
    });
}

function renderQuestionForm(index, question = {}) {
    return `
        <div class="question-form-group" data-index="${index}">
            <h5>Pregunta ${index + 1}</h5>
            <input type="text" placeholder="Texto de la pregunta" class="question-text admin-input" value="${question.question || ''}" required>
            <input type="text" placeholder="Opción 1" class="question-option admin-input" value="${(question.options && question.options[0]) || ''}" required>
            <input type="text" placeholder="Opción 2" class="question-option admin-input" value="${(question.options && question.options[1]) || ''}" required>
            <input type="text" placeholder="Opción 3" class="question-option admin-input" value="${(question.options && question.options[2]) || ''}" required>
            <input type="text" placeholder="Opción 4" class="question-option admin-input" value="${(question.options && question.options[3]) || ''}" required>
            <input type="text" placeholder="Respuesta Correcta (texto exacto)" class="question-answer admin-input" value="${question.answer || ''}" required>
        </div>
    `;
}

function addQuestion() {
    const container = document.getElementById('questions-container');
    const newIndex = container.children.length;
    container.insertAdjacentHTML('beforeend', renderQuestionForm(newIndex));
}

async function saveQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('quiz-title').value.trim();
    const description = document.getElementById('quiz-description').value.trim();
    const questionElements = document.querySelectorAll('.question-form-group');

    const questionSet = [];
    let isValid = true;
    questionElements.forEach(qEl => {
        const questionText = qEl.querySelector('.question-text').value.trim();
        const options = Array.from(qEl.querySelectorAll('.question-option')).map(opt => opt.value.trim());
        const answer = qEl.querySelector('.question-answer').value.trim();

        if (!title || !description || !category || !questionText || options.some(o => !o) || !answer) {
            isValid = false;
        }

        if (isValid && !options.includes(answer)) {
            showToast(`La respuesta de la pregunta "${questionText.substring(0, 20)}..." debe coincidir.`, 'error');
            isValid = false;
        }
        questionSet.push({ question: questionText, options, answer });
    });

    if (!isValid) {
        showToast('Completa todos los campos y verifica las respuestas.', 'error');
        return;
    }

    const category = document.getElementById('quiz-category').value.trim();
    const quizData = { title, description, category, questionSet };
    try {
        if (currentEditingQuizId) {
            await db.collection('quizzes').doc(currentEditingQuizId).set(quizData);
            showToast('Quiz actualizado.', 'success');
        } else {
            await db.collection('quizzes').add(quizData);
            showToast('Quiz creado.', 'success');
        }
        document.getElementById('admin-quiz-form-container').style.display = 'none';
        loadQuizzes();
    } catch (error) {
        showToast('Error al guardar el quiz.', 'error');
    }
}

async function deleteQuiz(quizId) {
    if (confirm('¿Seguro que quieres eliminar este quiz?')) {
        try {
            await db.collection('quizzes').doc(quizId).delete();
            showToast('Quiz eliminado.', 'info');
            loadQuizzes();
        } catch (error) {
            showToast('No se pudo eliminar el quiz.', 'error');
        }
    }
}

// --- GESTIÓN DE USUARIOS ---

async function loadUsers() {
    const userList = document.getElementById('admin-user-list');
    userList.innerHTML = '<div class="loading-spinner">Cargando usuarios...</div>';

    try {
        const snapshot = await db.collection('users').orderBy('displayName').get();
        if (snapshot.empty) {
            userList.innerHTML = '<p>No hay usuarios registrados.</p>';
            return;
        }

        let usersHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            usersHTML += `
                <div class="admin-list-item">
                    <div class="user-info">
                        <img src="${user.photoURL}" class="admin-user-avatar" alt="Avatar">
                        <div>
                            <strong>${user.displayName}</strong>
                            <small>${user.email || 'Sin email'}</small>
                        </div>
                    </div>
                    <div class="user-stats">
                        <span>Score: ${user.score || 0}</span>
                        <span>Rango: ${user.rank || 'N/A'}</span>
                        ${user.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-sm" data-id="${doc.id}">Editar</button>
                    </div>
                </div>
            `;
        });
        userList.innerHTML = usersHTML;
        
        userList.querySelectorAll('.btn-secondary').forEach(btn => {
            btn.addEventListener('click', (e) => editUser(e.target.dataset.id));
        });

    } catch (error) {
        console.error("Error cargando usuarios:", error);
        userList.innerHTML = '<p>Error al cargar los usuarios.</p>';
    }
}

async function editUser(userId) {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
        showToast('Usuario no encontrado.', 'error');
        return;
    }
    const user = doc.data();
    const formContainer = document.getElementById('admin-user-form-container');
    formContainer.style.display = 'block';

    formContainer.innerHTML = `
        <h3>Editando a ${user.displayName}</h3>
        <form id="user-form">
            <div class="form-group">
                <label for="user-score">Puntuación</label>
                <input type="number" id="user-score" class="admin-input" value="${user.score || 0}">
            </div>
            <div class="form-group">
                <label for="user-rank">Rango</label>
                <input type="text" id="user-rank" class="admin-input" value="${user.rank || 'Novato'}">
            </div>
            <div class="form-group form-check">
                <input type="checkbox" id="user-is-admin" ${user.isAdmin ? 'checked' : ''}>
                <label for="user-is-admin">Es Administrador</label>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                <button type="button" id="cancel-user-edit-btn" class="btn">Cancelar</button>
            </div>
        </form>
    `;

    document.getElementById('user-form').addEventListener('submit', (e) => saveUser(e, userId));
    document.getElementById('cancel-user-edit-btn').addEventListener('click', () => {
        formContainer.style.display = 'none';
        formContainer.innerHTML = '';
    });
}

async function saveUser(e, userId) {
    e.preventDefault();
    const score = parseInt(document.getElementById('user-score').value, 10);
    const rank = document.getElementById('user-rank').value.trim();
    const isAdmin = document.getElementById('user-is-admin').checked;

    try {
        await db.collection('users').doc(userId).update({
            score,
            rank,
            isAdmin
        });
        showToast('Usuario actualizado con éxito.', 'success');
        document.getElementById('admin-user-form-container').style.display = 'none';
        loadUsers();
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        showToast('Error al guardar los cambios.', 'error');
    }
}
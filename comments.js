
// --- Firestore Comments Section Logic ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCCwYwEHGqy7bee1KiCwkKTJh6YZettHIM",
    authDomain: "chronotechcomments.firebaseapp.com",
    projectId: "chronotechcomments",
    storageBucket: "chronotechcomments.firebasestorage.app",
    messagingSenderId: "651005636861",
    appId: "1:651005636861:web:ed73d2ec131535fd6e0e94",
    measurementId: "G-XDNLGB2L77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const commentsCollection = collection(db, 'comments');

document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const commentText = document.getElementById('comment-text');
    const charCounter = document.getElementById('char-counter');
    const commentsLoading = document.getElementById('comments-loading');
    const noCommentsMessage = document.getElementById('no-comments-message');
    const maxChars = 1000;

    if (commentText && charCounter) {
        commentText.addEventListener('input', () => {
            const remaining = maxChars - commentText.value.length;
            charCounter.textContent = `${remaining} caracteres restantes`;
            if (remaining < 0) {
                charCounter.style.color = 'var(--accent)';
            } else {
                charCounter.style.color = 'var(--text-light)';
            }
        });
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('comment-name');
            const textInput = document.getElementById('comment-text');
            const submitBtn = commentForm.querySelector('button');

            const name = nameInput.value.trim();
            const text = textInput.value.trim();

            if (name === '' || text === '') {
                alert('Por favor, completa tu nombre y tu comentario.');
                return;
            }
            
            if (text.length > maxChars) {
                alert(`El comentario no puede exceder los ${maxChars} caracteres.`);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                await addDoc(commentsCollection, {
                    name: name,
                    text: text,
                    timestamp: serverTimestamp()
                });
                commentForm.reset();
                charCounter.textContent = `${maxChars} caracteres restantes`;
            } catch (error) {
                console.error("Error al añadir el comentario: ", error);
                alert("Hubo un error al enviar tu comentario. Por favor, inténtalo de nuevo.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Comentario';
            }
        });
    }
    
    function timeAgo(date) {
        if (!date) return 'un momento';
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) {
            const years = Math.floor(interval);
            return `hace ${years} ${years > 1 ? 'años' : 'año'}`;
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            const months = Math.floor(interval);
            return `hace ${months} ${months > 1 ? 'meses' : 'mes'}`;
        }
        interval = seconds / 86400;
        if (interval > 1) {
            const days = Math.floor(interval);
            return `hace ${days} ${days > 1 ? 'días' : 'día'}`;
        }
        interval = seconds / 3600;
        if (interval > 1) {
            const hours = Math.floor(interval);
            return `hace ${hours} ${hours > 1 ? 'horas' : 'hora'}`;
        }
        interval = seconds / 60;
        if (interval > 1) {
            const minutes = Math.floor(interval);
            return `hace ${minutes} ${minutes > 1 ? 'minutos' : 'minuto'}`;
        }
        return "justo ahora";
    }

    function renderComment(doc) {
        const data = doc.data();
        const firstLetter = data.name ? data.name.charAt(0).toUpperCase() : '?';
        const date = data.timestamp ? data.timestamp.toDate() : null;
        const relativeTime = timeAgo(date);

        const li = document.createElement('li');
        li.className = 'comment-item';
        
        const name = document.createElement('span');
        name.className = 'comment-author';
        name.textContent = data.name;

        const text = document.createElement('p');
        text.className = 'comment-text';
        text.textContent = data.text;

        li.innerHTML = `
            <div class="comment-avatar">${firstLetter}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author-placeholder"></span>
                    <span class="comment-timestamp">${relativeTime}</span>
                </div>
            </div>
        `;
        li.querySelector('.comment-header').replaceChild(name, li.querySelector('.comment-author-placeholder'));
        li.querySelector('.comment-content').appendChild(text);

        return li;
    }

    const q = query(commentsCollection, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
        if (commentsLoading) commentsLoading.style.display = 'none';

        if (snapshot.empty) {
            if (noCommentsMessage) noCommentsMessage.style.display = 'block';
            if (commentsList) commentsList.innerHTML = '';
        } else {
            if (noCommentsMessage) noCommentsMessage.style.display = 'none';
            if (commentsList) {
                commentsList.innerHTML = '';
                snapshot.forEach(doc => {
                    commentsList.appendChild(renderComment(doc));
                });
            }
        }
    }, (error) => {
        console.error("Error al cargar comentarios: ", error);
        if (commentsLoading) {
            commentsLoading.innerHTML = '<p>Error al cargar los comentarios. Revisa la consola para más detalles.</p>';
            commentsLoading.style.display = 'block';
        }
    });
});

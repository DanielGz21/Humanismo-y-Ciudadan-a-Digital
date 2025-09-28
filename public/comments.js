
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, runTransaction, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase-config.js'; // Import centralized db
import { getCurrentUser, isCurrentUserAdmin } from "./auth.js";

const commentsCollection = collection(db, 'comments');

// --- Actions (Like, Reply, Delete) ---
const handleLikeClick = async (commentId) => { /* ... same as before ... */ };
const handleReplySubmit = async (e, commentId) => { /* ... same as before ... */ };

const handleDelete = async (commentId, replyId = null) => {
    if (!isCurrentUserAdmin()) return;

    const confirmMsg = replyId ? "¿Estás seguro de que quieres eliminar esta respuesta?" : "¿Estás seguro de que quieres eliminar este comentario y todas sus respuestas?";
    if (!confirm(confirmMsg)) return;

    const docRef = replyId ? doc(db, 'comments', commentId, 'replies', replyId) : doc(db, 'comments', commentId);
    try {
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error al eliminar el documento:", error);
    }
};

// --- Rendering ---
function renderComment(doc) {
    const data = doc.data();
    const user = getCurrentUser();
    const isAdmin = isCurrentUserAdmin();
    const avatar = data.photoURL ? `<img src="${data.photoURL}" alt="${data.name}" class="comment-avatar-img">` : (data.name ? data.name.charAt(0).toUpperCase() : '?');
    const isLiked = user && data.likes && data.likes[user.uid];

    const li = document.createElement('li');
    li.className = 'comment-item';
    li.innerHTML = `
        <div class="comment-avatar">${avatar}</div>
        <div class="comment-content">
            <div class="comment-header"><span class="comment-author">${escapeHTML(data.name)}</span><span class="comment-timestamp">${timeAgo(data.timestamp?.toDate())}</span></div>
            <p class="comment-text">${escapeHTML(data.text)}</p>
            <div class="comment-actions">
                <button class="like-btn ${isLiked ? 'active' : ''}" ${user ? '' : 'disabled'}>❤️</button>
                <span class="like-count">${data.likeCount || 0}</span>
                <button class="reply-btn" ${user ? '' : 'disabled'}>Responder</button>
                ${isAdmin ? `<button class="delete-btn">Eliminar</button>` : ''}
            </div>
            <div class="reply-form-container"></div>
            <ul class="replies-list"></ul>
        </div>
    `;

    // Add event listeners
    li.querySelector('.like-btn').addEventListener('click', () => handleLikeClick(doc.id));
    li.querySelector('.reply-btn').addEventListener('click', (e) => {
    const container = e.target.closest('.comment-content').querySelector('.reply-form-container');
    if (container.innerHTML === '') {
        const replyForm = document.createElement('form');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `<textarea class="reply-textarea" placeholder="Escribe una respuesta..." required></textarea><button type="submit" class="btn">Publicar</button>`;
        replyForm.addEventListener('submit', (e) => handleReplySubmit(e, doc.id));
        container.appendChild(replyForm);
    } else {
        const form = container.querySelector('form');
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    }
});
    if (isAdmin) {
        li.querySelector('.delete-btn').addEventListener('click', () => handleDelete(doc.id));
    }

    return li;
}

function renderReply(doc, parentCommentId) {
    const data = doc.data();
    const isAdmin = isCurrentUserAdmin();
    const avatar = data.photoURL ? `<img src="${data.photoURL}" alt="${data.name}" class="comment-avatar-img">` : (data.name ? data.name.charAt(0).toUpperCase() : '?');
    
    const li = document.createElement('li');
    li.className = 'comment-item reply-item';
    li.innerHTML = `
        <div class="comment-avatar small-avatar">${avatar}</div>
        <div class="comment-content">
            <div class="comment-header"><span class="comment-author">${escapeHTML(data.name)}</span><span class="comment-timestamp">${timeAgo(data.timestamp?.toDate())}</span></div>
            <p class="comment-text">${escapeHTML(data.text)}</p>
            ${isAdmin ? `<div class="comment-actions"><button class="delete-btn">Eliminar</button></div>` : ''}
        </div>
    `;

    if (isAdmin) {
        li.querySelector('.delete-btn').addEventListener('click', () => handleDelete(parentCommentId, doc.id));
    }

    return li;
}

// --- Utility Functions ---
function timeAgo(date) {
    if (!date) return 'justo ahora';
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = { año: 31536000, mes: 2592000, día: 86400, hora: 3600, minuto: 60 };
    for (let unit in intervals) {
        let interval = seconds / intervals[unit];
        if (interval > 1) return `hace ${Math.floor(interval)} ${unit}${Math.floor(interval) > 1 ? 's' : ''}`;
    }
    return "justo ahora";
}

function escapeHTML(str = '') {
    return str.replace(/[&<>"'/]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[s]));
}

// Functions that were summarized need to be fully included again
document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) { alert('Debes iniciar sesión para comentar.'); return; }
            
            const textInput = document.getElementById('comment-text');
            const text = textInput.value.trim();
            if (text === '') return;

            const submitBtn = commentForm.querySelector('button');
            submitBtn.disabled = true; submitBtn.textContent = 'Enviando...';

            try {
                await addDoc(commentsCollection, { name: user.displayName, text, timestamp: serverTimestamp(), uid: user.uid, photoURL: user.photoURL, likes: {}, likeCount: 0 });
                commentForm.reset();
            } catch (error) {
                console.error("Error al añadir comentario: ", error);
            } finally {
                submitBtn.disabled = false; submitBtn.textContent = 'Enviar Comentario';
            }
        });
    }

    const q = query(commentsCollection, orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        document.getElementById('comments-loading').style.display = 'none';
        const noCommentsMessage = document.getElementById('no-comments-message');
        if (snapshot.empty) {
            noCommentsMessage.style.display = 'block';
            commentsList.innerHTML = '';
        } else {
            noCommentsMessage.style.display = 'none';
            commentsList.innerHTML = '';
            snapshot.forEach(doc => {
                const commentLi = renderComment(doc);
                commentsList.appendChild(commentLi);
                const repliesListEl = commentLi.querySelector('.replies-list');
                const repliesQuery = query(collection(db, 'comments', doc.id, 'replies'), orderBy('timestamp', 'asc'));
                onSnapshot(repliesQuery, (replySnapshot) => {
                    repliesListEl.innerHTML = '';
                    replySnapshot.forEach(replyDoc => {
                        repliesListEl.appendChild(renderReply(replyDoc, doc.id));
                    });
                });
            });
        }
    });
});

import { db } from './firebase-config.js';
import { getCurrentUser, isCurrentUserAdmin } from "./auth.js";
import { showToast } from './notifications.js';

// The main initialization function for the comments module
export function initComments(user) {
    const commentsCollection = db.collection('comments');
    const commentsList = document.getElementById('comments-container');
    const commentForm = document.getElementById('comment-form');
    const loading = document.getElementById('comments-loading');

    if (commentForm) {
        commentForm.addEventListener('submit', (e) => handleCommentSubmit(e));
    }

    const q = commentsCollection.orderBy('timestamp', 'desc');
    q.onSnapshot(snapshot => {
        if(loading) loading.style.display = 'none';
        commentsList.innerHTML = '';
        if (snapshot.empty) {
            commentsList.innerHTML = '<p>Sé el primero en dejar un comentario.</p>';
            return;
        }
        snapshot.forEach(doc => {
            commentsList.appendChild(renderComment(doc));
        });
    }, error => {
        console.error("Error al cargar comentarios: ", error);
        if(loading) loading.textContent = 'Error al cargar comentarios.';
    });
}

function renderComment(doc) {
    const data = doc.data();
    const user = getCurrentUser();
    const isAdmin = isCurrentUserAdmin();
    const li = document.createElement('div');
    li.className = 'comment';
    const isLiked = user && data.likes && data.likes[user.uid];
    
    const photoURL = data.photoURL || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23${hashCode(data.uid || 'default')}"/><text x="50%" y="50%" style="fill:%23fff;font-size:20px;font-family:sans-serif;text-anchor:middle;dominant-baseline:central">${escapeHTML(data.name[0] || '?')}</text></svg>`;

    li.innerHTML = `
        <img src="${photoURL}" alt="${escapeHTML(data.name)}" class="comment-avatar">
        <div class="comment-body">
            <p class="comment-author">${escapeHTML(data.name)}</p>
            <p>${escapeHTML(data.text)}</p>
            <div class="comment-actions">
                <button class="like-btn ${isLiked ? 'active' : ''}">❤️ ${data.likeCount || 0}</button>
                <button class="reply-btn">Responder</button>
                ${(user && user.uid === data.uid) || isAdmin ? '<button class="delete-btn">Eliminar</button>' : ''}
            </div>
            <div class="reply-form-container"></div>
            <div class="replies-list"></div>
        </div>
    `;

    li.querySelector('.like-btn').addEventListener('click', () => handleLike(doc.id));
    li.querySelector('.reply-btn').addEventListener('click', (e) => toggleReplyForm(e, doc.id));
    const deleteBtn = li.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDelete(doc.id));
    }

    const repliesListEl = li.querySelector('.replies-list');
    const repliesQuery = db.collection('comments').doc(doc.id).collection('replies').orderBy('timestamp', 'asc');
    repliesQuery.onSnapshot(replySnapshot => {
        repliesListEl.innerHTML = '';
        replySnapshot.forEach(replyDoc => {
            repliesListEl.appendChild(renderReply(replyDoc, doc.id));
        });
    });

    return li;
}

function renderReply(doc, parentId) {
    const data = doc.data();
    const user = getCurrentUser();
    const isAdmin = isCurrentUserAdmin();
    const li = document.createElement('div');
    li.className = 'comment reply';
    const photoURL = data.photoURL || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23${hashCode(data.uid || 'default')}"/><text x="50%" y="50%" style="fill:%23fff;font-size:15px;font-family:sans-serif;text-anchor:middle;dominant-baseline:central">${escapeHTML(data.name[0] || '?')}</text></svg>`;

    li.innerHTML = `
        <img src="${photoURL}" alt="${escapeHTML(data.name)}" class="comment-avatar small">
        <div class="comment-body">
            <p class="comment-author">${escapeHTML(data.name)}</p>
            <p>${escapeHTML(data.text)}</p>
            ${(user && user.uid === data.uid) || isAdmin ? '<div class="comment-actions"><button class="delete-reply-btn">Eliminar</button></div>' : ''}
        </div>
    `;

    const deleteBtn = li.querySelector('.delete-reply-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDelete(parentId, doc.id));
    }
    return li;
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return showToast('Debes iniciar sesión para comentar.', 'error');
    const textarea = document.getElementById('comment-input');
    const text = textarea.value.trim();
    if (text === '') return;
    const submitBtn = document.getElementById('submit-comment');
    submitBtn.disabled = true;
    try {
        await db.collection('comments').add({ name: user.displayName, text, uid: user.uid, photoURL: user.photoURL, timestamp: firebase.firestore.FieldValue.serverTimestamp(), likes: {}, likeCount: 0 });
        textarea.value = '';
        showToast('Comentario publicado', 'success');
    } catch (error) { console.error("Error: ", error); showToast('No se pudo publicar', 'error');
    } finally { submitBtn.disabled = false; }
}

function toggleReplyForm(event, commentId) {
    const container = event.target.closest('.comment-body').querySelector('.reply-form-container');
    if (container.innerHTML !== '') {
        container.innerHTML = '';
    } else {
        const form = document.createElement('form');
        form.className = 'reply-form';
        form.innerHTML = `<textarea placeholder="Escribe una respuesta..."></textarea><button type="submit" class="btn">Publicar</button>`;
        form.addEventListener('submit', (e) => handleReplySubmit(e, commentId));
        container.appendChild(form);
    }
}

async function handleReplySubmit(e, parentId) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return showToast('Debes iniciar sesión para responder.', 'error');
    const textarea = e.target.querySelector('textarea');
    const text = textarea.value.trim();
    if (text === '') return;
    try {
        const replyCollection = db.collection('comments').doc(parentId).collection('replies');
        await replyCollection.add({ name: user.displayName, text, uid: user.uid, photoURL: user.photoURL, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        e.target.parentElement.innerHTML = '';
    } catch (error) { console.error("Error: ", error); showToast('No se pudo responder', 'error'); }
}

function handleLike(commentId) {
    const user = getCurrentUser();
    if (!user) return showToast('Debes iniciar sesión para dar like.', 'error');
    const commentRef = db.collection('comments').doc(commentId);
    db.runTransaction(async (t) => {
        const doc = await t.get(commentRef); if (!doc.exists) throw "Error";
        const data = doc.data(); const likes = data.likes || {}; let count = data.likeCount || 0;
        if (likes[user.uid]) { delete likes[user.uid]; count--; } else { likes[user.uid] = true; count++; }
        t.update(commentRef, { likes, likeCount: count });
    }).catch(err => { console.error(err); showToast('No se pudo procesar el like.', 'error'); });
}

function handleDelete(commentId, replyId = null) {
    const docRef = replyId ? db.collection('comments').doc(commentId).collection('replies').doc(replyId) : db.collection('comments').doc(commentId);
    if (!confirm("¿Estás seguro?")) return;
    docRef.delete()
        .then(() => showToast('Eliminado correctamente.', 'info'))
        .catch(err => { console.error(err); showToast('No se pudo eliminar.', 'error'); });
}

function escapeHTML(str = '') {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color.substring(1, 7);
}

// Add styles on module load
const style = document.createElement('style');
style.innerHTML = `
    .comment, .reply { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .reply { margin-left: 50px; }
    .comment-avatar { width: 40px; height: 40px; border-radius: 50%; }
    .comment-avatar.small { width: 30px; height: 30px; }
    .comment-body { flex-grow: 1; }
    .comment-actions { display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.9rem; }
    .like-btn, .delete-btn, .reply-btn, .delete-reply-btn { background: none; border: none; color: var(--text-secondary-color); cursor: pointer; padding: 0; }
    .like-btn.active { color: var(--accent-neon-magenta); }
    .reply-form { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .reply-form textarea { width: 100%; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 0.5rem; border-radius: var(--border-radius); }
    .reply-form button { align-self: flex-end; }
`;
document.head.appendChild(style);
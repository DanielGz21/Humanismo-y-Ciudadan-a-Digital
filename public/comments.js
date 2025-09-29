import { db } from './firebase-config.js';
import { getCurrentUser, isCurrentUserAdmin } from "./auth.js";
import { showToast } from './notifications.js';
import { checkAchievements } from './achievements.js';

// La función principal para inicializar el módulo de comentarios
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
        // Bucle corregido para manejar la función asíncrona
        snapshot.forEach(async (doc, index) => {
            const commentEl = await renderComment(doc); // Esperamos a que el elemento se cree
            if (commentEl) {
                commentEl.style.animationDelay = `${index * 100}ms`;
                commentsList.appendChild(commentEl);
            }
        });
    }, error => {
        console.error("Error al cargar comentarios: ", error);
        if(loading) loading.textContent = 'Error al cargar comentarios.';
    });
}

async function renderComment(doc) {
    const data = doc.data();
    const user = getCurrentUser();
    const isAdmin = await isCurrentUserAdmin();
    const li = document.createElement('div');
    li.className = 'comment';
    const isLiked = user && data.likes && data.likes[user.uid];
    
    const photoURL = data.photoURL || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#${hashCode(data.uid || 'default')}"/><text x="50%" y="50%" style="fill:#fff;font-size:20px;font-family:sans-serif;text-anchor:middle;dominant-baseline:central">${escapeHTML(data.name[0] || '?')}</text></svg>`)}`;

    li.innerHTML = `
        <img src="${photoURL}" alt="${escapeHTML(data.name)}" class="comment-avatar">
        <div class="comment-body">
            <p class="comment-author">${escapeHTML(data.name)}</p>
            <p>${escapeHTML(data.text)}</p>
            <div class="comment-actions">
                <button class="like-btn ${isLiked ? 'active' : ''}">❤️ ${data.likeCount || 0}</button>
                <button class="reply-btn">Responder</button>
                ${(user && user.uid === data.uid) || isAdmin ? `<button class="delete-btn" data-comment-id="${doc.id}">Eliminar</button>` : ''}
            </div>
            <div class="reply-form-container"></div>
            <div class="replies-list"></div>
        </div>
    `;

        li.querySelector('.like-btn').addEventListener('click', () => handleLike(parentId, doc.id));
    li.querySelector('.reply-btn').addEventListener('click', (e) => toggleReplyForm(e, doc.id));
    const deleteBtn = li.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteClick);
    }

    const repliesListEl = li.querySelector('.replies-list');
    const repliesQuery = db.collection('comments').doc(doc.id).collection('replies').orderBy('timestamp', 'asc');
    repliesQuery.onSnapshot(replySnapshot => {
        repliesListEl.innerHTML = '';
        replySnapshot.forEach(async replyDoc => { // Bucle de respuestas también asíncrono
            const replyEl = await renderReply(replyDoc, doc.id);
            repliesListEl.appendChild(replyEl);
        });
    });

    return li;
}

async function renderReply(doc, parentId) {
    const data = doc.data();
    const user = getCurrentUser();
    const isAdmin = await isCurrentUserAdmin();
    const li = document.createElement('div');
    li.className = 'comment reply';
    const photoURL = data.photoURL || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#${hashCode(data.uid || 'default')}"/><text x="50%" y="50%" style="fill:#fff;font-size:15px;font-family:sans-serif;text-anchor:middle;dominant-baseline:central">${escapeHTML(data.name[0] || '?')}</text></svg>`)}`;

    const isLiked = user && data.likes && data.likes[user.uid];
    li.innerHTML = `
        <img src="${photoURL}" alt="${escapeHTML(data.name)}" class="comment-avatar small">
        <div class="comment-body">
            <p class="comment-author">${escapeHTML(data.name)}</p>
            <p>${escapeHTML(data.text)}</p>
            <div class="comment-actions">
                <button class="like-btn ${isLiked ? 'active' : ''}">❤️ ${data.likeCount || 0}</button>
                <button class="reply-btn">Responder</button>
                ${(user && user.uid === data.uid) || isAdmin ? `<button class="delete-reply-btn" data-parent-id="${parentId}" data-reply-id="${doc.id}">Eliminar</button>` : ''}
            </div>
            <div class="reply-form-container"></div>
            <div class="replies-list"></div>
        </div>
    `;

    const deleteBtn = li.querySelector('.delete-reply-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteClick);
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

        // Incrementar el contador de comentarios del usuario
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });

        // Verificar logros después de actualizar el contador de comentarios
        await checkAchievements(user, db);
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

function handleLike(commentId, replyId = null) { // commentId es el ID del comentario principal, replyId es el ID de la respuesta
    const user = getCurrentUser();
    if (!user) return showToast('Debes iniciar sesión para dar like.', 'error');

    let docRef;
    if (replyId) { // Es una respuesta
        docRef = db.collection('comments').doc(commentId).collection('replies').doc(replyId);
    } else { // Es un comentario de nivel superior
        docRef = db.collection('comments').doc(commentId);
    }

    db.runTransaction(async (t) => {
        const doc = await t.get(docRef);
        if (!doc.exists) throw "Error";
        const data = doc.data();
        const likes = data.likes || {};
        let count = data.likeCount || 0;

        if (likes[user.uid]) {
            delete likes[user.uid];
            count--;
        } else {
            likes[user.uid] = true;
            count++;
        }
        t.update(docRef, { likes, likeCount: count });
    }).catch(err => {
        console.error(err);
        showToast('No se pudo procesar el like.', 'error');
    });
}

function handleDeleteClick(event) {
    const button = event.target.closest('button');
    const { commentId, parentId, replyId } = button.dataset;

    if (confirm('¿Seguro que quieres eliminar este comentario?')) {
        const docRef = replyId 
            ? db.collection('comments').doc(parentId).collection('replies').doc(replyId) 
            : db.collection('comments').doc(commentId);

        docRef.delete()
            .then(() => showToast('Eliminado correctamente.', 'info'))
            .catch(err => { console.error(err); showToast('No se pudo eliminar.', 'error'); });
    }
}

async function checkForumAchievements(userId) {
    const user = getCurrentUser();
    if (!user) return;

    const userComments = await db.collection('comments').where('uid', '==', userId).get();
    const commentsCount = userComments.size;
    const userAchievementsRef = db.collection('users').doc(userId).collection('unlockedAchievements');
    
    const forumAchievements = {
      'forum_1': { name: 'Primer Contacto', description: 'Publica tu primer comentario.', icon: 'fas fa-comments' },
      'forum_5': { name: 'Voz de la Comunidad', description: 'Publica 5 comentarios.', icon: 'fas fa-bullhorn' }
    };

    if (commentsCount >= 1) {
        const achievementRef = userAchievementsRef.doc('forum_1');
        const doc = await achievementRef.get();
        if(!doc.exists) {
            await achievementRef.set({
                ...forumAchievements['forum_1'],
                unlockedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('¡Logro desbloqueado: Primer Contacto!', 'success');
        }
    }

    if (commentsCount >= 5) {
        const achievementRef = userAchievementsRef.doc('forum_5');
        const doc = await achievementRef.get();
        if(!doc.exists) {
            await achievementRef.set({
                ...forumAchievements['forum_5'],
                unlockedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('¡Logro desbloqueado: Voz de la Comunidad!', 'success');
        }
    }
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
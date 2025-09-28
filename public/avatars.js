import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './notifications.js';

const avatars = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=2',
    'https://i.pravatar.cc/150?img=3',
    'https://i.pravatar.cc/150?img=4',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=6',
    'https://i.pravatar.cc/150?img=7',
    'https://i.pravatar.cc/150?img=8',
];

export function showAvatarSelection() {
    let modal = document.getElementById('avatar-selection-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'avatar-selection-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Elige tu nuevo avatar</h2>
            <div class="avatar-grid">
                ${avatars.map(url => `<img src="${url}" alt="Avatar" class="avatar-option">`).join('')}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.querySelectorAll('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            updateUserProfileAvatar(img.src);
            modal.style.display = 'none';
        });
    });
}

async function updateUserProfileAvatar(newAvatarUrl) {
    const user = getCurrentUser();
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);

    try {
        await user.updateProfile({
            photoURL: newAvatarUrl
        });

        await userRef.update({
            photoURL: newAvatarUrl
        });

        showToast('¡Avatar actualizado!', 'success');
        setTimeout(() => window.location.reload(), 1000); // Recargar para ver los cambios en todas partes
    } catch (error) {
        console.error("Error al actualizar el avatar:", error);
        showToast('No se pudo actualizar el avatar.', 'error');
    }
}
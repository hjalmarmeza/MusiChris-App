// LÓGICA DE NEGOCIO Y ACCIONES DE LA APP

// --- AUTENTICACIÓN ---
async function handleLoginAttempt() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();

    if (email === 'hjalmar' && pass === '258632') {
        doLogin({ name: 'Hjalmar', email: 'admin@musichris.com', role: 'admin', avatar: ADMIN_AVATAR });
        return;
    }

    if (!appConfig.data) await loadAppData();

    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    if (user && pass === (user.password || '123')) {
        doLogin(user);
    } else {
        showToast("Credenciales incorrectas", 'error');
    }
}

function doLogin(user) {
    appConfig.user = user;
    appConfig.isLoggedIn = true;
    appConfig.isAdmin = (user.role === 'admin');
    localStorage.setItem('appConfig', JSON.stringify({
        user,
        isLoggedIn: true,
        isAdmin: appConfig.isAdmin
    }));
    document.getElementById('view-login').style.display = 'none';
    const mainView = appConfig.isAdmin ? 'view-admin' : 'view-user';
    showView(mainView);
    loadAppData();
}

function app_logout() {
    if (dom.audioElement) dom.audioElement.pause();
    localStorage.removeItem('appConfig');
    location.reload();
}

// --- NAVEGACIÓN ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });
    const view = document.getElementById(viewId);
    if (view) {
        view.style.display = 'block';
        setTimeout(() => view.classList.add('active'), 10);
    }
}

function switchTab(id, btn) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const container = parent.nextElementSibling.parentElement;
    container.querySelectorAll('.list-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// --- ACCIONES DE CONTENIDO ---
async function do_upload() {
    const title = document.getElementById('upTitle').value.trim();
    const url = document.getElementById('upUrl').value.trim();
    const genre = document.getElementById('upGenre').value.trim();
    const album = document.getElementById('upAlbum').value;

    if (!title) return showToast("Título obligatorio", 'error');

    if (appConfig.editingSongId) {
        const song = appConfig.data.songs.find(s => s.id === appConfig.editingSongId);
        if (song) {
            song.title = title;
            song.genre = genre;
            song.album = album;
            if (url) song.url = url;
        }
    } else {
        appConfig.data.songs.push({
            id: Date.now(),
            title,
            genre,
            album,
            url,
            plays: 0,
            likes: [],
            addedDate: Date.now()
        });
    }

    await saveData();
    updateUI();
    closeModal('dom_modal_upload');
    showToast("Cambios guardados", 'success');
}

async function toggleLikeCurrent() {
    if (appConfig.isGuest) return showToast("Inicia sesión para esto", 'info');
    if (!appConfig.currentSong || !appConfig.user) return;

    const song = appConfig.data.songs.find(s => s.id === appConfig.currentSong.id);
    const email = appConfig.user.email;

    if (song.likes.includes(email)) {
        song.likes = song.likes.filter(e => e !== email);
    } else {
        song.likes.push(email);
    }

    await saveData();
    updateLikeIcon();
}

async function deleteSong(e, id) {
    if (e) e.stopPropagation();
    if (!confirm('¿Eliminar esta canción?')) return;

    appConfig.data.songs = appConfig.data.songs.filter(s => s.id !== id);
    await saveData();
    updateUI();
    showToast("Canción eliminada", 'success');
}

async function deleteAlbum(e, index) {
    if (e) e.stopPropagation();
    if (!confirm('¿Eliminar este álbum?')) return;

    appConfig.data.albums.splice(index, 1);
    await saveData();
    updateUI();
    showToast("Álbum eliminado", 'success');
}

function editAlbum(e, index) {
    if (e) e.stopPropagation();
    const album = appConfig.data.albums[index];
    if (!album) return;

    appConfig.editingAlbumIndex = index;
    const newName = prompt("Nuevo nombre del álbum:", album.name);
    if (newName) {
        album.name = newName;
        saveData().then(() => updateUI());
    }
}

async function createAlbum() {
    const name = prompt("Nombre del nuevo álbum:");
    if (!name) return;

    const artist = prompt("Nombre del artista:", appConfig.user.name);
    if (!artist) return;

    const cover = prompt("URL de la portada (opcional):", DEFAULT_COVER);

    appConfig.data.albums.push({
        name,
        artist,
        cover: cover || DEFAULT_COVER,
        addedDate: Date.now()
    });

    await saveData();
    updateUI();
    showToast("Álbum creado", 'success');
}


async function deleteUser(email) {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return;
    appConfig.data.users = appConfig.data.users.filter(u => u.email !== email);
    await saveData();
    updateUI();
}

function changeAvatar() {
    const newAvatar = prompt("URL del nuevo avatar (o dejar vacío para aleatorio):");
    if (newAvatar !== null) {
        appConfig.user.avatar = newAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
        saveData().then(() => {
            updateUI();
            showToast("Avatar actualizado", 'success');
        });
    }
}

function openAlbum(index) {
    const album = appConfig.data.albums[index];
    if (!album) return;

    const albumSongs = appConfig.data.songs.filter(s => norm(s.album) === norm(album.name));

    if (albumSongs.length === 0) {
        showToast("Álbum vacío", 'info');
        return;
    }

    appConfig.tempPlaylist = albumSongs;
    updateUI(albumSongs);
    showToast(`Mostrando álbum: ${album.name}`, 'info');
}

function updateLikeIcon() {
    const btn = document.getElementById('btnLikePlayer');
    if (!btn || !appConfig.currentSong || !appConfig.user) return;

    const isLiked = appConfig.currentSong.likes.includes(appConfig.user.email);
    btn.textContent = isLiked ? 'favorite' : 'favorite_border';
    btn.style.color = isLiked ? 'var(--accent)' : 'white';
}

function activateGuestMode() {
    const songId = appConfig.pendingSongId;
    const song = appConfig.data.songs.find(s => s.id === songId);

    if (song) {
        document.getElementById('view-login').style.display = 'none';
        showView('view-guest-player');
        playSong(song);
        showToast("Escuchando como invitado", 'info');
    } else {
        showToast("Canción no encontrada", 'error');
        document.getElementById('view-login').style.display = 'flex';
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Audio Setup
    dom.audioElement = document.createElement('audio');
    document.body.appendChild(dom.audioElement);

    dom.audioElement.addEventListener('timeupdate', updateProgress);
    dom.audioElement.addEventListener('ended', next);

    // Auth Check
    const saved = localStorage.getItem('appConfig');
    if (saved) {
        const parsed = JSON.parse(saved);
        doLogin(parsed.user);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('s')) {
            appConfig.pendingSongId = parseInt(urlParams.get('s'));
            appConfig.isGuest = true;
            loadAppData();
        } else {
            document.getElementById('view-login').style.display = 'flex';
        }
    }

    setupPWA();
});

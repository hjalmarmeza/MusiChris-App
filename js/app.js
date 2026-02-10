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

async function doLogin(user) {
    appConfig.user = user;
    appConfig.isLoggedIn = true;
    appConfig.isAdmin = (user.role === 'admin');
    localStorage.setItem('appConfig', JSON.stringify({
        user,
        isLoggedIn: true,
        isAdmin: appConfig.isAdmin
    }));

    // Esperamos a que los datos se carguen antes de verificar mantenimiento
    await loadAppData();

    // 🔧 VERIFICAR MODO MANTENIMIENTO (solo para usuarios regulares)
    if (!appConfig.isAdmin && appConfig.data && appConfig.data.maintenanceMode === true) {
        // Usuario regular intentando entrar durante mantenimiento
        showMaintenanceScreen();
        return; // Detener el login
    }

    // Continuar con el login normal
    document.getElementById('view-login').style.display = 'none';
    const mainView = appConfig.isAdmin ? 'view-admin' : 'view-user';
    showView(mainView);

    // Log de inicio de sesión solo si la carga fue exitosa
    if (appConfig.data && appConfig.data.songs && appConfig.data.songs.length > 0) {
        logActivity('LOGIN', null, "Inicio de Sesión");
    }

    // Forzar la primera pestaña para asegurar visibilidad
    if (appConfig.isAdmin) {
        setTimeout(() => {
            const firstT = document.querySelector('#adminNavBar button');
            if (firstT) switchTab('admin-music', firstT);
        }, 150);
    }
}

function app_logout() {
    if (dom.audioElement) dom.audioElement.pause();
    localStorage.removeItem('appConfig');
    location.reload();
}

function showMaintenanceScreen() {
    // Ocultar todas las vistas
    document.querySelectorAll('.view-section, #view-login, #view-maintenance').forEach(v => {
        v.style.display = 'none';
    });

    // Mostrar pantalla de mantenimiento
    document.getElementById('view-maintenance').style.display = 'flex';

    // Ocultar reproductor minimizado
    const mainPlayer = document.getElementById('mainPlayer');
    if (mainPlayer) {
        mainPlayer.style.display = 'none';
    }

    // Limpiar sesión parcialmente (mantener que intentó entrar)
    appConfig.isLoggedIn = false;
    appConfig.user = null;
}

// --- MODO MANTENIMIENTO ---
async function toggleMaintenanceMode(isActive) {
    if (!appConfig.isAdmin) {
        showToast("Solo el administrador puede cambiar este modo", 'error');
        return;
    }

    // Actualizar en la estructura de datos
    if (!appConfig.data) appConfig.data = {};
    appConfig.data.maintenanceMode = isActive;

    // Guardar en JSONBin
    await saveData();

    // Actualizar UI del toggle
    updateMaintenanceUI();

    // Mostrar confirmación
    const message = isActive
        ? "🔧 Modo mantenimiento ACTIVADO - Los usuarios no podrán acceder"
        : "✅ Modo mantenimiento DESACTIVADO - Los usuarios pueden acceder normalmente";
    showToast(message, isActive ? 'warning' : 'success');
}

function updateMaintenanceUI() {
    const toggle = document.getElementById('maintenanceModeToggle');
    const statusText = document.getElementById('maintenanceStatusText');
    const banner = document.getElementById('maintenanceBanner');

    if (!toggle || !statusText) return;

    const isActive = appConfig.data && appConfig.data.maintenanceMode === true;

    // Actualizar toggle
    toggle.checked = isActive;

    // Actualizar texto de estado
    statusText.textContent = isActive ? 'ACTIVADO' : 'Desactivado';
    statusText.className = isActive
        ? 'text-xs font-bold text-orange-400 uppercase tracking-widest'
        : 'text-xs font-bold text-white/40 uppercase tracking-widest';

    // Mostrar/ocultar banner de advertencia
    if (banner) {
        banner.style.display = isActive ? 'flex' : 'none';
    }
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
    if (!btn) return;
    const parent = btn.parentElement;

    // New Bottom Nav style
    // Reset colors in userNavBar and adminNavBar
    document.querySelectorAll('#userNavBar button, #adminNavBar button').forEach(b => {
        b.classList.replace('text-primary', 'text-white/40');
        const icon = b.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.remove('fill-1');
    });

    // Highlighting current tab button
    if (btn) { // Using 'btn' instead of 'sourceBtn'
        btn.classList.replace('text-white/40', 'text-primary');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('fill-1');
    }

    // Navigation logic for User Dashboard: Scroll to section
    if (parent.id === 'userNavBar') {
        const targetId = id === 'user-music' ? 'userSongList' : (id === 'user-playlists' ? 'userPlaylistGrid' : 'userAlbumGrid');
        const target = document.getElementById(targetId);
        if (target) {
            const header = target.previousElementSibling;
            if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    // Admin & General logic
    else {
        const container = id.startsWith('admin') ? document.getElementById('view-admin') : document.getElementById('view-user');
        if (container) {
            container.querySelectorAll('.list-tab-content').forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none'; // Usar style directo para evitar conflictos con Tailwind
            });
            const target = document.getElementById(id);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block'; // Mostrar explícitamente
            }
        }
    }

    if (id === 'admin-music' || id === 'user-music' || id === 'admin-users') {
        appConfig.currentFilter = null;
        updateUI();
    }

    if (id === 'admin-stats') {
        loadAppData();
    }
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

    // Exportar automáticamente a Google Sheets Hoja 2
    exportLibraryToSheet();

    updateUI();
    closeModal('dom_modal_upload');
    showToast("Cambios guardados", 'success');
}

async function toggleLike() {
    if (appConfig.isGuest) return showToast("Inicia sesión para esto", 'info');
    if (!appConfig.currentSong || !appConfig.user) return;

    const song = appConfig.data.songs.find(s => s.id === appConfig.currentSong.id);
    const email = appConfig.user.email;

    const isAdding = !song.likes.includes(email);
    if (isAdding) {
        song.likes.push(email);
        logActivity('LIKE', song);
    } else {
        song.likes = song.likes.filter(e => e !== email);
        logActivity('UNLIKE', song);
    }

    await saveData();
    updateLikeIcon();
}

async function deleteSong(e, id) {
    if (e) e.stopPropagation();
    if (!confirm('¿Eliminar esta canción?')) return;

    appConfig.data.songs = appConfig.data.songs.filter(s => s.id !== id);
    await saveData();

    // Exportar automáticamente a Google Sheets Hoja 2
    exportLibraryToSheet();

    updateUI();
    showToast("Canción eliminada", 'success');
}

async function deleteAlbum(e, index) {
    if (e) e.stopPropagation();
    if (!confirm('¿Eliminar este álbum?')) return;

    appConfig.data.albums.splice(index, 1);
    await saveData();

    // Exportar automáticamente a Google Sheets Hoja 2
    exportLibraryToSheet();

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
        saveData().then(() => {
            // Exportar automáticamente a Google Sheets Hoja 2
            exportLibraryToSheet();
            updateUI();
        });
    }
}

function createAlbum() {
    // Limpiar campos del modal
    document.getElementById('albumName').value = '';
    document.getElementById('albumArtist').value = appConfig.user ? appConfig.user.name : '';
    document.getElementById('albumCover').value = '';

    // Abrir modal
    openModal('dom_modal_create_album');
}

async function do_create_album() {
    const name = document.getElementById('albumName').value.trim();
    const artist = document.getElementById('albumArtist').value.trim();
    const cover = document.getElementById('albumCover').value.trim();

    if (!name) {
        showToast("El nombre del álbum es obligatorio", 'error');
        return;
    }

    if (!artist) {
        showToast("El nombre del artista es obligatorio", 'error');
        return;
    }

    appConfig.data.albums.push({
        name,
        artist,
        cover: cover || DEFAULT_COVER,
        addedDate: Date.now()
    });

    await saveData();

    // Exportar automáticamente a Google Sheets Hoja 2
    exportLibraryToSheet();

    updateUI();
    closeModal('dom_modal_create_album');
    showToast("Álbum creado", 'success');
}


async function deleteUser(email) {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return;
    appConfig.data.users = appConfig.data.users.filter(u => u.email !== email);
    await saveData();
    updateUI();
}

let currentAvatarStyle = 'avataaars';

function changeAvatar() {
    const seed = Math.floor(Math.random() * 1000000);
    const newAvatar = `https://api.dicebear.com/7.x/${currentAvatarStyle}/svg?seed=${seed}`;

    appConfig.user.avatar = newAvatar;
    document.getElementById('profilePreview').src = getOptimizedAvatar(newAvatar);

    saveDataSilent().then(() => {
        showToast("Avatar aleatorio generado", 'info');
    });
}

function changeAvatarStyle(style) {
    currentAvatarStyle = style;
    const seed = Math.floor(Math.random() * 1000000);
    const newAvatar = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

    appConfig.user.avatar = newAvatar;
    document.getElementById('profilePreview').src = getOptimizedAvatar(newAvatar);

    saveDataSilent().then(() => {
        showToast(`Estilo: ${style}`, 'success');
    });
}

function openAlbum(index) {
    const album = appConfig.data.albums[index];
    if (!album) return;

    const albumName = album.name || album.title;
    const albumSongs = appConfig.data.songs.filter(s => norm(s.album) === norm(albumName));

    if (albumSongs.length === 0) {
        showToast("Álbum vacío", 'info');
        return;
    }

    // Llenar Modal
    document.getElementById('modalAlbumName').textContent = albumName;
    document.getElementById('modalAlbumArtist').textContent = album.artist || 'Artista';
    document.getElementById('modalAlbumCover').src = getArtForAlbum(album);

    // Configurar botón "Reproducir Todo"
    const btnPlayAll = document.getElementById('btnPlayAllAlbum');
    btnPlayAll.onclick = () => {
        appConfig.tempPlaylist = albumSongs;
        playSong(albumSongs[0]);
        closeModal('dom_modal_album_detail');
    };

    renderModalSongList('modalAlbumSongsList', albumSongs);
    openModal('dom_modal_album_detail');
}

function renderModalSongList(id, songs) {
    const c = document.getElementById(id);
    if (!c) return;
    c.innerHTML = '';

    songs.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = "song-row-futuristic p-4 rounded-2xl flex items-center justify-between group cursor-pointer mb-3";

        const trackNum = (index + 1).toString().padStart(2, '0');

        div.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-xs font-bold opacity-30 w-5">${trackNum}</span>
                <div>
                    <h3 class="font-bold text-base leading-tight text-white">${s.title}</h3>
                    <p class="text-xs opacity-50 text-white/70">${s.genre || 'Adoración'}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="playing-indicator flex items-end gap-0.5 h-4 w-6" id="playing-indicator-${s.id}" style="display:none">
                    <div class="visualizer-bar-red"></div>
                    <div class="visualizer-bar-red"></div>
                    <div class="visualizer-bar-red"></div>
                </div>
                <button class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary transition-all">
                    <span class="material-icons-round text-sm text-white">play_arrow</span>
                </button>
            </div>
        `;

        // Row click
        div.onclick = () => {
            appConfig.tempPlaylist = songs;
            playSong(s);
        };

        c.appendChild(div);
    });
}

function updateLikeIcon() {
    const btn = document.getElementById('btnLike');
    if (!btn || !appConfig.currentSong || !appConfig.user) return;

    const isLiked = appConfig.currentSong.likes.includes(appConfig.user.email);
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) {
        icon.classList.toggle('fill-1', isLiked);
        icon.style.color = isLiked ? 'var(--primary)' : 'white';
    }
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
// --- GESTIÓN DE PLAYLISTS Y USUARIOS ---
let pendingPlaylistSongId = null;

async function createPlaylist() {
    const name = prompt("Nombre de la nueva lista:");
    if (!name) return;

    if (!appConfig.data.playlists) appConfig.data.playlists = [];

    appConfig.data.playlists.push({
        id: Date.now(),
        name: name,
        songs: [],
        createdBy: appConfig.user.email,
        isPublic: appConfig.isAdmin
    });

    await saveData();
    updateUI();
    showToast("Lista creada", 'success');
}

async function do_create_user_modal() {
    const name = prompt("Nombre del usuario:");
    if (!name) return;
    const email = prompt("Email del usuario:");
    if (!email) return;
    const pass = prompt("Contraseña temporal:");
    if (!pass) return;

    if (!appConfig.data.users) appConfig.data.users = [];

    // Verificar duplicados
    if (appConfig.data.users.find(u => u.email === email)) {
        showToast("El email ya existe", 'error');
        return;
    }

    appConfig.data.users.push({
        name,
        email,
        password: pass,
        role: 'user',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        favorites: []
    });

    await saveData();
    updateUI();
    showToast("Usuario creado", 'success');
}

function openAddToPlaylistModal(songId) {
    pendingPlaylistSongId = songId;
    const listContainer = document.getElementById('addToPlaylistList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let playlists = [];
    if (!appConfig.data.playlists) appConfig.data.playlists = [];

    // Admin ve todas, Usuario ve suyas
    if (appConfig.isAdmin) {
        playlists = appConfig.data.playlists;
    } else {
        playlists = appConfig.data.playlists.filter(p => p.createdBy === appConfig.user.email);
    }

    if (playlists.length === 0) {
        listContainer.innerHTML = '<div class="text-white/50 text-center text-sm p-4">No tienes listas creadas</div>';
    } else {
        playlists.forEach(p => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-3 transition-all mb-1";

            const exists = p.songs.includes(songId);
            const icon = exists ? 'check_circle' : 'playlist_add';
            const color = exists ? 'text-primary' : 'text-white/60';

            btn.innerHTML = `
                <span class="material-symbols-outlined ${color}">${icon}</span>
                <span class="text-white font-medium truncate flex-1">${p.name}</span>
                <span class="text-xs text-white/30">${p.songs.length} canciones</span>
            `;

            if (!exists) {
                btn.onclick = () => addToPlaylist(p.id);
            } else {
                btn.onclick = () => showToast("Ya está en esta lista", 'info');
                btn.style.opacity = "0.5";
            }
            listContainer.appendChild(btn);
        });
    }

    openModal('dom_modal_add_to_playlist');
}

async function createPlaylistInModal() {
    const name = prompt("Nombre de la nueva lista:");
    if (!name) return;

    // Asegurar estructura
    if (!appConfig.data.playlists) appConfig.data.playlists = [];

    const newPlaylist = {
        id: Date.now(),
        name: name,
        songs: [],
        createdBy: appConfig.user.email,
        isPublic: appConfig.isAdmin
    };

    appConfig.data.playlists.push(newPlaylist);
    await saveData();

    // Recargar la lista del modal
    openAddToPlaylistModal(pendingPlaylistSongId);
    showToast("Lista creada", 'success');
}

async function addToPlaylist(playlistId) {
    if (!pendingPlaylistSongId) return;

    const playlist = appConfig.data.playlists.find(p => p.id === playlistId);
    if (playlist) {
        if (!playlist.songs.includes(pendingPlaylistSongId)) {
            playlist.songs.push(pendingPlaylistSongId);
            await saveData();
            showToast(`Añadida a ${playlist.name}`, 'success');
            closeModal('dom_modal_add_to_playlist');
        }
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Audio Setup
    dom.audioElement = document.createElement('audio');
    document.body.appendChild(dom.audioElement);

    dom.audioElement.addEventListener('timeupdate', updateProgress);
    dom.audioElement.addEventListener('ended', () => {
        if (appConfig.currentSong) {
            logActivity('SONG_END', appConfig.currentSong, formatTime(dom.audioElement.duration));
        }
        next();
    });

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

    // Password visibility toggle
    const togglePass = document.getElementById('btnTogglePass');
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const passInput = document.getElementById('loginPass');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                togglePass.textContent = 'visibility';
            } else {
                passInput.type = 'password';
                togglePass.textContent = 'visibility_off';
            }
        });
    }

    setupPWA();
});

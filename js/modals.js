// MANEJADOR DE VENTANAS MODALES

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        modal.querySelector('.modal-content')?.classList.add('animate-scale-in');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Funciones específicas para abrir modales con datos
function openProfile() {
    if (!appConfig.user) return;
    document.getElementById('profileName').value = appConfig.user.name;
    document.getElementById('profileEmail').value = appConfig.user.email;
    document.getElementById('profilePreview').src = getOptimizedAvatar(appConfig.user.avatar);
    openModal('dom_modal_profile');
}

function saveProfileChanges() {
    const newName = document.getElementById('profileName').value.trim();
    if (!newName) {
        showToast("El nombre no puede estar vacío", "error");
        return;
    }

    appConfig.user.name = newName;
    localStorage.setItem('appConfig', JSON.stringify(appConfig));
    showToast("Perfil actualizado correctamente");

    // Si hay elementos que muestran el nombre en la interfaz, actualizarlos si es necesario
    if (appConfig.isAdmin) {
        // En el admin suele usarse el logo, pero si hubiera nombre se actualizaría aquí
    } else {
        const greeting = document.getElementById('userGreeting');
        if (greeting) greeting.textContent = `Hola de nuevo, ${newName.split(' ')[0]}`;
    }

    closeModal('dom_modal_profile');
}

function openUpload() {
    document.getElementById('modalUploadTitle').textContent = "Subir Canción";
    document.getElementById('upTitle').value = "";
    document.getElementById('upGenre').value = "";
    document.getElementById('upUrl').value = "";
    appConfig.editingSongId = null;

    // Poblar select de álbumes
    const select = document.getElementById('upAlbum');
    if (select) {
        select.innerHTML = '<option value="">Sin Álbum</option>';
        appConfig.data.albums.forEach(alb => {
            select.innerHTML += `<option value="${alb.name}">${alb.name}</option>`;
        });
    }
    openModal('dom_modal_upload');
}

function editSong(e, id) {
    if (e) e.stopPropagation();
    const song = appConfig.data.songs.find(s => s.id === id);
    if (!song) return;

    appConfig.editingSongId = id;
    document.getElementById('modalUploadTitle').textContent = "Editar Canción";
    document.getElementById('upTitle').value = song.title;
    document.getElementById('upGenre').value = song.genre;
    document.getElementById('upUrl').value = song.url;

    const select = document.getElementById('upAlbum');
    if (select) {
        select.innerHTML = '<option value="">Sin Álbum</option>';
        appConfig.data.albums.forEach(alb => {
            const selected = (norm(alb.name) === norm(song.album)) ? 'selected' : '';
            select.innerHTML += `<option value="${alb.name}" ${selected}>${alb.name}</option>`;
        });
    }
    openModal('dom_modal_upload');
}

async function do_upload() {
    const title = document.getElementById('upTitle').value.trim();
    const genre = document.getElementById('upGenre').value.trim();
    const album = document.getElementById('upAlbum').value;
    const url = document.getElementById('upUrl').value.trim();

    if (!title || !url) return showToast("Título y URL son obligatorios", 'error');

    const songData = {
        id: appConfig.editingSongId || Date.now(),
        title: title,
        genre: genre || "Varios",
        album: album || "",
        url: url,
        plays: 0,
        likes: [],
        addedDate: Date.now()
    };

    if (appConfig.editingSongId) {
        const idx = appConfig.data.songs.findIndex(s => s.id === appConfig.editingSongId);
        if (idx !== -1) {
            // Mantener plays y likes si editamos
            songData.plays = appConfig.data.songs[idx].plays || 0;
            songData.likes = appConfig.data.songs[idx].likes || [];
            appConfig.data.songs[idx] = songData;
        }
    } else {
        appConfig.data.songs.push(songData);
    }

    await saveData();
    updateUI();
    closeModal('dom_modal_upload');
    showToast(appConfig.editingSongId ? "Canción actualizada" : "Canción subida con éxito");
}

function createAlbum() {
    document.getElementById('modalAlbumTitle').textContent = "Nuevo Álbum";
    document.getElementById('albumName').value = "";
    document.getElementById('albumArtist').value = "";
    document.getElementById('albumCover').value = "";
    appConfig.editingAlbumIndex = null;
    openModal('dom_modal_create_album');
}

function editAlbum(e, index) {
    if (e) e.stopPropagation();
    const alb = appConfig.data.albums[index];
    if (!alb) return;

    appConfig.editingAlbumIndex = index;
    document.getElementById('modalAlbumTitle').textContent = "Editar Álbum";
    document.getElementById('albumName').value = alb.name || alb.title;
    document.getElementById('albumArtist').value = alb.artist || "Hjalmar";
    document.getElementById('albumCover').value = alb.cover || alb.coverUrl;
    openModal('dom_modal_create_album');
}

async function do_create_album() {
    const name = document.getElementById('albumName').value.trim();
    const artist = document.getElementById('albumArtist').value.trim();
    const cover = document.getElementById('albumCover').value.trim();

    if (!name) return showToast("El nombre es obligatorio", 'error');

    const newAlbum = {
        name: name,
        artist: artist || "Hjalmar",
        cover: cover || DEFAULT_COVER,
        id: Date.now()
    };

    if (appConfig.editingAlbumIndex !== null) {
        appConfig.data.albums[appConfig.editingAlbumIndex] = newAlbum;
    } else {
        if (!appConfig.data.albums) appConfig.data.albums = [];
        appConfig.data.albums.push(newAlbum);
    }

    await saveData();
    updateUI();
    closeModal('dom_modal_create_album');
    showToast("Álbum guardado con éxito");
}

async function deleteAlbum(e, index) {
    if (e) e.stopPropagation();
    if (!confirm('¿Seguro que quieres borrar este álbum? Las canciones no se borrarán pero quedarán "Sin Álbum".')) return;

    appConfig.data.albums.splice(index, 1);
    await saveData();
    updateUI();
}

/**
 * GESTIÓN DE USUARIOS
 */
function do_create_user_modal() {
    const name = prompt("Nombre del nuevo usuario:");
    if (!name) return;
    const email = prompt("Email del nuevo usuario:");
    if (!email || !email.includes('@')) return showToast("Email inválido", "error");

    if (appConfig.data.users && appConfig.data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return showToast("El usuario ya existe", "error");
    }

    if (!appConfig.data.users) appConfig.data.users = [];
    
    const newUser = {
        name: name,
        email: email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        role: 'user'
    };

    appConfig.data.users.push(newUser);
    saveData();
    updateUI();
    showToast("Usuario creado con éxito");
}

async function deleteUser(email) {
    if (!confirm(`¿Seguro que deseas eliminar a ${email}?`)) return;
    
    const idx = appConfig.data.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) {
        appConfig.data.users.splice(idx, 1);
        await saveData();
        updateUI();
        showToast("Usuario eliminado");
    }
}

/**
 * GESTIÓN DE CANCIONES (BORRADO)
 */
async function deleteSong(e, id) {
    if (e) e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar esta canción?")) return;

    const idx = appConfig.data.songs.findIndex(s => s.id === id);
    if (idx !== -1) {
        appConfig.data.songs.splice(idx, 1);
        await saveData();
        updateUI();
        showToast("Canción eliminada");
    }
}

/**
 * GESTIÓN DE PLAYLISTS
 */
async function createPlaylist() {
    const name = prompt("Nombre de la nueva playlist:");
    if (!name) return;

    if (!appConfig.data.playlists) appConfig.data.playlists = [];
    
    const newPlaylist = {
        id: Date.now(),
        name: name,
        songs: [],
        owner: (appConfig.user && appConfig.user.email) ? appConfig.user.email : 'admin'
    };

    appConfig.data.playlists.push(newPlaylist);
    await saveData();
    updateUI();
    showToast("Playlist creada");
}

async function deletePlaylist(e, id) {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar esta playlist?")) return;

    const idx = appConfig.data.playlists.findIndex(p => p.id === id);
    if (idx !== -1) {
        appConfig.data.playlists.splice(idx, 1);
        await saveData();
        updateUI();
        showToast("Playlist eliminada");
    }
}

function openAddToPlaylistModal(songId) {
    appConfig.pendingSongId = songId;
    const list = document.getElementById('addToPlaylistList');
    if (!list) return;

    if (!appConfig.data.playlists || appConfig.data.playlists.length === 0) {
        list.innerHTML = '<p class="text-center opacity-40 py-4 text-xs">No tienes playlists creadas</p>';
    } else {
        list.innerHTML = appConfig.data.playlists.map(p => `
            <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer border border-white/5 active:scale-95 mb-2" onclick="addToPlaylist(${p.id})">
                <span class="font-bold text-sm text-white">${p.name}</span>
                <span class="material-symbols-outlined text-sm text-primary">add_circle</span>
            </div>
        `).join('');
    }
    openModal('dom_modal_add_to_playlist');
}

async function addToPlaylist(playlistId) {
    const playlist = appConfig.data.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (!playlist.songs) playlist.songs = [];
    if (playlist.songs.includes(appConfig.pendingSongId)) {
        showToast("Esta canción ya está en la playlist", "info");
        return;
    }

    playlist.songs.push(appConfig.pendingSongId);
    await saveData();
    closeModal('dom_modal_add_to_playlist');
    showToast(`Agregada a ${playlist.name}`);
}

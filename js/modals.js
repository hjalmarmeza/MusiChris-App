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
    e.stopPropagation();
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

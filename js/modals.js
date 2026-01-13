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

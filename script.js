/**
 * MusiChris App V21.0 - FINAL UI POLISH
 * - Audio funcionando.
 * - Corrección de imágenes (acepta 'cover' o 'img').
 * - Corrección de nombres de álbumes (acepta 'title' o 'name').
 * - Botones de acción en lista de usuarios (Borrar/Editar).
 */

// =========================================================================
// 1. CONFIGURACIÓN
// =========================================================================
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const ADMIN_AVATAR = "https://i.ibb.co/68038m8/chris-admin.png";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";

const LOCAL_BIN_ID = "69349a76ae596e708f880e31"; 
const LOCAL_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";

let appConfig = {
    BIN_ID: LOCAL_BIN_ID,
    API_KEY: LOCAL_API_KEY,
    data: null,
    user: null,
    isLoggedIn: false,
    isAdmin: false,
    currentSong: null
};

const dom = {};

// =========================================================================
// 2. INICIO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Mapeo seguro
    const ids = [
        'view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 
        'btnLoginBtn', 'audioElement', 'customToast', 'statsTotalSongs', 
        'statsTotalUsers', 'adminAvatar', 'adminNameDisplay', 'userAvatarImg', 
        'userGreeting', 'mainPlayer', 'pTitle', 'pArtist', 'pCover', 'iconPlay',
        'btnTogglePass'
    ];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) dom[id] = el;
    });

    if (dom.btnLoginBtn) dom.btnLoginBtn.addEventListener('click', handleLoginAttempt);
    if (dom.btnTogglePass) dom.btnTogglePass.addEventListener('click', togglePasswordVisibility);
    
    if (dom.audioElement) {
        dom.audioElement.addEventListener('ended', () => togglePlayIcon(false));
        dom.audioElement.addEventListener('pause', () => togglePlayIcon(false));
        dom.audioElement.addEventListener('play', () => togglePlayIcon(true));
    }
    
    loadConfig();
});

function showToast(message, type = 'info') {
    const toast = document.getElementById('customToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `customToast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace(" show", ""); }, 3000);
}

// =========================================================================
// 3. VISTAS Y CONFIGURACIÓN
// =========================================================================
function showView(viewId) {
    const views = ['view-login', 'view-admin', 'view-user', 'view-guest-player'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = (viewId === 'view-login') ? 'flex' : 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }
}

function loadConfig() {
    const saved = localStorage.getItem('appConfig');
    if (saved) {
        const parsed = JSON.parse(saved);
        appConfig.user = parsed.user;
        appConfig.isLoggedIn = parsed.isLoggedIn;
        appConfig.isAdmin = parsed.isAdmin;
    }

    appConfig.BIN_ID = LOCAL_BIN_ID;
    appConfig.API_KEY = LOCAL_API_KEY;

    if (appConfig.isLoggedIn && appConfig.user) {
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
        loadAppData(); 
    } else {
        showView('view-login');
    }
}

function saveConfig() {
    localStorage.setItem('appConfig', JSON.stringify({
        user: appConfig.user,
        isLoggedIn: appConfig.isLoggedIn,
        isAdmin: appConfig.isAdmin
    }));
}

// =========================================================================
// 4. DATOS
// =========================================================================
async function loadAppData() {
    try {
        const response = await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, {
            method: 'GET',
            headers: { 'X-Master-Key': appConfig.API_KEY }
        });

        if (!response.ok) throw new Error("Error API");

        const json = await response.json();
        appConfig.data = json.record;

        if (!appConfig.data.songs) appConfig.data.songs = [];
        if (!appConfig.data.users) appConfig.data.users = [];
        if (!appConfig.data.albums) appConfig.data.albums = [];

        updateUI();

    } catch (error) {
        console.error(error);
        showToast("Error cargando datos", 'error');
    }
}

function updateUI() {
    // Estadísticas
    if (dom.statsTotalSongs && appConfig.data) dom.statsTotalSongs.textContent = appConfig.data.songs.length;
    if (dom.statsTotalUsers && appConfig.data) dom.statsTotalUsers.textContent = appConfig.data.users.length;

    // Perfil
    const avatarUrl = appConfig.user?.avatar || ADMIN_AVATAR;
    if(dom.adminAvatar) dom.adminAvatar.src = avatarUrl;
    if(dom.userAvatarImg) dom.userAvatarImg.src = avatarUrl;
    
    if(dom.adminNameDisplay) dom.adminNameDisplay.textContent = appConfig.user?.name || 'Admin';
    if(dom.userGreeting) dom.userGreeting.textContent = `Hola, ${appConfig.user?.name || 'Usuario'}`;

    // Renderizado
    if (appConfig.isAdmin) {
        renderSongList('adminSongList', appConfig.data.songs);
        renderUserList('usersListGrid', appConfig.data.users);
        renderAlbumGrid('adminAlbumGrid', appConfig.data.albums);
    } else {
        renderSongList('userSongList', appConfig.data.songs);
        renderAlbumGrid('userAlbumGrid', appConfig.data.albums);
    }
}

// =========================================================================
// 5. RENDERIZADO (CORREGIDO PARA IMÁGENES Y BOTONES)
// =========================================================================
function renderSongList(containerId, songs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!songs || songs.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">No hay canciones.</div>';
        return;
    }

    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-list-item';
        // CORRECCIÓN: Busca 'cover' O 'img' O usa default
        const coverImg = song.cover || song.img || DEFAULT_COVER;
        
        div.innerHTML = `
            <div class="song-cover" style="background-image: url('${coverImg}')"></div>
            <div class="song-info">
                <div class="song-title">${song.title || 'Sin Título'}</div>
                <div class="song-artist">${song.genre || song.artist || 'Desconocido'}</div>
            </div>
            <div class="song-actions">
                <button class="btn-list-action"><span class="material-icons-round">play_arrow</span></button>
            </div>
        `;
        div.onclick = () => playSong(song);
        container.appendChild(div);
    });
}

function renderAlbumGrid(containerId, albums) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!albums || albums.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666">No hay álbumes.</div>';
        return;
    }

    albums.forEach(album => {
        const div = document.createElement('div');
        div.className = 'collection-card';
        // CORRECCIÓN: Busca 'cover' O 'img' / 'title' O 'name'
        const coverImg = album.cover || album.img || DEFAULT_COVER;
        const albumName = album.title || album.name || 'Álbum';
        
        div.innerHTML = `
            <div class="collection-cover" style="background-image: url('${coverImg}')"></div>
            <h4>${albumName}</h4>
            <p>${album.artist || 'Varios'}</p>
        `;
        container.appendChild(div);
    });
}

function renderUserList(containerId, users) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-list-item';
        // CORRECCIÓN: Agregados botones de acción
        div.innerHTML = `
            <div class="user-info">
                <img src="${u.avatar || DEFAULT_COVER}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;object-fit:cover">
                <span>${u.name}</span>
                <span class="user-role role-${u.role}" style="font-size:0.7rem;margin-left:5px;padding:2px 6px;border-radius:4px;background:${u.role==='admin'?'var(--accent)':'#3498db'}">${u.role}</span>
            </div>
            <div style="display:flex;gap:5px">
                <button class="btn-icon" style="width:30px;height:30px;font-size:1rem" onclick="fakeAction('Editar Usuario')">
                    <span class="material-icons-round">lock</span>
                </button>
                <button class="btn-icon" style="width:30px;height:30px;font-size:1rem;background:var(--danger)" onclick="fakeAction('Borrar Usuario')">
                    <span class="material-icons-round">delete</span>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function fakeAction(msg) {
    showToast(msg + " (Demo)", 'info');
}

// =========================================================================
// 6. REPRODUCTOR
// =========================================================================
function playSong(song) {
    if(!song) return;
    appConfig.currentSong = song;
    
    const player = dom.mainPlayer;
    if(player) player.style.display = 'flex';
    
    // CORRECCIÓN: Busca cover/img también aquí
    const coverImg = song.cover || song.img || DEFAULT_COVER;

    if(dom.pTitle) dom.pTitle.textContent = song.title;
    if(dom.pArtist) dom.pArtist.textContent = song.genre || song.artist;
    if(dom.pCover) dom.pCover.style.backgroundImage = `url('${coverImg}')`;

    const audioEl = dom.audioElement;
    if(audioEl && song.url) {
        audioEl.src = song.url;
        audioEl.play()
            .then(() => togglePlayIcon(true))
            .catch(e => console.error(e));
    }
}

function toggle_play() {
    const audioEl = dom.audioElement;
    if (!audioEl) return;
    if (audioEl.paused) audioEl.play();
    else audioEl.pause();
}

function togglePlayIcon(isPlaying) {
    const icon = dom.iconPlay;
    const iconMin = document.getElementById('iconPlayMin');
    const txt = isPlaying ? 'pause' : 'play_arrow';
    if(icon) icon.textContent = txt;
    if(iconMin) iconMin.textContent = txt;
}

// =========================================================================
// 7. LOGIN Y UTILIDADES
// =========================================================================
async function handleLoginAttempt() {
    const email = dom.loginEmail.value.trim().toLowerCase();
    const pass = dom.loginPass.value.trim();

    if (!email || !pass) return showToast("Faltan datos", 'error');

    if (email === 'hjalmar' && pass === '258632') {
        completeLogin({ name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR });
        return;
    }

    if (!appConfig.data) await loadAppData();
    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    
    if (user) {
        if (pass === (user.password || '123')) {
            completeLogin(user);
        } else {
            showToast("Contraseña incorrecta", 'error');
        }
    } else {
        showToast("Usuario no encontrado", 'error');
    }
}

function completeLogin(user) {
    appConfig.user = user;
    appConfig.isLoggedIn = true;
    appConfig.isAdmin = (user.role === 'admin');
    saveConfig();
    showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
    loadAppData();
}

function togglePasswordVisibility() {
    const pass = dom.loginPass;
    const btn = dom.btnTogglePass;
    if(pass.type === "password") {
        pass.type = "text";
        btn.textContent = "visibility";
    } else {
        pass.type = "password";
        btn.textContent = "visibility_off";
    }
}

function app_logout() {
    localStorage.removeItem('appConfig');
    location.reload();
}

// GLOBALES
window.app_logout = app_logout;
window.toggle_play = toggle_play;
window.fakeAction = fakeAction;
window.openModal = (id) => { const el = document.getElementById(id); if(el) el.style.display='flex'; };
window.closeModal = (id) => { const el = document.getElementById(id); if(el) el.style.display='none'; };
window.openProfile = () => window.openModal('dom_modal_profile');
window.openUpload = () => window.openModal('dom_modal_upload');
window.switchTab = (tabId, btn) => {
    const parent = btn.closest('.container');
    parent.querySelectorAll('.list-tab-content').forEach(c => c.classList.remove('active'));
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    
    // Refrescar grids si es necesario
    if(tabId.includes('albums') || tabId.includes('users')) updateUI();
};

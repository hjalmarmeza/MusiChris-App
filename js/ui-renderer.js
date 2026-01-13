// RENDERIZADO DE INTERFAZ Y COMPONENTES

function updateUI(songListOverride = null) {
    if (document.getElementById('statsTotalSongs') && appConfig.data) {
        document.getElementById('statsTotalSongs').textContent = appConfig.data.songs.length;
    }
    if (document.getElementById('statsTotalUsers') && appConfig.data) {
        document.getElementById('statsTotalUsers').textContent = appConfig.data.users.length;
    }

    const songs = songListOverride || appConfig.data.songs;
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songs);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');

    if (appConfig.isAdmin) {
        renderUserList('usersListGrid', appConfig.data.users);
        renderStatsOverview();
    }

    if (appConfig.user) {
        const avatar = getOptimizedAvatar(appConfig.user.avatar || ADMIN_AVATAR);
        if (document.getElementById('adminAvatar')) document.getElementById('adminAvatar').src = avatar;
        if (document.getElementById('userAvatarImg')) document.getElementById('userAvatarImg').src = avatar;
        if (document.getElementById('adminNameDisplay')) document.getElementById('adminNameDisplay').textContent = appConfig.user.name;
        if (document.getElementById('userGreeting')) document.getElementById('userGreeting').textContent = `Hola ${appConfig.user.name}`;
    }

    updatePlayingIndicators();
}

function renderSongList(id, songs) {
    const c = document.getElementById(id);
    if (!c) return;
    c.innerHTML = '';

    songs.forEach((s) => {
        const div = document.createElement('div');
        div.className = 'song-list-item';
        div.id = `song-item-${s.id}`;

        const art = getSongArtForList(s);

        let adminBtns = '';
        if (appConfig.isAdmin) {
            adminBtns = `
                <button class="btn-list-action" onclick="event.stopPropagation(); editSong(event,${s.id})">
                    <span class="material-icons-round" style="font-size:1rem">edit</span>
                </button>
                <button class="btn-list-action" style="background:var(--danger)" onclick="event.stopPropagation(); deleteSong(event,${s.id})">
                    <span class="material-icons-round" style="font-size:1rem">delete</span>
                </button>
            `;
        }

        div.innerHTML = `
            <div class="song-cover" style="background-image:url('${art}')"></div>
            <div class="song-info">
                <div class="song-title">${s.title}</div>
                <div class="song-artist">${s.genre}</div>
            </div>
            <div class="song-actions">
                <button class="btn-list-action" onclick="event.stopPropagation(); playSongId(${s.id})">
                    <span class="material-icons-round">play_arrow</span>
                </button>
                ${adminBtns}
            </div>
            <div class="playing-indicator" id="playing-indicator-${s.id}">
                <div class="playing-bar"></div><div class="playing-bar"></div><div class="playing-bar"></div>
            </div>
        `;

        div.onclick = () => playSong(s);
        c.appendChild(div);
    });
}

function renderAlbumGrid(id, albums) {
    const c = document.getElementById(id);
    if (!c) return;
    c.innerHTML = '';

    albums.forEach((a, index) => {
        const div = document.createElement('div');
        div.className = 'collection-card';
        const art = getArtForAlbum(a);

        let adminBtns = '';
        if (appConfig.isAdmin) {
            adminBtns = `
                <div class="album-admin-tools">
                    <button class="btn-alb-tool" style="background:#333" onclick="event.stopPropagation(); editAlbum(event,${index})">
                        <span class="material-icons-round" style="font-size:1rem">edit</span>
                    </button>
                    <button class="btn-alb-tool" style="background:var(--danger)" onclick="event.stopPropagation(); deleteAlbum(event,${index})">
                        <span class="material-icons-round" style="font-size:1rem">delete</span>
                    </button>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="collection-cover" style="background-image:url('${art}')">
                <div class="album-playing-indicator" id="album-indicator-${index}">
                    <div class="playing-bar"></div><div class="playing-bar"></div><div class="playing-bar"></div>
                </div>
            </div>
            <h4>${a.name}</h4>
            <p style="color:#888; font-size:0.85rem; margin:0;">${a.artist}</p>
            ${adminBtns}
        `;

        div.onclick = () => openAlbum(index);
        c.appendChild(div);
    });
}

function renderSmartPlaylists(id) {
    const c = document.getElementById(id);
    if (!c) return;

    // Solo renderizamos Favoritos y Recientes por ahora
    const smarts = [
        { name: 'Favoritos', icon: 'favorite', action: 'openFavorites()' },
        { name: 'Recientes', icon: 'history', action: 'openRecent()' }
    ];

    c.innerHTML = smarts.map(s => `
        <div class="collection-card smart-card" onclick="${s.action}">
            <div class="collection-cover" style="background: linear-gradient(135deg, var(--accent), var(--secondary)); display:flex; align-items:center; justify-content:center;">
                <span class="material-icons-round" style="font-size:3rem; color:white;">${s.icon}</span>
            </div>
            <h4>${s.name}</h4>
        </div>
    `).join('');
}

function renderUserList(id, users) {
    const c = document.getElementById(id);
    if (!c) return;

    c.innerHTML = users.map(u => `
        <div class="user-list-item">
            <img src="${getOptimizedAvatar(u.avatar)}" class="avatar" style="width:40px; height:40px;">
            <div style="flex:1; margin-left:12px;">
                <div style="font-weight:bold">${u.name}</div>
                <div style="font-size:0.8rem; color:var(--text-dim)">${u.email}</div>
            </div>
            <button class="btn-list-action" style="background:var(--danger)" onclick="deleteUser('${u.email}')">
                <span class="material-icons-round" style="font-size:1rem">delete</span>
            </button>
        </div>
    `).join('');
}

function renderStatsOverview() {
    // Implementación básica de estadísticas
    if (document.getElementById('statsTotalSongs')) {
        document.getElementById('statsTotalSongs').textContent = appConfig.data.songs.length;
    }
}

function filterSongs(query) {
    const q = norm(query);
    if (!q) {
        updateUI();
        return;
    }
    const filtered = appConfig.data.songs.filter(s =>
        norm(s.title).includes(q) || norm(s.genre).includes(q) || norm(s.album).includes(q)
    );
    updateUI(filtered);
}

function updateGuestPlayerUI() {
    const song = appConfig.currentSong;
    if (!song) return;

    if (document.getElementById('guestTitle')) document.getElementById('guestTitle').textContent = song.title;
    if (document.getElementById('guestArtist')) document.getElementById('guestArtist').textContent = song.genre;
    if (document.getElementById('guestCover')) {
        document.getElementById('guestCover').style.backgroundImage = `url('${getSongArtForPlayer(song)}')`;
    }
}

function openFavorites() {
    if (!appConfig.user) return showToast("Inicia sesión para ver tus favoritos");
    const favs = appConfig.data.songs.filter(s => s.likes.includes(appConfig.user.email));
    if (favs.length === 0) return showToast("No tienes favoritos aún");
    appConfig.tempPlaylist = favs;
    updateUI(favs);
}

function openRecent() {
    const recent = [...appConfig.data.songs].sort((a, b) => b.addedDate - a.addedDate).slice(0, 20);
    appConfig.tempPlaylist = recent;
    updateUI(recent);
}

// Helpers para Imágenes
function getSongArtForList(song) { return song.cover || DEFAULT_COVER; }
function getSongArtForPlayer(song) { return song.cover || DEFAULT_COVER; }
function getArtForAlbum(album) { return album.cover || DEFAULT_COVER; }
function getOptimizedAvatar(url) { return url || ADMIN_AVATAR; }

function showToast(msg, type = 'info') {
    const toast = document.getElementById('customToast');
    if (toast) {
        toast.textContent = msg;
        toast.style.display = 'block';
        toast.style.background = type === 'error' ? 'var(--danger)' : '#333';
        setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }
}

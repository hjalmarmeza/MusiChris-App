// RENDERIZADO DE INTERFAZ Y COMPONENTES
let activityChart = null;
let topSongsChartObj = null;
let visualizerInterval = null;

function updateUI(songListOverride = null) {
    if (songListOverride) {
        appConfig.currentFilter = songListOverride;
    }

    if (document.getElementById('statsTotalSongs') && appConfig.data) {
        document.getElementById('statsTotalSongs').textContent = appConfig.data.songs.length;
    }
    if (document.getElementById('statsTotalUsers') && appConfig.data) {
        document.getElementById('statsTotalUsers').textContent = appConfig.data.users.length;
    }

    const songs = appConfig.currentFilter || appConfig.data.songs;
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songs);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');

    if (appConfig.isAdmin) {
        renderUserList('usersListGrid', appConfig.data.users);
        renderStatsOverview();
        updateCloudinaryUsage();
    } else {
        checkUserNotifications();
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
        const artist = s.genre || s.artist || 'Artista Desconocido';

        let adminBtns = '';
        if (appConfig.isAdmin) {
            adminBtns = `
                <button class="btn-list-action" onclick="event.stopPropagation(); editSong(event,${s.id})">
                    <span class="material-icons-round">edit</span>
                </button>
                <button class="btn-list-action" style="background:var(--danger)" onclick="event.stopPropagation(); deleteSong(event,${s.id})">
                    <span class="material-icons-round">delete</span>
                </button>
            `;
        }

        div.innerHTML = `
            <div class="song-cover" style="background-image:url('${art}')"></div>
            <div class="song-info">
                <div class="song-title">${s.title}</div>
                <div class="song-artist">${artist}</div>
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
            <h4>${a.name || a.title || 'Sin Título'}</h4>
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
            <img src="${getOptimizedAvatar(u.avatar)}" class="avatar">
            <div style="flex:1; margin-left:12px;">
                <div style="font-weight:bold">${u.name}</div>
                <div style="font-size:0.8rem; color:var(--text-dim)">${u.email}</div>
            </div>
            <button class="btn-list-action" style="background:var(--danger)" onclick="deleteUser('${u.email}')">
                <span class="material-icons-round">delete</span>
            </button>
        </div>
    `).join('');
}

function renderStatsOverview() {
    const container = document.getElementById('statsMainContainer');
    const summaryContainer = document.getElementById('statsSummaryCards');
    if (!container || !appConfig.data) return;

    // 1. Renderizar KPIs Rápidos
    const totalPlays = appConfig.data.songs.reduce((acc, s) => acc + (s.plays || 0), 0);
    summaryContainer.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon"><span class="material-icons-round">play_circle</span></div>
            <div class="kpi-data"><h5>Total Plays</h5><div class="value">${totalPlays}</div></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><span class="material-icons-round">library_music</span></div>
            <div class="kpi-data"><h5>Canciones</h5><div class="value">${appConfig.data.songs.length}</div></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><span class="material-icons-round">people</span></div>
            <div class="kpi-data"><h5>Usuarios</h5><div class="value">${appConfig.data.users.length}</div></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><span class="material-icons-round">cloud</span></div>
            <div class="kpi-data"><h5>Cloud Status</h5><div class="value" id="statsCloudinaryUsageMini">0%</div></div>
        </div>
    `;

    // 2. Gráficos (Chart.js)
    initUserActivityChart(); // Changed to User Activity
    initTopSongsChart();

    // 3. Renderizar Top Listas
    const topSongs = appConfig.stats.topSongs || [];
    const topLikes = appConfig.stats.topLikes || [];

    // Calcular Top Usuarios (más likes dados)
    const userLikes = {};
    appConfig.data.songs.forEach(s => {
        if (s.likes) {
            s.likes.forEach(email => {
                userLikes[email] = (userLikes[email] || 0) + 1;
            });
        }
    });
    const topUsers = Object.entries(userLikes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ email, count }));

    container.innerHTML = `
        <div class="stats-card">
            <h4><span class="material-icons-round">trending_up</span> Top Canciones</h4>
            ${topSongs.map((s, i) => `
                <div class="stat-item">
                    <span class="stat-rank">${i + 1}</span>
                    <div class="stat-info">
                        <div>${s.title}</div>
                    </div>
                    <span class="stat-val">${s.plays} <small>plays</small></span>
                </div>
            `).join('')}
        </div>

        <div class="stats-card">
            <h4><span class="material-icons-round">favorite</span> Más Likes</h4>
            ${topLikes.map((s, i) => `
                <div class="stat-item">
                    <span class="stat-rank">${i + 1}</span>
                    <div class="stat-info">
                        <div>${s.title}</div>
                    </div>
                    <span class="stat-val">${s.likeCount} <small>likes</small></span>
                </div>
            `).join('')}
        </div>

        <div class="stats-card">
            <h4><span class="material-icons-round">person</span> Top Usuarios</h4>
            ${topUsers.map((u, i) => `
                <div class="stat-item">
                    <span class="stat-rank">${i + 1}</span>
                    <div class="stat-info">
                        <div>${u.email.split('@')[0]}</div>
                        <div style="font-size:0.7rem; color:var(--text-dim)">${u.email}</div>
                    </div>
                    <span class="stat-val">${u.count} <small>likes</small></span>
                </div>
            `).join('')}
        </div>
    `;
    updateCloudinaryUsage();
}

function initUserActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Obtener las 5 canciones más escuchadas para el eje Y
    const topSongs = (appConfig.stats.topSongs || []).slice(0, 5);
    const labels = topSongs.map(s => s.title.substring(0, 20) + (s.title.length > 20 ? '..' : ''));

    // Obtener los usuarios para los segmentos (leyenda)
    const allUsers = (appConfig.data && appConfig.data.users) ? appConfig.data.users : [];
    const colors = ['#ffcc00', '#00ccff', '#00ff88', '#ff4d4d', '#a29bfe'];

    // Dataset por cada usuario: Mostramos su contribución real (SOLO LIKES)
    const datasets = allUsers.slice(0, 5).map((u, i) => {
        const initials = u.name.substring(0, 3).toUpperCase();
        return {
            label: initials,
            data: topSongs.map(song => {
                const isLiked = song.likes && song.likes.includes(u.email);
                return isLiked ? 1 : 0; // Mostramos 1 si el usuario le dio Like. 
            }),
            backgroundColor: colors[i % colors.length],
            borderRadius: 4
        };
    });

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            indexAxis: 'y', // Hacemos la gráfica horizontal: Nombres en el eje Y
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0b0', stepSize: 1 }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#a0a0b0', font: { size: 10 } }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#a0a0b0', boxWidth: 10, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => topSongs[items[0].dataIndex].title
                    }
                }
            }
        }
    });
}

function sendNotification() {
    const text = document.getElementById('annText').value;
    if (!text) return showToast("Escribe algo primero", 'error');

    const newNotif = {
        id: Date.now(),
        title: "Mensaje del Administrador",
        text: text,
        date: new Date().toISOString()
    };

    if (!appConfig.data.notifications) appConfig.data.notifications = [];
    appConfig.data.notifications.unshift(newNotif);

    // Limitar a 10 notificaciones
    if (appConfig.data.notifications.length > 10) appConfig.data.notifications.pop();

    saveData();
    closeModal('dom_modal_announcement');
    showToast("Notificación enviada con éxito");
    document.getElementById('annText').value = '';

    // Sincronizar inmediatamente para el admin (aunque no use la campana)
    renderNotifications();
}

function checkUserNotifications() {
    if (appConfig.isAdmin) return;
    const banner = document.getElementById('userNotificationsBanner');
    const textEl = document.getElementById('latestNotifText');

    if (appConfig.data.notifications && appConfig.data.notifications.length > 0) {
        const latest = appConfig.data.notifications[0];
        textEl.textContent = latest.text;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function initTopSongsChart() {
    const ctx = document.getElementById('topSongsChart');
    if (!ctx) return;

    const songs = (appConfig.stats.topSongs || []).slice(0, 5);
    const labels = songs.map(s => s.title.substring(0, 15) + (s.title.length > 15 ? '...' : ''));
    const data = songs.map(s => s.plays || 0);

    if (topSongsChartObj) {
        topSongsChartObj.data.labels = labels;
        topSongsChartObj.data.datasets[0].data = data;
        topSongsChartObj.update();
        return;
    }

    topSongsChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reproducciones',
                data: data,
                backgroundColor: 'rgba(255, 204, 0, 0.6)',
                borderColor: '#ffcc00',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0b0', stepSize: 1 } },
                y: { grid: { display: false }, ticks: { color: '#a0a0b0' } }
            }
        }
    });
}

// --- NOTIFICACIONES ---
function openNotifications() {
    openModal('dom_modal_notifications');
    renderNotifications();
    // Limpiar badge
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach(b => b.style.display = 'none');
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (!appConfig.data.notifications || appConfig.data.notifications.length === 0) {
        container.innerHTML = `<p class="empty-notif">No tienes notificaciones nuevas.</p>`;
        return;
    }

    container.innerHTML = appConfig.data.notifications.map(n => `
        <div class="notif-item">
            <div style="font-weight:bold; margin-bottom:5px;">${n.title}</div>
            <div style="font-size:0.85rem; color:var(--text-dim)">${n.text}</div>
            <div style="font-size:0.7rem; color:var(--accent); margin-top:8px;">${new Date(n.date).toLocaleDateString()}</div>
        </div>
    `).join('');
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
function getSongArtForList(song) {
    if (song.cover) return song.cover;
    if (song.album && appConfig.data.albums) {
        const alb = appConfig.data.albums.find(a => norm(a.name) === norm(song.album) || norm(a.title) === norm(song.album));
        if (alb && (alb.cover || alb.coverUrl)) return alb.cover || alb.coverUrl;
    }
    return DEFAULT_COVER;
}

// Obtener uso de Cloudinary (Simulado/Estimado o vía Proxy si fuera necesario)
// Dado que Cloudinary Admin API requiere API Secret y no es seguro en Front-end, 
// calculamos un estimado basado en los archivos o mostramos el nombre de la nube.
function updateCloudinaryUsage() {
    if (!appConfig.data || !appConfig.data.songs) return;

    const songCount = appConfig.data.songs.length;
    const avgSizeMB = 5.5;
    const totalUsedGB = (songCount * avgSizeMB) / 1024;
    const freePlanGB = 25;
    const percentage = Math.min(100, (totalUsedGB / freePlanGB) * 100).toFixed(1);

    if (document.getElementById('statsCloudinaryUsageMini')) {
        document.getElementById('statsCloudinaryUsageMini').textContent = `${percentage}%`;
    }
}

function getSongArtForPlayer(song) {
    return getSongArtForList(song);
}

function getArtForAlbum(album) {
    return album.cover || album.coverUrl || DEFAULT_COVER;
}

function getOptimizedAvatar(url) {
    return url || ADMIN_AVATAR;
}

function updateVisualizer(isPlaying) {
    const bars = document.querySelectorAll('.playing-bar');
    bars.forEach(bar => {
        bar.style.animationPlayState = isPlaying ? 'running' : 'paused';
        if (isPlaying) bar.style.display = 'block';
    });
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('customToast');
    if (toast) {
        toast.textContent = msg;
        toast.style.display = 'block';
        toast.style.background = type === 'error' ? 'var(--danger)' : '#333';
        setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }
}


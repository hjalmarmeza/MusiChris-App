// RENDERIZADO DE INTERFAZ Y COMPONENTES
let activityChart = null;
let topSongsChartObj = null;
let visualizerInterval = null;

function updateUI(songListOverride = null) {
    if (songListOverride) {
        appConfig.currentFilter = songListOverride;
    }

    if (!appConfig.data) {
        appConfig.data = { songs: [], users: [], albums: [], playlists: [], stats: {} };
    }

    console.log(`📊 Actualizando UI - Canciones: ${(appConfig.data.songs || []).length}, Usuarios: ${(appConfig.data.users || []).length}`);

    if (document.getElementById('statsTotalSongs')) {
        document.getElementById('statsTotalSongs').textContent = (appConfig.data.songs || []).length;
    }
    if (document.getElementById('statsTotalUsers')) {
        document.getElementById('statsTotalUsers').textContent = (appConfig.data.users || []).length;
    }

    const songs = appConfig.currentFilter || appConfig.data.songs || [];
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songs);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');

    if (appConfig.isAdmin) {
        renderUserList('usersListGrid', appConfig.data.users);
        renderStatsOverview();
        updateCloudinaryUsage();
        updateMaintenanceUI(); // Actualizar estado del toggle de mantenimiento
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
        const art = getSongArtForList(s);
        const artist = s.genre || s.artist || 'Artista Desconocido';

        if (id === 'userSongList') {
            div.className = "flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group active:scale-95";
            div.innerHTML = `
                <div class="size-14 rounded-lg overflow-hidden shadow-lg shrink-0">
                    <img src="${art}" loading="lazy" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm truncate text-white">${s.title}</p>
                    <p class="text-xs text-white/50 truncate">${artist}</p>
                </div>
                <div class="playing-indicator" id="playing-indicator-${s.id}" style="display:none">
                    <div class="playing-bar" style="height:10px"></div>
                    <div class="playing-bar" style="height:16px"></div>
                    <div class="playing-bar" style="height:12px"></div>
                </div>
                <button class="size-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-primary/20 transition-all mr-2" onclick="event.stopPropagation(); openAddToPlaylistModal(${s.id})">
                    <span class="material-symbols-outlined text-[20px]">playlist_add</span>
                </button>
                <button class="size-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-primary/20 transition-all" onclick="event.stopPropagation(); playSongId(${s.id})">
                    <span class="material-symbols-outlined text-[20px]" id="list-play-icon-${s.id}">play_arrow</span>
                </button>
            `;
        } else {
            div.className = 'song-list-item';
            div.id = `song-item-${s.id}`;
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
                    <button class="btn-list-action" onclick="event.stopPropagation(); openAddToPlaylistModal(${s.id})">
                        <span class="material-icons-round">playlist_add</span>
                    </button>
                    <button class="btn-list-action" onclick="event.stopPropagation(); playSongId(${s.id})">
                        <span class="material-icons-round" id="list-play-icon-admin-${s.id}">play_arrow</span>
                    </button>
                    ${adminBtns}
                </div>
                <div class="playing-indicator" id="playing-indicator-${s.id}">
                    <div class="playing-bar"></div><div class="playing-bar"></div><div class="playing-bar"></div>
                </div>
            `;
        }

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
        const art = getArtForAlbum(a);

        // Premium Carousel Design for both User and Admin
        div.className = "flex flex-col gap-3 min-w-[180px] snap-start group cursor-pointer active:scale-95 transition-transform relative";

        let adminOverlay = '';
        if (appConfig.isAdmin) {
            adminOverlay = `
                <div class="absolute top-2 left-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="size-8 bg-black/60 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-primary transition-colors" onclick="event.stopPropagation(); editAlbum(event, ${index})">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button class="size-8 bg-red-600/60 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors" onclick="event.stopPropagation(); deleteAlbum(event, ${index})">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="relative">
                ${adminOverlay}
                <div class="w-full aspect-square overflow-hidden rounded-[24px] shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
                    <img src="${art}" loading="lazy" class="w-full h-full object-cover">
                </div>
                <!-- Play button overlay -->
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]">
                    <div class="size-12 bg-white text-background-dark rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                        <span class="material-symbols-outlined fill-1 text-[28px]">play_arrow</span>
                    </div>
                </div>
                <!-- Mini playing indicator -->
                <div class="album-playing-indicator absolute top-3 right-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10" id="album-indicator-${index}" style="display:none">
                     <div class="playing-bar" style="height:10px; background:white"></div>
                     <div class="playing-bar" style="height:15px; background:white"></div>
                     <div class="playing-bar" style="height:12px; background:white"></div>
                </div>
            </div>
            <div class="px-1">
                <p class="text-white text-sm font-bold leading-tight truncate px-1">${a.name || a.title || 'Sin Título'}</p>
                <p class="text-white/50 text-[11px] font-medium truncate px-1">${a.artist || 'Artista'}</p>
            </div>
        `;

        div.onclick = () => openAlbum(index);
        c.appendChild(div);
    });
}

function renderSmartPlaylists(id) {
    const c = document.getElementById(id);
    if (!c) return;

    const smarts = [
        { name: 'Favoritos', icon: 'favorite', action: 'openFavorites()', color: 'from-primary/80 to-red-900/80', img: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400&auto=format&fit=crop' },
        { name: 'Recientes', icon: 'history', action: 'openRecent()', color: 'from-blue-600/80 to-indigo-900/80', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop' }
    ];

    if (id === 'userPlaylistGrid') {
        c.innerHTML = smarts.map(s => `
            <div class="relative group aspect-video rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all border border-white/10" onclick="${s.action}">
                <img src="${s.img}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-br ${s.color} backdrop-blur-[2px]"></div>
                <div class="absolute inset-0 p-4 flex flex-col justify-end">
                    <span class="material-symbols-outlined text-3xl mb-1">${s.icon}</span>
                    <h4 class="font-bold text-lg">${s.name}</h4>
                </div>
            </div>
        `).join('');
    } else {
        c.innerHTML = smarts.map(s => `
            <div class="collection-card smart-card" onclick="${s.action}">
                <div class="collection-cover" style="background: linear-gradient(135deg, var(--accent), var(--secondary)); display:flex; align-items:center; justify-content:center;">
                    <span class="material-icons-round" style="font-size:3rem; color:white;">${s.icon}</span>
                </div>
                <h4>${s.name}</h4>
            </div>
        `).join('');
    }
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
    const liveActivity = document.getElementById('liveActivityList');
    if (!container || !appConfig.data) return;

    // 1. Gráficos (Chart.js)
    if (typeof initUserActivityChart === 'function') initUserActivityChart();
    if (typeof initTopSongsChart === 'function') initTopSongsChart();

    // 2. Renderizar Actividad en Vivo (Simulada si no hay logs reales aún)
    if (liveActivity) {
        const logs = appConfig.data.logs || [
            { fecha: 'Hoy', email: 'admin@musichris.com', accion: 'LOGIN', titulo: 'Inicio Centro Control' }
        ];

        liveActivity.innerHTML = logs.slice(-5).reverse().map(log => {
            const pillClass = `pill-${log.accion.toLowerCase()}`;
            return `
                <div class="activity-row">
                    <span class="action-pill ${pillClass}">${log.accion}</span>
                    <div class="flex-1">
                        <p class="text-[11px] font-bold text-white/90 leading-tight">${log.titulo}</p>
                        <p class="text-[9px] text-white/40">${log.email.split('@')[0]} • ${log.fecha}</p>
                    </div>
                    ${log.tiempo && log.tiempo !== '0' ? `<span class="text-[9px] font-mono text-white/30">${log.tiempo}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // 3. Renderizar KPIs y Rankings Modernos
    const topSongs = appConfig.stats.topSongs || [];
    const topLikes = appConfig.stats.topLikes || [];

    // Calcular Top Usuarios
    const userLikes = {};
    appConfig.data.songs.forEach(s => {
        if (s.likes) s.likes.forEach(email => userLikes[email] = (userLikes[email] || 0) + 1);
    });
    const topUsers = Object.entries(userLikes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ email, count }));

    container.innerHTML = `
        <div class="stats-card-modern">
            <h4>🔥 Top Canciones</h4>
            <div class="space-y-4">
                ${topSongs.slice(0, 5).map((s, i) => `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <span class="text-xs font-black text-white/20">${i + 1}</span>
                            <div class="text-[11px] font-bold text-white">${s.title}</div>
                        </div>
                        <span class="text-[10px] font-black tabular-nums text-primary">${s.plays} <small class="text-white/30">PLAYS</small></span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="stats-card-modern">
            <h4>❤️ Más Amadas</h4>
            <div class="space-y-4">
                ${topLikes.slice(0, 5).map((s, i) => `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <span class="text-xs font-black text-white/20">${i + 1}</span>
                            <div class="text-[11px] font-bold text-white">${s.title}</div>
                        </div>
                        <span class="text-[10px] font-black tabular-nums text-green-500">${s.likeCount} <small class="text-white/30">LIKES</small></span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="stats-card-modern">
            <h4>👤 Usuarios Top</h4>
            <div class="space-y-4">
                ${topUsers.map((u, i) => `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}" class="size-6 rounded-full bg-white/5">
                            <div>
                                <div class="text-[11px] font-bold text-white">${u.email.split('@')[0]}</div>
                                <div class="text-[8px] text-white/30 tracking-tight">${u.email}</div>
                            </div>
                        </div>
                        <span class="text-[10px] font-black text-white/60">${u.count} <small class="text-white/20">ACCIONES</small></span>
                    </div>
                `).join('')}
            </div>
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

let searchLogTimeout = null;
function filterSongs(query) {
    const q = norm(query);
    if (!q) {
        updateUI();
        return;
    }

    // Debounce para no loguear cada letra
    clearTimeout(searchLogTimeout);
    searchLogTimeout = setTimeout(() => {
        logActivity('SEARCH', null, query);
    }, 1500);

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
    const email = appConfig.user.email.toLowerCase();
    const favs = appConfig.data.songs.filter(s => s.likes && s.likes.some(e => e.toLowerCase() === email));

    if (favs.length === 0) return showToast("No tienes favoritos aún", 'info');

    appConfig.tempPlaylist = favs;
    updateUI(favs);

    // Desplazamiento automático a la lista
    const target = document.getElementById('userSongList');
    if (target) {
        const header = target.previousElementSibling;
        if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function openRecent() {
    // Ordenar por última reproducción, y si no ha sido reproducida, por fecha de subida
    const recent = [...appConfig.data.songs]
        .filter(s => s.lastPlayed > 0 || s.addedDate > 0)
        .sort((a, b) => {
            const timeA = a.lastPlayed || a.addedDate || 0;
            const timeB = b.lastPlayed || b.addedDate || 0;
            return timeB - timeA;
        })
        .slice(0, 20);

    if (recent.length === 0) return showToast("Aún no hay actividad reciente", 'info');

    appConfig.tempPlaylist = recent;
    updateUI(recent);

    // Desplazamiento automático a la lista
    const target = document.getElementById('userSongList');
    if (target) {
        const header = target.previousElementSibling;
        if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Helpers para Imágenes y Optimización
// 🎯 PROTECCIÓN DE CUOTA CLOUDINARY
// Esta función optimiza URLs de Cloudinary para minimizar:
// - Transformaciones (25,000/mes en cuenta gratuita)
// - Ancho de banda (25 GB/mes en cuenta gratuita)
function optimizeCloudinaryUrl(url, width = null) {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;

    // Si ya tiene transformaciones, no añadimos más para no romper la URL
    if (url.includes('/upload/v') || url.includes('/upload/f_')) {
        // Estrategia de optimización agresiva:
        // - f_auto: Formato automático (WebP en navegadores compatibles, reduce 30-50% el tamaño)
        // - q_auto:low: Calidad automática baja (suficiente para miniaturas, reduce 50-70% el tamaño)
        // - w_X,c_limit: Limitar ancho (reduce resolución innecesaria)
        // - dpr_auto: Pixel ratio automático (optimiza para pantallas Retina sin duplicar tamaño)

        let transform = 'f_auto,q_auto:low,dpr_auto';
        if (width) {
            transform += `,w_${width},c_limit`;
        }

        // Reemplazar transformaciones existentes o agregar nuevas
        if (url.includes('/upload/f_')) {
            // Ya tiene transformaciones, reemplazarlas
            return url.replace(/\/upload\/[^\/]+\//, `/upload/${transform}/`);
        } else {
            // No tiene transformaciones, agregarlas
            return url.replace('/upload/', `/upload/${transform}/`);
        }
    }
    return url;
}

function getSongArtForList(song) {
    let rawCover = song.cover;
    if (!rawCover && song.album && appConfig.data.albums) {
        const alb = appConfig.data.albums.find(a => norm(a.name) === norm(song.album) || norm(a.title) === norm(song.album));
        if (alb && (alb.cover || alb.coverUrl)) rawCover = alb.cover || alb.coverUrl;
    }
    return optimizeCloudinaryUrl(rawCover || DEFAULT_COVER, 150);
}

function updateCloudinaryUsage() {
    const usageEl = document.getElementById('statsCloudinaryUsage');
    if (!usageEl) return;

    if (!appConfig.data || !appConfig.data.songs) {
        usageEl.textContent = "Cargando...";
        return;
    }

    // Cálculo estimado (5.5MB por canción)
    const songCount = appConfig.data.songs.length;
    const avgSizeMB = 5.5;
    const totalUsedMB = (songCount * avgSizeMB);
    const totalUsedGB = totalUsedMB / 1024;
    const freePlanGB = 25;
    const percentage = Math.min(100, (totalUsedGB / freePlanGB) * 100).toFixed(1);

    usageEl.textContent = `${percentage}%`;

    // Si queremos ver el detalle al hacer hover o algo similar, pero por ahora directo
    const fullInfo = `${percentage}% (${totalUsedMB.toFixed(0)}MB)`;
    usageEl.setAttribute('title', fullInfo);

    // Estado del Servidor Moderno
    if (document.getElementById('statsCloudStatus')) {
        const lastSync = appConfig.stats.lastSync || Date.now();
        const diff = (Date.now() - lastSync) / 1000;
        const statusEl = document.getElementById('statsCloudStatus');

        if (diff < 300) {
            statusEl.textContent = 'ONLINE';
            statusEl.style.color = '#22c55e';
        } else {
            statusEl.textContent = 'STABLE';
            statusEl.style.color = 'var(--accent)';
        }
    }
}

function getSongArtForPlayer(song) {
    return optimizeCloudinaryUrl(getSongArtForList(song).replace(/w_150,c_limit\//, ''), 600);
}

function getArtForAlbum(album) {
    const rawCover = album.cover || album.coverUrl || DEFAULT_COVER;
    return optimizeCloudinaryUrl(rawCover, 400);
}

function getOptimizedAvatar(url) {
    const rawAvatar = url || ADMIN_AVATAR;
    return optimizeCloudinaryUrl(rawAvatar, 100);
}

function updateVisualizer(isPlaying) {
    const bars = document.querySelectorAll('.playing-bar, .visualizer-bar-red, .horizontal-bar');
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


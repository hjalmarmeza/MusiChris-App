// MANEJADOR DE DATOS (API Y PERSISTENCIA)

async function loadAppData() {
    try {
        const res = await fetch(API_BASE_URL); // El proxy ya gestiona la API Key y el Bin ID
        if (!res.ok) throw new Error("API Error");
        const json = await res.json();

        // El proxy devuelve directamente el .record o el objeto completo de JSONBin según cómo se configure
        appConfig.data = json.record || json;

        // Inicializar arrays si no existen
        if (!appConfig.data.songs) appConfig.data.songs = [];
        if (!appConfig.data.users) appConfig.data.users = [];
        if (!appConfig.data.albums) appConfig.data.albums = [];
        if (!appConfig.data.playlists) appConfig.data.playlists = [];
        if (!appConfig.data.stats) appConfig.data.stats = {};

        // Limpieza y validación de canciones
        appConfig.data.songs.forEach(s => {
            if (!s.likes) s.likes = [];
            if (!s.plays) s.plays = 0;
            if (!s.superLikes) s.superLikes = [];
            if (!s.addedDate) s.addedDate = s.id || Date.now();
        });

        calculateStats();

        if (appConfig.isGuest && appConfig.pendingSongId) {
            activateGuestMode();
        } else {
            updateUI();
        }

        showToast("Datos sincronizados", 'success');
    } catch (e) {
        console.error("Error al cargar datos:", e);
        showToast("Error de conexión - Modo Offline", 'error');

        // Datos de respaldo si falla la API
        if (!appConfig.data) {
            appConfig.data = {
                songs: [],
                users: [],
                albums: [],
                playlists: [],
                stats: {}
            };
        }
        updateUI();
    }
}

async function saveData() {
    try {
        await fetch(API_BASE_URL, {
            method: 'POST', // Usamos POST para que el proxy reciba los datos
            mode: 'no-cors', // Evita problemas de CORS al guardar desde GitHub
            body: JSON.stringify(appConfig.data)
        });
        showToast("Sincronizando...", 'info');
    } catch (e) {
        console.error('Error al guardar:', e);
        showToast("Error al sincronizar cambios", 'error');
    }
}

function calculateStats() {
    if (!appConfig.data || !appConfig.data.songs) return;

    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // 1. Top Reproducciones
    appConfig.stats.topSongs = [...appConfig.data.songs]
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 10);

    // 2. Top Likes
    appConfig.stats.topLikes = [...appConfig.data.songs]
        .map(song => ({
            ...song,
            likeCount: song.likes ? song.likes.length : 0
        }))
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 10);

    // 3. Canciones Ignoradas
    appConfig.stats.ignoredSongs = appConfig.data.songs
        .filter(song => {
            const plays = song.plays || 0;
            const age = now - (song.addedDate || song.id || now);
            return plays === 0 && age > oneMonthAgo;
        })
        .sort((a, b) => b.addedDate - a.addedDate);

    appConfig.stats.lastSync = now;
}

// MANEJADOR DE DATOS (API Y PERSISTENCIA)

async function loadAppData() {
    // 0. Inicializar estructura mínima si es NULL
    if (!appConfig.data) {
        appConfig.data = {
            songs: [],
            users: [],
            albums: [],
            playlists: [],
            stats: {},
            maintenanceMode: false  // Control de modo mantenimiento
        };
    }

    // 1. Cargar desde LocalStorage inmediatamente para velocidad
    const cachedData = localStorage.getItem('musichris_db_cache');
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (parsed && (parsed.songs || parsed.users)) {
                appConfig.data = parsed;
                validateAndInitData();
                updateUI();
                console.log("⚡ Carga instantánea desde caché local");
            }
        } catch (e) { console.error("Error cache:", e); }
    }

    // 2. Sincronizar con JSONBin.io
    try {
        console.log("☁️ Sincronizando con la nube...");
        console.log("📍 URL:", `${API_BASE_URL}${PERMANENT_BIN_ID}`);
        console.log("🔑 API Key presente:", PERMANENT_API_KEY ? "Sí" : "No");

        const res = await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': PERMANENT_API_KEY
            },
            mode: 'cors',
            cache: 'no-cache'
        });

        console.log("📡 Respuesta HTTP:", res.status, res.statusText);

        if (!res.ok) {
            throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        console.log("📦 Datos recibidos:", json);
        const freshData = json.record;

        // Verificar que tenemos datos válidos
        if (freshData && freshData.songs && Array.isArray(freshData.songs)) {
            console.log(`💿 Base de datos recuperada (${freshData.songs.length} canciones).`);
            appConfig.data = freshData;
            validateAndInitData();
            localStorage.setItem('musichris_db_cache', JSON.stringify(appConfig.data));
            updateUI();
            showToast("Datos sincronizados", 'success');
        } else {
            console.warn("⚠️ No se encontraron canciones en la respuesta del servidor.");
            console.log("🔍 Estructura recibida:", Object.keys(freshData || {}));
            // Si no hay datos en la nube pero sí en caché, mantener el caché
            if (appConfig.data && appConfig.data.songs && appConfig.data.songs.length > 0) {
                console.log("✅ Manteniendo datos locales del caché.");
                showToast("Usando copia local", 'info');
            } else {
                showToast("No hay datos disponibles", 'warning');
            }
            updateUI();
        }

    } catch (e) {
        console.error("❌ Error de red durante la sincronización:", e);
        console.error("📋 Detalles del error:", e.message);
        console.error("📋 Stack trace:", e.stack);

        // Si hay error pero tenemos caché, usar el caché
        if (appConfig.data && appConfig.data.songs && appConfig.data.songs.length > 0) {
            console.log("✅ Usando caché local (", appConfig.data.songs.length, "canciones)");
            validateAndInitData();
            updateUI();
            showToast("Modo offline - Usando caché", 'info');
        } else {
            console.warn("⚠️ No hay caché disponible");
            showToast("Error de conexión - Sin datos", 'error');
        }
        updateUI();
    }
}

function validateAndInitData() {
    if (!appConfig.data) return;
    if (!appConfig.data.songs) appConfig.data.songs = [];
    if (!appConfig.data.users) appConfig.data.users = [];
    if (!appConfig.data.albums) appConfig.data.albums = [];
    if (!appConfig.data.playlists) appConfig.data.playlists = [];
    if (!appConfig.data.stats) appConfig.data.stats = {};

    appConfig.data.songs.forEach(s => {
        if (!s.likes) s.likes = [];
        if (!s.plays) s.plays = 0;
        if (!s.superLikes) s.superLikes = [];
        if (!s.addedDate) s.addedDate = s.id || Date.now();
    });
    calculateStats();
}

async function saveData() {
    // Sanity check: No guardar si la base de datos parece vacía o corrupta
    if (!appConfig.data || (!appConfig.data.songs.length && !appConfig.data.users.length)) {
        console.warn("⚠️ Intento de guardado de base de datos vacía cancelado para evitar corrupción.");
        return;
    }

    try {
        await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'X-Master-Key': PERMANENT_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appConfig.data)
        });
        // Actualizar caché local también
        localStorage.setItem('musichris_db_cache', JSON.stringify(appConfig.data));
        console.log("✅ Datos guardados correctamente");
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

// ========================================================================
// FUNCIONES DE GOOGLE APPS SCRIPT - ESTADÍSTICAS Y EXPORTACIÓN
// ========================================================================

/**
 * Registra la actividad del usuario en Google Sheets (Hoja 1)
 * Campos: Fecha y Hora | Email del Usuario | Tipo de Acción | Título de la Canción | Álbum / Artista | Dispositivo | Tiempo de Escucha
 */
async function logActivity(action, song = null, extra = "") {
    if (!appConfig.user) return;

    // PROTECCIÓN: No enviar logs si la base de datos está en estado corrupto o vacío
    if (!appConfig.data || !appConfig.data.songs || appConfig.data.songs.length === 0) {
        if (action !== 'LOGIN') {
            console.warn(`🚫 Log ${action} cancelado: Base de datos no inicializada.`);
            return;
        }
    }

    const logData = {
        action: "log", // Indica que es un log de actividad
        data: {
            fecha: new Date().toLocaleString('es-ES'),
            email: appConfig.user.email,
            accion: action,
            titulo: song ? song.title : (extra || "N/A"),
            artista: song ? (song.artist || song.album || song.genre || "N/A") : "N/A",
            dispositivo: isIOS ? "iOS" : (isAndroid ? "Android" : "PC/Web"),
            tiempo: extra && action === 'SONG_END' ? extra : "0"
        }
    };

    try {
        fetch(`${GOOGLE_APPS_SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        console.log(`📊 Log enviado: ${action}`);
    } catch (e) {
        console.error("Error al enviar Log:", e);
    }
}

/**
 * Exporta toda la biblioteca de canciones a Google Sheets (Hoja 2)
 * Campos: NOMBRE DE ALBUM | URL IMAGEN | TÍTULO DE CANCIÓN | URL CANCIÓN
 */
async function exportLibraryToSheet() {
    if (!appConfig.data || !appConfig.data.songs) return;

    // Solo permitir si hay canciones
    if (appConfig.data.songs.length === 0) {
        showToast("No hay canciones para exportar", 'warning');
        return;
    }

    showToast("📤 Iniciando exportación a Sheet...", 'info');

    // Mapear al formato plano solicitado
    const flatData = appConfig.data.songs.map(song => {
        const album = appConfig.data.albums?.find(a => norm(a.name || a.title) === norm(song.album)) || {};
        // Asegurar que cover tenga valor válido
        const coverUrl = album.cover || album.coverUrl || album.img || DEFAULT_COVER;

        return {
            album_nombre: song.album || "Sin Álbum",
            album_cover: coverUrl,
            song_titulo: song.title,
            song_url: song.url || ""
        };
    });

    const exportData = {
        action: "export_library",
        data: flatData
    };

    console.log("📤 Enviando datos a Apps Script:", flatData.length, "items");

    try {
        // Usamos no-cors, por lo que la respuesta es opaca.
        // Asumimos éxito si no hay error de red.
        await fetch(`${GOOGLE_APPS_SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exportData)
        });

        showToast("✅ Petición de exportación enviada", 'success');
        console.log("🚀 Petición finalizada (Modo no-cors - Verifica tu Google Sheet)");

    } catch (e) {
        console.error("❌ Error al exportar:", e);
        showToast("Error de conexión con Google Sheet", 'error');
    }
}

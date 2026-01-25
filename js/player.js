// LÓGICA DEL REPRODUCTOR DE AUDIO

function playSong(song) {
    if (!song) return;
    console.log('🎵 Reproduciendo:', song.title);

    appConfig.currentSong = song;

    // Sincronización inteligente de playlist
    let songIndex = -1;
    if (appConfig.tempPlaylist && appConfig.tempPlaylist.length > 0) {
        songIndex = appConfig.tempPlaylist.findIndex(s => s.id == song.id);
    }

    if (songIndex === -1) {
        // Si la canción no está en la temporal, usamos el filtro actual o todas las canciones
        appConfig.tempPlaylist = appConfig.currentFilter || (appConfig.data ? appConfig.data.songs : []);
        songIndex = appConfig.tempPlaylist.findIndex(s => s.id == song.id);
    }

    appConfig.currentIndex = songIndex;

    // UI del Reproductor
    const mainPlayer = document.getElementById('mainPlayer');
    if (mainPlayer) {
        mainPlayer.style.display = 'flex';
        mainPlayer.classList.remove('hidden');
    }

    if (document.getElementById('pTitle')) document.getElementById('pTitle').textContent = song.title;
    if (document.getElementById('pArtist')) document.getElementById('pArtist').textContent = song.genre;
    if (document.getElementById('pCoverMini')) document.getElementById('pCoverMini').src = getSongArtForPlayer(song);

    updateLikeIcon();
    setupMediaSession(song);

    // Audio Control
    if (dom.audioElement && song.url) {
        dom.audioElement.pause();
        // Detenemos cualquier carga previa
        dom.audioElement.src = song.url;

        dom.audioElement.play()
            .then(() => {
                togglePlayIcon(true);
                updateMediaSession(song);
                updateWeeklyStats();
            })
            .catch(err => {
                // AbortError sucede cuando se cancela una carga para empezar otra (ej: click rápido en Next)
                // No es un error real para el usuario, así que lo ignoramos.
                if (err.name !== 'AbortError') {
                    console.error('Play error:', err);
                    showToast("Error de reproducción", 'error');
                }
                togglePlayIcon(false);
            });
    }

    // Actualizar Reproducciones
    const songInMemory = appConfig.data.songs.find(s => s.id === song.id);
    if (songInMemory) {
        songInMemory.plays = (songInMemory.plays || 0) + 1;

        // Registrar historial en Google Sheets con el nuevo sistema
        logActivity('PLAY', songInMemory);

        saveDataSilent();
        calculateStats();
        if (appConfig.isAdmin) renderStatsOverview();
    }

    updatePlayingIndicators();
    updateGuestPlayerUI();
    setTimeout(adjustTitleSize, 50); // Small delay to ensure DOM update
}

function playSongId(id) {
    const song = appConfig.data.songs.find(s => s.id === id);
    if (song) {
        if (appConfig.currentSong && appConfig.currentSong.id === song.id) {
            toggle_play();
        } else {
            playSong(song);
        }
    }
}

function toggle_play() {
    if (!dom.audioElement) return;
    if (dom.audioElement.paused) {
        dom.audioElement.play()
            .then(() => togglePlayIcon(true))
            .catch(err => {
                if (err.name !== 'AbortError') showToast("Error al reanudar", 'error');
                togglePlayIcon(false);
            });
    } else {
        dom.audioElement.pause();
        togglePlayIcon(false);
    }
}

function next() {
    if (!appConfig.tempPlaylist || appConfig.tempPlaylist.length === 0) {
        appConfig.tempPlaylist = appConfig.data ? appConfig.data.songs : [];
    }
    if (appConfig.tempPlaylist.length === 0) return;

    if (appConfig.repeatMode === 'one' && dom.audioElement && dom.audioElement.ended) {
        playSong(appConfig.currentSong);
        return;
    }

    let nextIdx;
    if (appConfig.isShuffle) {
        nextIdx = Math.floor(Math.random() * appConfig.tempPlaylist.length);
        // Evitar repetir la misma si hay más de una canción
        if (nextIdx === appConfig.currentIndex && appConfig.tempPlaylist.length > 1) {
            nextIdx = (nextIdx + 1) % appConfig.tempPlaylist.length;
        }
    } else {
        nextIdx = appConfig.currentIndex + 1;
    }

    if (nextIdx < appConfig.tempPlaylist.length) {
        playSong(appConfig.tempPlaylist[nextIdx]);
    } else if (appConfig.repeatMode === 'all' || !dom.audioElement || !dom.audioElement.ended) {
        // Si pulsamos el botón NEXT manualmente al final, vamos al principio
        playSong(appConfig.tempPlaylist[0]);
    } else {
        togglePlayIcon(false);
    }
}

function prev() {
    if (!appConfig.tempPlaylist || appConfig.tempPlaylist.length === 0) {
        appConfig.tempPlaylist = appConfig.data ? appConfig.data.songs : [];
    }
    if (appConfig.tempPlaylist.length === 0) return;

    let prevIdx = appConfig.currentIndex - 1;
    if (prevIdx < 0) {
        prevIdx = appConfig.tempPlaylist.length - 1; // Circular
    }

    playSong(appConfig.tempPlaylist[prevIdx]);
}

function updateProgress() {
    const au = dom.audioElement;
    if (!au || isNaN(au.duration)) return;

    const pct = (au.currentTime / au.duration) * 100;

    // Update Mini Slider (div based)
    const miniSlider = document.getElementById('seekSliderMini');
    if (miniSlider) miniSlider.style.width = pct + '%';

    // Update Expanded Slider (custom div based)
    const expSlider = document.getElementById('expandedSeekSlider');
    const expKnob = document.getElementById('seekKnob');
    if (expSlider) expSlider.style.width = pct + '%';
    if (expKnob) expKnob.style.left = pct + '%';

    // Sync timers
    const timeStr = formatTime(au.currentTime);
    const totalStr = formatTime(au.duration);

    ['miniCurTime', 'expCurTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = timeStr;
    });

    ['miniTotTime', 'expTotTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = totalStr;
    });
}

function toggleShuffle(btn) {
    appConfig.isShuffle = !appConfig.isShuffle;
    updateControlIcons();
    showToast(appConfig.isShuffle ? "Aleatorio: ON" : "Aleatorio: OFF");
}

function toggleRepeat(btn) {
    // Ciclo: No repeat -> Repeat All -> Repeat One -> No repeat
    if (!appConfig.repeatMode) appConfig.repeatMode = 'none';

    if (appConfig.repeatMode === 'none') {
        appConfig.repeatMode = 'all';
        appConfig.isRepeat = true;
    } else if (appConfig.repeatMode === 'all') {
        appConfig.repeatMode = 'one';
        appConfig.isRepeat = false; // logic changes to manual check in ended event
    } else {
        appConfig.repeatMode = 'none';
        appConfig.isRepeat = false;
    }

    updateControlIcons();
    const msgs = { 'none': 'Repetición: OFF', 'all': 'Repetir Todo', 'one': 'Repetir Una' };
    showToast(msgs[appConfig.repeatMode]);
}

function updateControlIcons() {
    // Mini player often uses material-icons-round or specific IDs like miniShuffleIcon
    const shuffleIcons = document.querySelectorAll('.material-icons-round[onclick*="toggleShuffle"], .material-symbols-outlined#shuffleIcon, .material-symbols-outlined#miniShuffleIcon');
    shuffleIcons.forEach(icon => {
        const isSymbols = icon.classList.contains('material-symbols-outlined');
        if (isSymbols) {
            icon.classList.toggle('text-primary', appConfig.isShuffle);
            icon.classList.toggle('fill-1', appConfig.isShuffle);
            icon.classList.toggle('text-white/40', !appConfig.isShuffle);
        } else {
            icon.classList.toggle('btn-active', appConfig.isShuffle);
        }
    });

    const repeatIcons = document.querySelectorAll('.material-icons-round[onclick*="toggleRepeat"], .material-symbols-outlined#repeatIcon, .material-symbols-outlined#miniRepeatIcon');
    repeatIcons.forEach(icon => {
        const isSymbols = icon.classList.contains('material-symbols-outlined');
        const isOne = appConfig.repeatMode === 'one';
        const isNone = appConfig.repeatMode === 'none';

        if (isSymbols) {
            icon.textContent = isOne ? 'repeat_one' : 'repeat';
            icon.classList.toggle('text-primary', !isNone);
            icon.classList.toggle('fill-1', !isNone);
            icon.classList.toggle('text-white/40', isNone);
        } else {
            icon.classList.toggle('btn-active', !isNone);
            icon.textContent = isOne ? 'repeat_one' : 'repeat';
        }
    });
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekAudio(e) {
    if (!dom.audioElement || !dom.audioElement.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    dom.audioElement.currentTime = dom.audioElement.duration * pct;
    updateProgress();
}

async function saveDataSilent() {
    if (!appConfig.data || (!appConfig.data.songs.length && !appConfig.data.users.length)) return;

    try {
        await fetch(`${API_BASE_URL}?action=save`, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(appConfig.data)
        });
    } catch (e) {
        console.error('Silent save failed:', e);
    }
}


function updateWeeklyStats() {
    if (!appConfig.data.stats.weeklyData) appConfig.data.stats.weeklyData = Array(7).fill(0);
    const today = new Date().getDay();
    const index = today === 0 ? 6 : today - 1;
    appConfig.data.stats.weeklyData[index]++;
}



function updatePlayingIndicators() {
    document.querySelectorAll('.playing-indicator, .album-playing-indicator').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[id^="list-play-icon-"]').forEach(el => el.textContent = 'play_arrow');

    if (appConfig.currentSong) {
        const songInd = document.getElementById(`playing-indicator-${appConfig.currentSong.id}`);
        if (songInd) songInd.style.display = 'flex';

        const isPlaying = dom.audioElement && !dom.audioElement.paused;
        const icon = isPlaying ? 'pause' : 'play_arrow';

        const listIcon = document.getElementById(`list-play-icon-${appConfig.currentSong.id}`);
        if (listIcon) listIcon.textContent = icon;

        const adminListIcon = document.getElementById(`list-play-icon-admin-${appConfig.currentSong.id}`);
        if (adminListIcon) adminListIcon.textContent = icon;

        const miniVis = document.getElementById('visualizer-mini');
        if (miniVis) miniVis.style.display = 'flex';

        // Indicador de álbum
        if (appConfig.currentSong.album) {
            const albumIdx = appConfig.data.albums.findIndex(a => norm(a.name) === norm(appConfig.currentSong.album));
            if (albumIdx !== -1) {
                const albInd = document.getElementById(`album-indicator-${albumIdx}`);
                if (albInd) albInd.style.display = 'flex';
            }
        }
    }
}

function togglePlayIcon(isPlaying) {
    const icon = isPlaying ? 'pause' : 'play_arrow';
    ['iconPlay', 'iconPlayBig', 'iconPlayMin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = icon;
    });

    if (appConfig.currentSong) {
        const listIcon = document.getElementById(`list-play-icon-${appConfig.currentSong.id}`);
        if (listIcon) listIcon.textContent = icon;

        const adminListIcon = document.getElementById(`list-play-icon-admin-${appConfig.currentSong.id}`);
        if (adminListIcon) adminListIcon.textContent = icon;
    }

    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    if (typeof updateVisualizer === 'function') updateVisualizer(isPlaying);
}

function adjustTitleSize() {
    const title = document.getElementById('guestTitle');
    if (!title) return;

    // Asegurar visibilidad
    title.style.opacity = '1';
    title.style.visibility = 'visible';

    const parent = title.parentElement;
    if (!parent || parent.clientWidth === 0) return; // Si no es visible aún

    // Empezar tamaño base
    let currentSize = 24; // text-2xl
    title.style.fontSize = `${currentSize}px`;
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';

    // Bucle de ajuste seguro
    while (title.scrollWidth > parent.clientWidth && currentSize > 14) {
        currentSize--;
        title.style.fontSize = `${currentSize}px`;
    }
}

// Escuchar cambios de tamaño de ventana para reajustar
window.addEventListener('resize', () => {
    requestAnimationFrame(adjustTitleSize);
});

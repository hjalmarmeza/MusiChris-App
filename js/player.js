// LÓGICA DEL REPRODUCTOR DE AUDIO

function playSong(song) {
    if (!song) return;
    console.log('🎵 Reproduciendo:', song.title);

    appConfig.currentSong = song;
    // Si no hay una playlist temporal activa, usamos todas las canciones
    if (!appConfig.tempPlaylist || appConfig.tempPlaylist.length === 0) {
        appConfig.tempPlaylist = appConfig.data.songs;
    }
    appConfig.currentIndex = appConfig.tempPlaylist.findIndex(s => s.id === song.id);

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
        dom.audioElement.src = song.url;
        dom.audioElement.load();

        dom.audioElement.play()
            .then(() => {
                togglePlayIcon(true);
                updateMediaSession(song);
                updateWeeklyStats();
            })
            .catch(err => {
                console.error('Play error:', err);
                showToast("Error de reproducción", 'error');
                togglePlayIcon(false);
            });
    }

    // Actualizar Reproducciones
    const songInMemory = appConfig.data.songs.find(s => s.id === song.id);
    if (songInMemory) {
        songInMemory.plays = (songInMemory.plays || 0) + 1;
        saveDataSilent();
        calculateStats();
        if (appConfig.isAdmin) renderStatsOverview();
    }

    updatePlayingIndicators();
    updateGuestPlayerUI();
}

function playSongId(id) {
    const song = appConfig.data.songs.find(s => s.id === id);
    if (song) playSong(song);
}

function toggle_play() {
    if (!dom.audioElement) return;
    if (dom.audioElement.paused) {
        dom.audioElement.play().then(() => togglePlayIcon(true));
    } else {
        dom.audioElement.pause();
        togglePlayIcon(false);
    }
}

function next() {
    if (appConfig.isGuest) return;

    let nextIdx = appConfig.currentIndex + 1;
    if (appConfig.isShuffle) {
        nextIdx = Math.floor(Math.random() * appConfig.tempPlaylist.length);
    }

    if (nextIdx < appConfig.tempPlaylist.length) {
        playSong(appConfig.tempPlaylist[nextIdx]);
    } else if (appConfig.isRepeat) {
        playSong(appConfig.tempPlaylist[0]);
    }
}

function prev() {
    if (appConfig.isGuest) return;
    if (appConfig.currentIndex > 0) {
        playSong(appConfig.tempPlaylist[appConfig.currentIndex - 1]);
    }
}

function updateProgress() {
    const au = dom.audioElement;
    if (!au || isNaN(au.duration)) return;

    const pct = (au.currentTime / au.duration) * 100;
    if (document.getElementById('seekSlider')) document.getElementById('seekSlider').value = pct;

    // Update labels if they exist
    const curTime = document.getElementById('expCurTime');
    const totTime = document.getElementById('expTotTime');
    if (curTime) curTime.textContent = formatTime(au.currentTime);
    if (totTime) totTime.textContent = formatTime(au.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekAudio(e) {
    if (!dom.audioElement || !dom.audioElement.duration) return;
    dom.audioElement.currentTime = dom.audioElement.duration * (e.target.value / 100);
}

async function saveDataSilent() {
    try {
        await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, {
            method: 'PUT',
            headers: {
                'X-Master-Key': appConfig.API_KEY,
                'Content-Type': 'application/json'
            },
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

    if (appConfig.currentSong) {
        const songInd = document.getElementById(`playing-indicator-${appConfig.currentSong.id}`);
        if (songInd) songInd.style.display = 'flex';

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
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

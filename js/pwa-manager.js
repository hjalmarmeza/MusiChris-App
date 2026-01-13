// MANEJADOR DE PWA Y MEDIA SESSION (PANTALLA BLOQUEADA)

function setupPWA() {
    console.log('🔧 Configurando PWA...');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ SW registrado:', reg.scope))
            .catch(err => console.log('❌ SW error:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone && isAndroid && !localStorage.getItem('pwaPromptRejected')) {
            setTimeout(showPWAInstallOption, 5000);
        }
    });
}

function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
            showToast("✅ App instalada", 'success');
            isStandalone = true;
        }
        deferredPrompt = null;
    });
}

function setupMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: song ? song.title : 'MusiChris',
        artist: song ? song.genre : 'MusiChris App',
        album: (song && song.album) ? song.album : 'MusiChris',
        artwork: [
            { src: song ? getSongArtForPlayer(song) : DEFAULT_COVER, sizes: '512x512', type: 'image/png' }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => toggle_play());
    navigator.mediaSession.setActionHandler('pause', () => toggle_play());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
}

function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = dom.audioElement?.paused ? 'paused' : 'playing';
}

function showPWAInstallOption() {
    if (isStandalone || pwaInstallShown) return;
    pwaInstallShown = true;
    showToast("💡 Puedes instalar MusiChris como app desde la configuración", 'info');
}

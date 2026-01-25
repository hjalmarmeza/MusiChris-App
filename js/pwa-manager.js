// MANEJADOR DE PWA Y MEDIA SESSION (PANTALLA BLOQUEADA)

function setupPWA() {
    console.log('🔧 Configurando PWA...');

    const isLocalFile = window.location.protocol === 'file:';

    if ('serviceWorker' in navigator && !isLocalFile) {
        navigator.serviceWorker.register('sw.js?v=49')
            .then(reg => {
                console.log('✅ SW registrado:', reg.scope);

                // Forzar actualización inmediata si hay un SW esperando
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast("✨ Nueva versión lista. Actualizando...", 'info');
                            setTimeout(() => {
                                skipWaitingAndReload();
                            }, 2000);
                        }
                    };
                };
            })
            .catch(err => console.log('❌ SW error:', err));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone && isAndroid && !localStorage.getItem('pwaPromptRejected')) {
            setTimeout(showPWAInstallOption, 5000);
        }
    });
}

function skipWaitingAndReload() {
    navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
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

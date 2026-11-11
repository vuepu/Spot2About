const CHECK_INTERVAL = 2000;
const NO_MUSIC_DELAY = 30000;
const MAX_LENGTH = 50;

let noMusicSince = null;
let previousStatus = null;
let idleMessage = '👀';
let checking = false;

function normalizeStatus(status) {
    return String(status || '').replace(/💤/g, '').replace(/\s+/g, ' ').trim();
}

function trimText(text, limit) {
    let result = '';
    for (const char of text) {
        if ((result + char).length > limit) break;
        result += char;
    }
    return result.trim();
}

function isPlaying() {
    const button = document.querySelector('button[data-testid="control-button-playpause"]');
    return button?.getAttribute('aria-label') === 'Pause';
}

function getSong() {
    const title = document.title.replace(' | Spotify', '').replace(/💤/g, '').trim();
    if (!title.includes(' • ')) return null;

    let [song, artist] = title.split(' • ', 2);
    song = song?.trim();
    artist = artist?.trim();
    if (!song || !artist) return null;

    const prefix = '🎵 ';
    const separator = ' - ';
    const available = MAX_LENGTH - prefix.length - separator.length;

    if (song.length + artist.length > available) {
        artist = trimText(artist, Math.min(18, available));
        song = trimText(song, available - artist.length);
    }
    return prefix + song + separator + artist;
}

async function sendStatus(status) {
    const normalized = normalizeStatus(status);
    if (!normalized || normalized === previousStatus) return;
    previousStatus = normalized;

    await chrome.storage.local.set({ lastSentStatus: normalized });
    chrome.runtime.sendMessage({ type: 'SPOT2ABOUT_STATUS', value: normalized });
    console.log('[Spot2About] Sent:', normalized);
}

async function checkMusic() {
    if (checking) return;
    checking = true;
    try {
        const song = getSong();
        if (isPlaying() && song) {
            noMusicSince = null;
            await sendStatus(song);
        } else {
            if (noMusicSince === null) noMusicSince = Date.now();
            if (Date.now() - noMusicSince >= NO_MUSIC_DELAY) {
                await sendStatus(idleMessage);
            }
        }
    } finally {
        checking = false;
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.idleMessage) {
        idleMessage = trimText(String(changes.idleMessage.newValue || '').trim(), MAX_LENGTH) || '👀';
        checkMusic();
    }
});

async function start() {
    const data = await chrome.storage.local.get(['lastSentStatus', 'idleMessage']);
    previousStatus = normalizeStatus(data.lastSentStatus || '');
    idleMessage = trimText(String(data.idleMessage || '').trim(), MAX_LENGTH) || '👀';
    await checkMusic();
    setInterval(checkMusic, CHECK_INTERVAL);
}

start();

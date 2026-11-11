const enabled = document.getElementById('enabled');
const syncState = document.getElementById('syncState');
const idleInput = document.getElementById('idleMessage');
const idlePreview = document.getElementById('idlePreview');
const counter = document.getElementById('counter');
const currentStatus = document.getElementById('currentStatus');
const feedback = document.getElementById('feedback');
const presets = [...document.querySelectorAll('.preset')];

function updatePreview() {
    const value = idleInput.value.trim() || '👀';
    idlePreview.textContent = value;
    counter.textContent = `${idleInput.value.length} / 50`;
    presets.forEach(button => button.classList.toggle('active', button.dataset.text === value));
}

function updateSwitch() {
    syncState.textContent = enabled.checked ? 'Enabled • syncing automatically' : 'Disabled • sync paused';
}

async function refresh() {
    const data = await chrome.storage.local.get(['enabled', 'idleMessage', 'desiredStatus']);
    enabled.checked = data.enabled !== false;
    idleInput.value = data.idleMessage || '👀';
    currentStatus.textContent = data.desiredStatus || 'Nothing sent yet';
    updateSwitch();
    updatePreview();

    const spotifyTabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' });
    const whatsappTabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    document.getElementById('spotifyState').textContent = spotifyTabs.length ? 'Tab open' : 'Tab closed';
    document.getElementById('whatsappState').textContent = whatsappTabs.length ? 'Tab open' : 'Tab closed';
}

idleInput.addEventListener('input', () => { feedback.textContent = ''; updatePreview(); });
enabled.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: enabled.checked });
    updateSwitch();
    feedback.textContent = enabled.checked ? 'Sync enabled' : 'Sync disabled';
});

presets.forEach(button => button.addEventListener('click', () => {
    idleInput.value = button.dataset.text;
    feedback.textContent = '';
    updatePreview();
}));

document.getElementById('reset').addEventListener('click', () => {
    idleInput.value = '👀';
    feedback.textContent = 'Press Save to apply';
    updatePreview();
});

document.getElementById('save').addEventListener('click', async () => {
    const value = idleInput.value.trim() || '👀';
    await chrome.storage.local.set({ idleMessage: value });
    idleInput.value = value;
    updatePreview();
    feedback.textContent = '✓ Saved!';
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.desiredStatus) {
        currentStatus.textContent = changes.desiredStatus.newValue || 'Nothing sent yet';
    }
});

refresh().catch(error => {
    feedback.textContent = 'Could not load settings';
    console.error('[Spot2About] Popup:', error);
});

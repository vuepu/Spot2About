
chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get([
        "enabled",
        "desiredStatus"
    ]);

    if (data.enabled === undefined) {
        await chrome.storage.local.set({
            enabled: true
        });
    }
});

async function applyStatus(status) {
    await chrome.storage.local.set({
        desiredStatus: status
    });

    const tabs = await chrome.tabs.query({
        url: "https://web.whatsapp.com/*"
    });

    for (const tab of tabs) {
        try {
            await chrome.tabs.sendMessage(tab.id, {
                type: "APPLY_ABOUT",
                value: status
            });
        } catch (error) {
            // WhatsApp may still be loading.
        }
    }
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SPOT2ABOUT_STATUS") {
        chrome.storage.local.get(
            ["enabled"],
            (data) => {
                if (data.enabled !== false) {
                    applyStatus(message.value);
                }
            }
        );
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (
        area === "local" &&
        changes.enabled &&
        changes.enabled.newValue === true
    ) {
        chrome.storage.local.get(
            ["desiredStatus"],
            (data) => {
                if (data.desiredStatus) {
                    applyStatus(data.desiredStatus);
                }
            }
        );
    }
});

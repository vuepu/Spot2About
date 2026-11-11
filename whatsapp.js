
const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

function isVisible(element) {
    return !!element &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden";
}

function getButtonLabel(button) {
    return [
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.innerText,
        button.textContent
    ].filter(Boolean).join(" ").trim().toLowerCase();
}

function findButton(name, scope = document) {
    return [...scope.querySelectorAll("button")].find(button =>
        isVisible(button) &&
        getButtonLabel(button).includes(name.toLowerCase())
    );
}

async function waitForButton(name, timeout = 20000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const button = findButton(name);

        if (button) {
            console.log("[Spot2About] Found button:", name, button);
            return button;
        }

        await sleep(250);
    }

    throw new Error("Button not found: " + name);
}

async function waitForInput(timeout = 15000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const input = document.querySelector(
            'input[role="textbox"][aria-invalid]'
        );

        if (input && isVisible(input)) return input;

        await sleep(250);
    }

    throw new Error("About input not found.");
}

async function updateAbout(value) {
    console.log("[Spot2About] Updating About:", value);

    // Check whether the About editor is already open.
    let input = document.querySelector(
        'input[role="textbox"][aria-invalid]'
    );

    if (!input || !isVisible(input)) {
        // Check whether the profile page is already open.
        let editButton = findButton(
            "Edit button for text status creation"
        );

        if (!editButton) {
            // First, look for View profile in case the menu is already open.
            let profileButton = findButton("View profile");

            if (!profileButton) {
                const footer = document.querySelector(
                    '[data-testid="navbar-footer-section"]'
                );

                if (!footer) {
                    throw new Error("WhatsApp navigation footer not found.");
                }

                const youButton =
                    findButton("You", footer) ||
                    findButton("You");

                if (!youButton) {
                    throw new Error("You button not found.");
                }

                console.log("[Spot2About] Opening You menu.");
                youButton.click();

                profileButton = await waitForButton("View profile");
            }

            console.log("[Spot2About] Opening profile.");
            profileButton.click();

            editButton = await waitForButton(
                "Edit button for text status creation"
            );
        }

        console.log("[Spot2About] Opening About editor.");
        editButton.click();

        input = await waitForInput();
    }

    if (!input) {
        throw new Error("About input not found.");
    }

    // Update the input using the native setter.
    const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
    ).set;

    input.focus();
    setter.call(input, value);

    input.dispatchEvent(
        new Event("input", { bubbles: true })
    );

    input.dispatchEvent(
        new Event("change", { bubbles: true })
    );

    await sleep(500);

    const saveButton = await waitForButton("Save");

    if (saveButton.disabled) {
        throw new Error("Save button is disabled.");
    }

    console.log("[Spot2About] Saving About.");
    saveButton.click();

    await sleep(1200);

    console.log("[Spot2About] About updated:", value);
}

// Keep the newest requested status instead of dropping updates.
let updating = false;
let pendingStatus = null;

async function processUpdates() {
    if (updating) return;

    updating = true;

    try {
        while (pendingStatus !== null) {
            const value = pendingStatus;
            pendingStatus = null;

            try {
                await updateAbout(value);
            } catch (error) {
                console.error(
                    "[Spot2About] Update failed:",
                    error
                );
            }
        }
    } finally {
        updating = false;

        // Handle a status that arrived right at the end.
        if (pendingStatus !== null) {
            processUpdates();
        }
    }
}

function handleStatus(value) {
    pendingStatus = value;
    processUpdates();
}

chrome.runtime.onMessage.addListener(message => {
    if (message.type === "APPLY_ABOUT") {
        handleStatus(message.value);
    }
});

// Restore the latest saved status when WhatsApp loads.
chrome.storage.local.get(
    ["enabled", "desiredStatus"],
    data => {
        if (
            data.enabled !== false &&
            data.desiredStatus
        ) {
            handleStatus(data.desiredStatus);
        }
    }
);

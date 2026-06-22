

// === Unified Settings & Canvas System ===

// 2. Viewer Controls Customization Logic
// Updated Viewer Controls with default keyboard shortcuts
let viewerControlsConfig = JSON.parse(localStorage.getItem('mathmaster_controls')) || [
    { id: 'dashboard', label: '← Dashboard', action: 'goHome()', key: 'h' },
    { id: 'reload', label: 'Reload', action: 'reloadGame()', key: 'r' },
    { id: 'fullscreen', label: 'Fullscreen', action: 'toggleFullscreen()', key: 'f' },
    { id: 'newtab', label: 'Open New Tab', action: 'openInNewTab()', key: 'n' }
];

let viewerControlsVisibility = JSON.parse(localStorage.getItem('mathmaster_controls_vis')) || {
    'dashboard': true, 'reload': true, 'fullscreen': true, 'newtab': true
};

// Renders the floating buttons onto the iframe overlay
function renderViewerButtons() {
    const container = document.getElementById('viewerControlsContainer');
    if (!container) return;
    
    let html = '';
    viewerControlsConfig.forEach((ctrl, index) => {
        if (viewerControlsVisibility[ctrl.id]) {
            // Apply the spot class based directly on the array index
            html += `<button class="viewer-btn-spot spot-${index}" onclick="${ctrl.action}">${ctrl.label}</button>`;
        }
    });
    container.innerHTML = html;
}

// Renders the settings menu and visually labels the designated spot
// Renders the settings menu and visually labels the designated spot
function renderSettingsList() {
    const list = document.getElementById('controlsList');
    if (!list) return;
    
    const positionLabels = ["Top Left", "Bottom Left", "Bottom Middle", "Bottom Right"];
    
    let html = '';
    viewerControlsConfig.forEach((ctrl, index) => {
        const isVisible = viewerControlsVisibility[ctrl.id];
        const upDisabled = index === 0;
        const downDisabled = index === viewerControlsConfig.length - 1;
        const currentPosition = positionLabels[index] || "Unassigned";

        html += `
            <div class="settings-item" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="settings-arrows">
                        <svg onclick="event.stopPropagation(); ${upDisabled ? '' : `moveControl(${index}, -1)`}" class="settings-arrow-icon ${upDisabled ? 'disabled' : ''}" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        <svg onclick="event.stopPropagation(); ${downDisabled ? '' : `moveControl(${index}, 1)`}" class="settings-arrow-icon ${downDisabled ? 'disabled' : ''}" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: white; font-weight: 500; font-size: 14px;">${ctrl.label}</span>
                        <span style="color: var(--accent-color); font-size: 11px; font-weight: 600; text-transform: uppercase;">${currentPosition}</span>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="text" maxlength="1" value="${ctrl.key || ''}" 
                           onchange="updateControlKey('${ctrl.id}', this.value)" 
                           placeholder="Key" 
                           style="width: 32px; text-align: center; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 6px; border-radius: 8px; font-weight: bold; text-transform: lowercase;">
                    <label class="ios-switch">
                        <input type="checkbox" onchange="toggleControlVis('${ctrl.id}', this.checked)" ${isVisible ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}
// Actually moves the item in the array to reorder
function moveControl(index, direction) {
    const target = viewerControlsConfig[index];
    viewerControlsConfig.splice(index, 1); // Remove from old spot
    viewerControlsConfig.splice(index + direction, 0, target); // Insert into new spot
    saveAndRenderControls();
}

function toggleControlVis(id, isVisible) {
    viewerControlsVisibility[id] = isVisible;
    saveAndRenderControls();
    checkSecretTrigger(); // <--- ADD THIS
}
function updateControlKey(id, newKey) {
    const ctrl = viewerControlsConfig.find(c => c.id === id);
    if (ctrl) {
        ctrl.key = newKey.toLowerCase();
        localStorage.setItem('mathmaster_controls', JSON.stringify(viewerControlsConfig));
    }
}
function saveAndRenderControls() {
    localStorage.setItem('mathmaster_controls', JSON.stringify(viewerControlsConfig));
    localStorage.setItem('mathmaster_controls_vis', JSON.stringify(viewerControlsVisibility));
    renderSettingsList();
    renderViewerButtons();
}

function toggleSettingsUI() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    const isActive = settingsPanel.classList.contains("active");
    
    closePopups(); // Close others first
    
    if (!isActive) {
        settingsPanel.classList.add("active");
        settingsBtn.classList.add("active-mode");
        renderSettingsList(); 
    }
}

// Initial render of the viewer buttons
renderViewerButtons();
/* ================= LOGIC ================= */

// === Save Tools ===

// === Save Tools ===

// === Advanced Full-Spectrum Save System ===

async function exportSave() {
    const saveData = {
        meta: {
            date: new Date().toISOString(),
            version: "2.5-FullBackup"
        },
        storage: {
            local: { ...localStorage },
            session: { ...sessionStorage },
            cookies: document.cookie
        },
        // Placeholder for IndexedDB (Requires async iteration)
        indexedDB: {} 
    };

    // Attempt to gather IndexedDB names (limited browser support for listing)
    if (window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        saveData.meta.dbCount = dbs.length;
    }

    // Create the blob (JSON format)
    const blob = new Blob(
        [JSON.stringify(saveData, null, 2)], 
        { type: "application/json" }
    );

    // Create download link with .json extension
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `mathmaster_backup_${Date.now()}.json`;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.storage) throw new Error("Invalid Backup Format");

            if (confirm("This will RESTORE all settings, cookies, and session data, then reload. Continue?")) {
                // 1. Restore LocalStorage
                localStorage.clear();
                Object.entries(data.storage.local).forEach(([k, v]) => localStorage.setItem(k, v));

                // 2. Restore SessionStorage
                sessionStorage.clear();
                Object.entries(data.storage.session).forEach(([k, v]) => sessionStorage.setItem(k, v));

                // 3. Restore Cookies
                if (data.storage.cookies) {
                    data.storage.cookies.split(";").forEach(cookie => {
                        document.cookie = cookie.trim() + ";path=/;max-age=31536000";
                    });
                }

                alert("Restore successful! Reloading site...");
                window.location.reload(); 
            }
        } catch (err) {
            alert("Error: Invalid .json backup file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}




// === Element Selectors ===
const searchBar = document.getElementById('spotlightSearch');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const suggestionsEl = document.getElementById('suggestions');
const settingsPanel = document.getElementById('settingsPanel');
const settingsBtn = document.getElementById('settingsBtn');

// === Popup Helper ===
function closePopups() {
    searchBar.classList.remove('active');
    settingsPanel.classList.remove('active');
    searchBtn.classList.remove('active-mode');
    settingsBtn.classList.remove('active-mode');
}

// === Settings Logic ===
function toggleSettingsUI() {
    const isActive = settingsPanel.classList.contains('active');
    closePopups(); // Close others first
    
    if (!isActive) {
        settingsPanel.classList.add('active');
        settingsBtn.classList.add('active-mode');
        // Render the list of controls dynamically when opened
        if (typeof renderSettingsList === 'function') renderSettingsList(); 
    }
}

// === Search Logic ===
function toggleSearch() {
    const isActive = searchBar.classList.contains("active");
    closePopups(); // Close others first
    
    if (!isActive) {
        searchBar.classList.add("active");
        searchBtn.classList.add("active-mode");
        searchInput.focus();
    } else {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event('input')); // Reset filter
    }
}

// Levenshtein Distance (needed for fuzzy AI scoring)
function levenshtein(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) {
    m[i] = [i];
    if (i === 0) for (let j = 1; j <= a.length; j++) m[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[j - 1] === a[i - 1]
        ? m[i - 1][j - 1]
        : 1 + Math.min(m[i - 1][j - 1], m[i][j - 1], m[i - 1][j]);
    }
  }
  return m[b.length][a.length];
}

function scoreMatch(query, name) {
  const q = query.toLowerCase();
  const n = name.toLowerCase();
  if (n.includes(q)) return 0;
  const dist = levenshtein(q, n);
  return dist + (n.startsWith(q[0]) ? -1 : 0);
}

searchInput.addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const cards = [...document.querySelectorAll('#gameGrid .card')];
  suggestionsEl.innerHTML = "";

  if (!q) {
    cards.forEach(c => c.style.display = 'block');
    return;
  }

  let visible = cards.filter(c => c.querySelector('h3').textContent.toLowerCase().includes(q));

  // Fuzzy guessing if no exact match
  if (visible.length === 0 && typeof games !== "undefined") {
    const guesses = games.map(g => ({ name: g.name, score: scoreMatch(q, g.name) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    suggestionsEl.innerHTML = "Did you mean:<br>" + guesses.map(g => `<b>${g.name}</b>`).join("<br>");
    const best = guesses.map(g => g.name.toLowerCase());
    visible = cards.filter(c => best.includes(c.querySelector('h3').textContent.toLowerCase()));
  }

  cards.forEach(c => c.style.display = 'none');
  visible.forEach(c => c.style.display = 'block');
});




document.addEventListener('click', (e) => {
    const isDock = e.target.closest('.dock-container');
    const isTour = e.target.closest('#tourWelcomeModal') || e.target.closest('#tourTooltip');
    const isVersion = e.target.closest('.version-container'); // NEW: check if click is inside version area

    // Close dock popups
    if (!isDock && !isTour) closePopups();

    // NEW: Close version note bubble if click is outside the version area
    if (!isVersion) {
        const bubble = document.getElementById('versionInputBubble');
        if (bubble && bubble.style.display === 'flex') {
            bubble.style.display = 'none';
        }
    }
});
// Real-time Filtering
searchInput.addEventListener('input', e => filterGames(e.target.value));
function filterGames(query) {
  const q = query.toLowerCase().trim();
  const cards = [...document.querySelectorAll('#gameGrid .card')];
  suggestionsEl.innerHTML = "";

  if (!q) {
    cards.forEach(c => c.style.display = 'block');
    return;
  }

  let visible = cards.filter(c =>
    c.querySelector('h3').textContent.toLowerCase().includes(q)
  );

  // Fuzzy guessing only if no direct matches
  if (visible.length === 0 && typeof games !== "undefined") {

    const guesses = games.map(g => ({
      name: g.name,
      score: scoreMatch(q, g.name)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

    suggestionsEl.innerHTML =
      "Did you mean:<br>" +
      guesses.map(g => `<b>${g.name}</b>`).join("<br>");

    const best = guesses.map(g => g.name.toLowerCase());

    visible = cards.filter(c =>
      best.includes(c.querySelector('h3').textContent.toLowerCase())
    );
  }

  cards.forEach(c => c.style.display = 'none');
  visible.forEach(c => c.style.display = 'block');
}



// === NEW: FIRST-TIME TOUR LOGIC (CORRECTED) ===
const tourWelcomeModal = document.getElementById('tourWelcomeModal');
const tourOverlay = document.getElementById('tourOverlay');
const tourTooltip = document.getElementById('tourTooltip');
const tourTextEl = document.getElementById('tourText');
const tourNextBtn = document.getElementById('tourNextBtn');
const tourEndBtn = document.getElementById('tourEndBtn');
tourNextBtn.addEventListener("click", nextTourStep);

let currentStep = 0;

const tourSteps = [
    {
        element: 'h1 .version', // Targets the version number span
        text: 'This is the **Version Number (v2.7)**, check here for update information!',
        position: 'bottom', // Tooltip appears below
        adjust: {y: 10, x: 0}
    },
    {
        element: '.header p a:nth-child(1)', // Game Request link
        text: 'The **Game Request** link is where you can request new games to be added!',
        position: 'bottom',
        adjust: {y: 10, x: 0}
    },
    {
        element: '.header p a:nth-child(2)', // Contact Us link
        text: 'The **Contact Us** link is where you can send a message, primarily for **Game Requests**!',
        position: 'bottom',
        adjust: {y: 10, x: 0}
    },
        {
        element: '.header p a:nth-child(3)', // Unblock Form link
        text: 'The **Unblock Form** is a way to request access if the site is blocked.',
        position: 'bottom',
        adjust: {y: 10, x: 0}
    },
        {
        element: '.header p a:nth-child(4)', // Github link
        text: 'The **Github** link is where you can view the source code and contribute!',
        position: 'bottom',
        adjust: {y: 10, x: 0}
    },
    {
        element: '.collapsible-header', // Credits button
        text: 'This is the **Credits Panel**. Click it to see the original creators of the games.',
        position: 'left',
        adjust: {y: 0, x: -10}
    },


    {
        element: '#searchBtn', // Search button
        text: 'This is the **Search** button. It opens a quick search bar above the dock.',
        position: 'top',
        adjust: {y: -10, x: 0}
    },
    {
        element: '#settingsBtn', // Settings button
        text: 'This is **Site Settings**. Click it to open the settings panel, where the canvas mode, export and import buttons, and viewer controls can be customized!',
        position: 'top',
        adjust: {y: -10, x: 0}
    }

];
function checkSecretTrigger() {
    // Check if ALL visibility toggles are false
    const allButtonsOff = Object.values(viewerControlsVisibility).every(val => val === false);
    
    // Check if Canvas Mode is on AND all buttons are off
    if (isCanvasMode && allButtonsOff) {
        document.getElementById("loginGate").style.display = "flex";
        closePopups(); // Optional: closes the settings panel so they just see the login
    }
}
function startTour() {
    tourWelcomeModal.style.display = 'none';
    tourOverlay.style.display = 'block';
    currentStep = 0;
    showTourStep(currentStep);
}

function nextTourStep() {
    if (currentStep < tourSteps.length - 1) {
        currentStep++;
        showTourStep(currentStep);
    } else {
        // If it was the last step, end the tour.
        endTour(true);
    }
}

function endTour(completed) {
    // This key ensures the welcome modal never shows again.
    localStorage.setItem("mathmaster_tour_completed", "true");
    
    // Clean up tour elements
    tourWelcomeModal.style.display = 'none';
    tourOverlay.style.display = 'none';
    tourTooltip.style.opacity = '0';
    
    // Remove the highlight box
    const highlight = document.querySelector('.tour-highlight');
    if (highlight) highlight.remove();

    if (completed) {
        // Optional: show a quick success message after the tour
        // alert("Tour complete! Enjoy the new features!");
    }
}

function showTourStep(stepIndex) {
    const step = tourSteps[stepIndex];
    const targetElement = document.querySelector(step.element);

    if (!targetElement) {
        console.error(`Tour element not found for step ${stepIndex}: ${step.element}`);
        nextTourStep(); // Skip missing step
        return;
    }
    
    // 1. Update Tooltip Content and Buttons
    tourTextEl.innerHTML = step.text;
    if (stepIndex === tourSteps.length - 1) {
        tourNextBtn.style.display = 'none';
        tourEndBtn.style.display = 'block';
    } else {
        tourNextBtn.style.display = 'block';
        tourEndBtn.style.display = 'none';
    }

    // 2. Scroll to the element and prepare the highlight
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Use a short delay to allow scrolling/transition to finish before measuring
    setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        let highlight = document.querySelector('.tour-highlight');
        if (!highlight) {
            highlight = document.createElement('div');
            highlight.className = 'tour-highlight';
            tourOverlay.appendChild(highlight);
        }

        // Adjust highlight size/position (fixed to current scroll position)
        highlight.style.width = `${rect.width + 10}px`;
        highlight.style.height = `${rect.height + 10}px`;
        highlight.style.top = `${rect.top + window.scrollY - 5}px`;
        highlight.style.left = `${rect.left + window.scrollX - 5}px`;
        
        // 3. Position Tooltip
        let tooltipX, tooltipY;

        // Calculate default position relative to the center of the highlight
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        switch (step.position) {
            case 'top':
                tooltipX = centerX - tourTooltip.offsetWidth / 2;
                tooltipY = rect.top - tourTooltip.offsetHeight - 15 + (step.adjust.y || 0); 
                break;
            case 'bottom':
                tooltipX = centerX - tourTooltip.offsetWidth / 2;
                tooltipY = rect.bottom + 15 + (step.adjust.y || 0); 
                break;
            case 'left':
                tooltipX = rect.left - tourTooltip.offsetWidth - 15 + (step.adjust.x || 0);
                tooltipY = centerY - tourTooltip.offsetHeight / 2;
                break;
            case 'right':
                tooltipX = rect.right + 15 + (step.adjust.x || 0);
                tooltipY = centerY - tourTooltip.offsetHeight / 2;
                break;
            default: 
                tooltipX = centerX - tourTooltip.offsetWidth / 2;
                tooltipY = rect.bottom + 15;
        }
        
        // Simple screen boundary check (left/right)
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + tourTooltip.offsetWidth > window.innerWidth - 10) {
            tooltipX = window.innerWidth - tourTooltip.offsetWidth - 10;
        }
        
        // Set final, visible position (relative to document/scroll)
        tourTooltip.style.left = `${tooltipX + window.scrollX}px`;
        tourTooltip.style.top = `${tooltipY + window.scrollY}px`;
        tourTooltip.style.opacity = '1';
        
    }, 400); 
}
// === END NEW TOUR LOGIC ===
// === Game Loading ===
const frame = document.getElementById("gameFrame");
const viewer = document.getElementById("viewer");
const grid = document.getElementById("gameGrid");
let currentSrc = "";

function loadGame(p) {
    currentSrc = p; frame.src = p;
    grid.style.display = "none"; viewer.style.display = "flex";
    document.querySelector('.dock-container').style.transform = "translate(-50%, 200%)"; 
    window.scrollTo({ top: viewer.offsetTop - 20, behavior: "smooth" });
}

function goHome() {
    if (document.fullscreenElement) document.exitFullscreen();
    viewer.style.display = "none";
    grid.style.display = "grid";
    frame.src = "";
    document.querySelector('.dock-container').style.transform = "translateX(-50%)"; 
}

// === Secret Games Logic & Rendering ===
function isSecretUnlocked() {
    const deviceId = localStorage.getItem(DEVICE_KEY);
    const list = JSON.parse(localStorage.getItem(MASTER_LIST_KEY) || "[]");
    // Also check if they just logged in for this session
    const sessionUnlocked = sessionStorage.getItem("mathmaster_session_unlocked") === "true";
    return (deviceId && list.includes(deviceId)) || sessionUnlocked;
}

function renderGamesGrid() {
    const gridEl = document.getElementById("gameGrid");
    if (!gridEl) return;
    gridEl.innerHTML = "";
    
    const unlocked = isSecretUnlocked();

    for (const g of games) {
        // HIDE games marked as secret if the user hasn't unlocked them
        if (g.secret && !unlocked) continue;

        const c = document.createElement("div");
        c.className = "card";
        if (g.secret) c.style.border = "1px solid var(--accent-color)"; 

        c.innerHTML = `<img src="${g.logo}"><h3>${g.name}</h3>`;
        c.innerHTML += g.external 
            ? `<button class="btn" onclick="window.open('${g.path}','_blank')">Open</button>`
            : `<button class="btn" onclick="loadGame('${g.path}')">Play</button>`;
        gridEl.appendChild(c);
    }
}

// === Login System Constants ===
const PASSWORD = "CabinTime2026!";
const MAX_DEVICES = 10;
const DEVICE_KEY = "mathmaster_device_id";
const MASTER_LIST_KEY = "mathmaster_registered_devices";

function checkPassword() {
    const input = document.getElementById("passwordInput").value;
    const remember = document.getElementById("rememberToggle").checked;
    const error = document.getElementById("loginError");
    const limit = document.getElementById("loginLimit");
    error.style.display = "none"; limit.style.display = "none";

    if (input !== PASSWORD) { error.style.display = "block"; return; }

    let deviceId = localStorage.getItem(DEVICE_KEY);
    let list = JSON.parse(localStorage.getItem(MASTER_LIST_KEY) || "[]");

    if (remember) {
        // Only add a new ID if this device doesn't have one already
        if (!deviceId || !list.includes(deviceId)) {
            if (list.length >= MAX_DEVICES) { limit.style.display = "block"; return; }
            deviceId = crypto.randomUUID();
            list.push(deviceId);
            localStorage.setItem(DEVICE_KEY, deviceId);
            localStorage.setItem(MASTER_LIST_KEY, JSON.stringify(list));
        }
    } else {
        // Unlock for this session only if they don't want to be remembered
        sessionStorage.setItem("mathmaster_session_unlocked", "true");
    }

    document.getElementById("loginGate").style.display = "none";
    renderGamesGrid(); // REFRESH THE GRID TO SHOW SECRET GAMES
}
// === Missing Utility Functions ===

/**
 * Toggles the visibility of the Credits panel
 */
function toggleCredits() {
    const panel = document.getElementById("creditsPanel");
    if (panel) {
        // Toggle between block and none
        panel.style.display = (panel.style.display === "block") ? "none" : "block";
    }
}

/**
 * Reloads the current game iframe
 */
function reloadGame() {
    const frame = document.getElementById("gameFrame");
    if (frame && frame.src) {
        frame.src = frame.src; // Simple way to trigger an iframe reload
    }
}

/**
 * Toggles fullscreen mode for the game viewer
 */
function toggleFullscreen() {
    const viewer = document.getElementById("viewer");
    if (!document.fullscreenElement) {
        viewer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Opens the current game URL in a new browser tab
 */
function openInNewTab() {
    const frame = document.getElementById("gameFrame");
    if (frame && frame.src) {
        window.open(frame.src, '_blank');
    }
}

// === Games List (Omitted for brevity, assumed unchanged) ===

const games = [
    // ... (Your game list here) ... 
  {name:"Chatbot", path:"https://personalfriend.zapier.app/", logo:"Assets/Pictures/Non-edited/Chatbot-n.png", external:true, secret: true},
  {name:"Secret Monkey Mart", path: "Assets/Game Data/MonkeyMart-S.html", logo:"Assets/Pictures/Non-edited/SecretMonkeyMart-n.webp", secret: true},
  {name:"Your Mom's House", path:"Assets/Game Data/Five Nights at Epsteins.html", logo:"Assets/Pictures/Non-edited/FNAE.jpg", secret: true},
  {name:"Your Mom's House 2", path:"Assets/Game Data/Five Nights at Last Breath.html", logo:"Assets/Pictures/Non-edited/Mom21-n.jpg", secret: true},
  {name:"Love Meter", path:"Assets/Game Data/love_meter.html", logo:"Assets/Pictures/Edited/LoveMeter-ed.png"},
  {name:"12 Mini Battles", path:"Assets/Game Data/12 Mini Battles.html", logo:"Assets/Pictures/Non-edited/12MiniBattles-n.png"},
  {name:"1v1.lol", path:"Assets/Game Data/1v1lol/index.html", logo:"Assets/Pictures/Non-edited/1v1.lol-n.png"},
  {name:"2048", path:"Assets/Game Data/2048/index.html", logo:"Assets/Pictures/Non-edited/2048-n.png"},
  {name:"Among Us", path:"Assets/Game Data/among-us/index.html", logo:"Assets/Pictures/Non-edited/AmongUs-n.png"},
  {name:"Arthur's Nightmare", path:"Assets/Game Data/Arthur Nightmare.html", logo:"Assets/Pictures/Non-edited/Arthur-Nightmare-n.webp"},
  {name:"Backrooms", path:"Assets/Game Data/backrooms/index.html", logo:"Assets/Pictures/Non-edited/Backrooms-n.png"},
  {name:"Bad Ice Cream", path:"Assets/Game Data/bad-ice-cream/index.html", logo:"Assets/Pictures/Non-edited/BadIceCream-n.png"},
  {name:"Baldis Basics", path:"Assets/Game Data/baldis-basics/index.html", logo:"Assets/Pictures/Non-edited/BaldiBasics-n.png"},
  {name: "Basket Bros", path: "Assets/Game Data/Basket Bros.html", logo: "Assets/Pictures/Non-edited/Basket-n.png"},
  {name:"Basketball Stars", path:"Assets/Game Data/basketball-stars/index.html", logo:"Assets/Pictures/Non-edited/BasketballStars-n.png"},
  {name:'Basket Random', path:'Assets/Game Data/basketrandom/index.html', logo:'Assets/Pictures/Non-edited/BasketRandom-n.jpg'},
  {name:'Bitlife', path:'Assets/Game Data/bitlife-main/bitlife-main/index.html', logo:'Assets/Pictures/Non-edited/Bitlife-n.jpg'},
  {name:"Block Blast", path:"Assets/Game Data/Block Blast.html", logo:"Assets/Pictures/Non-edited/BlockBlast-n.png"},
  {name:"Bridge Race", path:"Assets/Game Data/Bridge Race.html", logo:"Assets/Pictures/Non-edited/BridgeRace-n.png"},
  {name:'Boxing Random', path:'Assets/Game Data/boxingrandom/index.html', logo:'Assets/Pictures/Non-edited/BoxingRandom-n.jpg'},
  {name:'Breakout', path:'Assets/Game Data/breakout/index.html', logo:'Assets/Pictures/Non-edited/Breakout-n.png'},
  {name:"Candy Crush", path: "Assets/Game Data/Candy Crush.html", logo: "Assets/Pictures/Non-edited/CandyCrush-n.png"}, 
  {name:"Cluster Rush", path:"Assets/Game Data/cluster-rush/index.html", logo:"Assets/Pictures/Non-edited/ClusterTruck-n.png"},
  {name:"Cookie Clicker", path:"Assets/Game Data/cookieclicker/index.html", logo:"Assets/Pictures/Non-edited/CookieClicker-n.ico", external:true}, 
  {name:"Crossyroad", path:"Assets/Game Data/crossyroad/index.html", logo:"Assets/Pictures/Non-edited/CrossyRoad-n.png"},
   {name:'Chess', path:'Assets/Game Data/chess/index.html', logo:'Assets/Pictures/Non-edited/Chess-n.png'},
  {name:'Chrome Dino', path:'Assets/Game Data/chromedino/index.html', logo:'Assets/Pictures/Non-edited/DinosaurGame-n.png'},
  {name:"Drift Hunters",path:"Assets/Game Data/Drift Hunters.html", logo:"Assets/Pictures/Non-edited/Drift-Hunters-n.png"},
  {name:"Drive Mad", path:"Assets/Game Data/drive-mad/index.html", logo:"Assets/Pictures/Non-edited/DriveMad-n.jpg"},
  {name:"Duck Life 4", path:"Assets/Game Data/ducklife4/index.html", logo:"Assets/Pictures/Non-edited/DuckLife4-n.jpg"},
   {name:'Doodle Jump', path:'Assets/Game Data/doodlejump/index.html', logo:'Assets/Pictures/Non-edited/DoodleJump-n.png'},
  {name:"Five Nights at Freddy's", path:"Assets/Game Data/Five Nights at Freddys.html", logo:"Assets/Pictures/Non-edited/FNAF-n.png"},
  {name:"Five Nights at Freddy's 2", path:"Assets/Game Data/Five Nights at Freddys 2.html", logo:"Assets/Pictures/Non-edited/FNAF2-n.png"},
  {name:"Five Nights at Freddy's 3", path:"Assets/Game Data/Five Nights at Freddys 3.html", logo:"Assets/Pictures/Non-edited/FNAF3-n.png"},
  {name:"Five Nights at Freddy's 4", path:"Assets/Game Data/Five Nights at Freddys 4.html", logo:"Assets/Pictures/Non-edited/FNAF4-n.png"},
  {name:"Five Nights at Freddy's Sister Location", path:"Assets/Game Data/Five Nights at Freddys Sister Location.html", logo: "Assets/Pictures/Non-edited/Sister-Location-n.png"},
  {name:"Five Nights at Freddy's Ultimate Customs Night", path:"Assets/Game Data/Five Nights at Freddys Ultimate Custom Night.html", logo: "Assets/Pictures/Non-edited/Customs-Night-n.png"},
  {name: "Five Nights at Winston's", path: "Assets/Game Data/Five Nights at Winstons.html", logo: "Assets/Pictures/Non-edited/Winston-n.png"},
  {name:"FNAF World", path:"Assets/Game Data/FNAF World.html", logo:"Assets/Pictures/Non-edited/FNAF-World.png"},
  {name: "Free Rider Jumps", path: "Assets/Game Data/free_rider_jumps/index.html", logo: "Assets/Pictures/Non-edited/Free-n.webp"},
  {name:"Fruit Ninja", path:"Assets/Game Data/fruitninja/index.html", logo:"Assets/Pictures/Non-edited/FruitNinja-n.jpg"},
   {name:'Flappy Bird', path:'Assets/Game Data/flappybird/index.html', logo:'Assets/Pictures/Non-edited/FlappyBird-n.webp'},
  {name: 'Friday Night Funkin (For Jacob)', path: 'Assets/Game Data/Friday Night Funkin.html', logo: 'Assets/Pictures/Non-edited/Friday-n.png'},
   {name:'Geometry Dash', path:'Assets/Game Data/geometrydash/index.html', logo:'Assets/Pictures/Non-edited/GeometryDash-n.jpg'}, 
   {name:"Gobble", path:'Assets/Game Data/Gobble.html', logo:"Assets/Pictures/Non-edited/Gobble-n.png"},
  {name:"Granny", path:"Assets/Game Data/Granny.html", logo:"Assets/Pictures/Non-edited/Granny-n.png"},
  {name:"Hill Climb Racing Lite", path:"Assets/Game Data/Hill Climb Racing Lite.html", logo:"Assets/Pictures/Non-edited/Hill-n.png"},
   {name:'Idle Breakout', path:'Assets/Game Data/idle-breakout-main/idle-breakout-main/game.html', logo:'Assets/Pictures/Non-edited/IdleBreakout-n.png'},
   {name:"Idle Lumber Inc.", path:"Assets/Game Data/Idle Lumber Inc.html", logo:"Assets/Pictures/Non-edited/Lumber-n.png"},
   {name:"Line Rider", path:"Assets/Game Data/Line Rider.html", logo: "Assets/Pictures/Non-edited/Line-Rider-n.jpg"},
   {name:'Super Mario Bros', path:'Assets/Game Data/mario/index.html', logo:"Assets/Pictures/Non-edited/Mario-n.png"},
   {name:'Monkey Mart', path: 'Assets/Game Data/monkeymart/index.html', logo:'Assets/Pictures/Non-edited/monkeymart-n.avif'},
  {name:"Minecraft", path:"Assets/Game Data/Minecraft 1.8.8.html", logo:"Assets/Pictures/Non-edited/Minecraft-n.png",external:true},
  {name:"Moto X3M 2", path:"Assets/Game Data/motox3m2/index.html", logo:"Assets/Pictures/Non-edited/Motox3m2-n.png"},
  {name:"Moto X3M 3", path:"Assets/Game Data/Moto X3M 3.html", logo:"Assets/Pictures/Non-edited/Motox3m3-n.png"},
  {name:"Moto X3M Pool Party", path:"Assets/Game Data/motox3m-pool/index.html", logo:"Assets/Pictures/Non-edited/Motox3mPool-n.jpg"},
  {name:"Moto X3M Spooky", path:"Assets/Game Data/motox3m-spooky/index.html", logo:"Assets/Pictures/Non-edited/Motox3mSpooky-n.jpeg"},
  {name:"Moto X3M Winter", path:"Assets/Game Data/motox3mwinter/index.html", logo:"Assets/Pictures/Non-edited/Motox3mWinter-n.webp"},
   {name:'Ovo', path:'Assets/Game Data/ovo/index.html', logo:'Assets/Pictures/Non-edited/ovo-n.png'},
   {name:"Ovo 2", path:"Assets/Game Data/OvO 2.html", logo:"Assets/Pictures/Non-edited/OvO-2-n.webp"},
   {name:'Pac-Man', path:'Assets/Game Data/pacman/index.html', logo:'Assets/Pictures/Non-edited/Pacman-n.png'},
  {name:"Paper io 2", path:"Assets/Game Data/paperio2/index.html", logo:"Assets/Pictures/Non-edited/Paperio2-n.png"},
  {name:"Plants Vs Zombies", path:"Assets/Game Data/Plants vs Zombies.html", logo:"Assets/Pictures/Non-edited/PlantsVsZombies-n.png"},
  {name: "Poly Track", path: "Assets/Game Data/poly-track/index.html", logo: "Assets/Pictures/Non-edited/Poly-n.png"},
  {name:"Red Ball 4", path:"Assets/Game Data/Red Ball 4.html", logo:"Assets/Pictures/Non-edited/RedBall4-n.png"},
  {name:"Red Ball 4 Vol. 2", path:"Assets/Game Data/Red Ball 4 Vol. 2.html", logo:"Assets/Pictures/Non-edited/RedBall4-2-n.png"},
  {name:"Red Ball 4 Vol. 3", path:"Assets/Game Data/Red Ball 4 Vol. 3.html", logo:"Assets/Pictures/Non-edited/RedBall4-3-n.png"},
  {name:"Retro Bowl", path:"Assets/Game Data/bowl/index.html", logo:"Assets/Pictures/Non-edited/Retrobowl-n.png"},
  {name:"Rolly Vortex", path:"Assets/Game Data/Rolly Vortex.html", logo:"Assets/Pictures/Non-edited/RollyVortex-n.png"},
  {name:"Rooftop Snipers", path:"Assets/Game Data/rooftop-snipers/index.html", logo:"Assets/Pictures/Non-edited/RooftopSnipers-n.png"},
  {name:"Run", path:"Assets/Game Data/Run 1.html", logo:" Assets/Pictures/Non-edited/Run1-n.png"},
  {name: "Run 2", path: "Assets/Game Data/Run 2.html", logo: "Assets/Pictures/Non-edited/Run-2-n.png"},
  {name:"Run 3", path:"Assets/Game Data/Run 3.html", logo:"Assets/Pictures/Non-edited/Run3-n.png"},
  {name: "Schoolboy Runaway", path: "Assets/Game Data/Schoolboy Runaway.html", logo: "Assets/Pictures/Non-edited/Runaway-n.png"},
 {name: "Soccer Random", path: "Assets/Game Data/Soccer-Random/index.html", logo: "Assets/Pictures/Non-edited/SoccerRandom-n.jpg"},
 {name: "Soundboard", path: "Assets/Game Data/soundboard/index.html", logo: "Assets/Pictures/Non-edited/Soundboard-n.jpg"},
 {name:"Slither.io", path:"Assets/Game Data/sfge.html",logo:"Assets/Pictures/Non-edited/Slither-n.png"},
 {name:"Slender", path:"Assets/Game Data/Slender 8 Pages.html", logo: "Assets/Pictures/Non-edited/Slender-n.png"},
  {name:'Slope', path:'Assets/Game Data/Slope-Game-main/Slope-Game-main/index.html', logo:'Assets/Pictures/Non-edited/Slope-n.png'},
  {name:"Slope 2", path:"Assets/Game Data/Slope 2.html", logo:"Assets/Pictures/Non-edited/Slope2-n.png"},
  {name:"Solar Smash", path:"Assets/Game Data/Solar Smash.html", logo:"Assets/Pictures/Non-edited/SolarSmash-n.png"},
  {name:"Station Saturn", path:"Assets/Game Data/Station Saturn.html", logo:"Assets/Pictures/Non-edited/StationSaturn-n.png"},
  {name:"Steal A Brainrot", path:"Assets/Game Data/Steal A Brainrot.html", logo:"Assets/Pictures/Non-edited/StealABrainrot-n.png"},
  {name:"Stickman Hook", path:"Assets/Game Data/stickman-hook/index.html", logo:"Assets/Pictures/Non-edited/Stickman-n.png"},
  {name:"Slow Roads", path:"Assets/Game Data/Slowroads.html", logo:"Assets/Pictures/Non-edited/Slow-Roads-n.png"},
  {name:"Space Waves", path:"Assets/Game Data/Space Waves.html", logo:"Assets/Pictures/Non-edited/Space-Waves-n.png"},
  {name:"Temple Run 2", path:"Assets/Game Data/Temple Run 2.html", logo:"Assets/Pictures/Non-edited/TempleRun2-n.png"},
 {name:"Space Invaders", path:'Assets/Game Data/spaceinvaders/index.html', logo:'Assets/Pictures/Non-edited/SpaceInvaders-n.png'},
 {name:"Thats Not My Neighbor", path: 'Assets/Game Data/Thats Not My Neighbor.html', logo:"Assets/Pictures/Non-edited/ThatsNotMyNeighbor-n.png",external:true},
 {name:"Tunnel Rush", path: "Assets/Game Data/tunnelrush/index.html", logo: "Assets/Pictures/Non-edited/TunnelRush-n.jpg"},
 {name:"The Impossible Quiz", path:"Assets/Game Data/the-impossible-quiz/index.html", logo:"Assets/Pictures/Non-edited/ImpossibleQuiz-n.webp"},
  {name:"The Man In The Window", path:"Assets/Game Data/The Man In The Window.html", logo:"Assets/Pictures/Non-edited/ManFromWindow-n.png"},
  {name:"Tomb of the Mask", path:"Assets/Game Data/Tomb Of The Mask.html", logo:"Assets/Pictures/Non-edited/TombOfMask-n.png"},
  {name:"Volleyball Random", path:"Assets/Game Data/Volley-Random/index.html", logo:"Assets/Pictures/Non-edited/VolleyRandom-n.webp"},
  {name:"Wordle", path:"Assets/Game Data/wordle/index.html", logo:"Assets/Pictures/Non-edited/Wordle-n.webp"},
  {name:"Worlds Hardest Game", path:"Assets/Game Data/worlds-hardest-game/index.html", logo:"Assets/Pictures/Non-edited/WorldHardestGame-n.jpeg"},
  {name:"Yohoho.io", path:"Assets/Game Data/YoHoHo.io-main/index.html", logo: "Assets/Pictures/Non-edited/yohoho-n.jpg"},

];


function toggleVersionInput(event) {
  event.stopPropagation(); 
  const bubble = document.getElementById("versionInputBubble");
  if (bubble.style.display === "none" || bubble.style.display === "") {
    bubble.style.display = "block";
  } else {
    bubble.style.display = "none";
  }
}
// === 1. Disguise & Security Logic ===

// Initialize all settings from LocalStorage or Defaults
let isCanvasMode = localStorage.getItem("mathmaster_canvas_mode") === "true";
let panicKey = localStorage.getItem("mathmaster_panic_key") || "`";
let inGamePanicKey = localStorage.getItem("mathmaster_ingame_panic_key") || "]"; // Added missing variable
let panicURL = localStorage.getItem("mathmaster_panic_url") || "https://www.google.com";
let customTitle = localStorage.getItem("mathmaster_title") || "Math Master";
let customFavicon = localStorage.getItem("mathmaster_favicon") || "Assets/Pictures/Non-edited/Math-n.png";

// Core function to change the icon
function changeFavicon(src) {
    const oldLink = document.getElementById("favicon");
    if (oldLink) oldLink.remove();
    const newLink = document.createElement("link");
    newLink.id = "favicon";
    newLink.rel = "icon";
    newLink.href = src;
    document.head.appendChild(newLink);
}

// Core function to apply the correct identity (Disguise vs Custom)
function applyTabIdentity() {
    if (isCanvasMode) {
        document.title = "Quizzes 2";
        changeFavicon("Assets/Pictures/Non-edited/canvas-n.png");
    } else {
        document.title = customTitle;
        changeFavicon(customFavicon);
    }
}

// Apply immediately on load
applyTabIdentity();

// Wire up Canvas Mode Toggle
const settingsCanvasToggle = document.getElementById("settingsCanvasToggle");
if (settingsCanvasToggle) {
    settingsCanvasToggle.checked = isCanvasMode;
    settingsCanvasToggle.addEventListener('change', (e) => {
        isCanvasMode = e.target.checked;
        localStorage.setItem("mathmaster_canvas_mode", isCanvasMode);
        applyTabIdentity();
        if (typeof checkSecretTrigger === 'function') checkSecretTrigger();
    });
}

// Wire up Custom Title Input
const titleInput = document.getElementById("settingsTabTitle");
if (titleInput) {
    titleInput.value = (customTitle !== "Math Master") ? customTitle : "";
    titleInput.addEventListener("input", (e) => {
        customTitle = e.target.value || "Math Master";
        localStorage.setItem("mathmaster_title", customTitle);
        applyTabIdentity();
    });
}

// Wire up Favicon File Upload
const iconInput = document.getElementById("settingsTabIcon");
if (iconInput) {
    iconInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            customFavicon = event.target.result; 
            localStorage.setItem("mathmaster_favicon", customFavicon);
            applyTabIdentity();
        };
        reader.readAsDataURL(file);
    });
}

// Wire up Panic Key & URL Inputs
const panicInput = document.getElementById("settingsPanicKey");
const panicURLInput = document.getElementById("settingsPanicURL");

if (panicInput) {
    panicInput.value = panicKey;
    panicInput.addEventListener("input", (e) => {
        panicKey = e.target.value || "`";
        localStorage.setItem("mathmaster_panic_key", panicKey);
    });
}

if (panicURLInput) {
    panicURLInput.value = panicURL;
    panicURLInput.addEventListener("input", (e) => {
        panicURL = e.target.value || "https://www.google.com";
        localStorage.setItem("mathmaster_panic_url", panicURL);
    });
}

// Wire up In-Game Swap Key
const inGamePanicInput = document.getElementById("settingsInGamePanicKey");
if (inGamePanicInput) {
    inGamePanicInput.value = inGamePanicKey;
    inGamePanicInput.addEventListener("input", (e) => {
        inGamePanicKey = e.target.value || "]";
        localStorage.setItem("mathmaster_ingame_panic_key", inGamePanicKey);
    });
}

// Map Saving Function
function savePanicMapping() {
    const select = document.getElementById("panicGameSelect");
    const altFile = document.getElementById("panicAltFile");
    if (!select || !select.value) return alert("Select a game first!");
    
    const mappings = JSON.parse(localStorage.getItem("mathmaster_game_panic_maps") || "{}");
    
    if (altFile.value.trim() === "") {
        delete mappings[select.value];
        alert("Alternative file cleared for this game.");
    } else {
        mappings[select.value] = altFile.value.trim();
        alert("Alt file saved! Press your In-Game Swap Key while playing this game to switch.");
    }
    localStorage.setItem("mathmaster_game_panic_maps", JSON.stringify(mappings));
}

// Populate the Dropdown
function populatePanicGames() {
    const select = document.getElementById("panicGameSelect");
    if (!select || typeof games === "undefined") return;
    
    games.filter(g => !g.external).forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.path;
        opt.textContent = g.name;
        select.appendChild(opt);
    });

    select.addEventListener("change", (e) => {
        const mappings = JSON.parse(localStorage.getItem("mathmaster_game_panic_maps") || "{}");
        const altInput = document.getElementById("panicAltFile");
        if (altInput) altInput.value = mappings[e.target.value] || "";
    });
}

// === Unified Key Listener (Main Page) ===
// === Unified Key Listener (Main Page) ===
document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    
    // 1. Global Panic
    if (e.key === panicKey) {
        // Force exit fullscreen if active
        if (document.fullscreenElement) document.exitFullscreen();
        window.location.href = panicURL;
        return;
    }

    // 2. In-Game File Swap
    if (e.key === inGamePanicKey) {
        const viewer = document.getElementById("viewer");
        const frame = document.getElementById("gameFrame");
        if (viewer && viewer.style.display === "flex" && typeof currentSrc !== 'undefined') {
            const mappings = JSON.parse(localStorage.getItem("mathmaster_game_panic_maps") || "{}");
            if (mappings[currentSrc]) {
                frame.src = mappings[currentSrc];
            }
        }
    }

    // 3. Viewer Controls Shortcuts (NEW)
    const viewerElement = document.getElementById("viewer");
    if (viewerElement && viewerElement.style.display === "flex") {
        const matchedControl = viewerControlsConfig.find(c => c.key === e.key.toLowerCase());
        
        // Only trigger if the control is currently visible/enabled
        if (matchedControl && viewerControlsVisibility[matchedControl.id]) {
            e.preventDefault(); 
            new Function(matchedControl.action)(); // Executes "goHome()", "reloadGame()", etc.
        }
    }
});
// About:Blank Cloaker (Now retains Disguise/Title/Favicon)
function openAboutBlank() {
    let win = window.open('about:blank', '_blank');
    if (!win) return alert("Please allow pop-ups for this site!");

    // Grab the CURRENT title and favicon (whether it's custom or Canvas Mode)
    let currentTitle = document.title;
    let iconElement = document.getElementById("favicon");
    let currentIcon = iconElement ? iconElement.href : "";

    // Write a brand new document into the about:blank tab with the cloned identity
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${currentTitle}</title>
            <link rel="icon" type="image/png" href="${currentIcon}">
            <style>
                body { margin: 0; overflow: hidden; background: #000; }
                iframe { width: 100vw; height: 100vh; border: none; margin: 0; display: block; }
            </style>
        </head>
        <body>
            <iframe src="${window.location.href}"></iframe>
        </body>
        </html>
    `);
    
    // Close the document stream so it renders properly
    win.document.close();

    // Redirect the original (now exposed) tab to a safe space
    window.location.replace('https://classroom.google.com'); 
}
// === Inject Keystroke Listener into the Iframe ===
const gameIframe = document.getElementById("gameFrame");
if (gameIframe) {
    gameIframe.addEventListener("load", () => {
        try {
            gameIframe.contentWindow.document.addEventListener("keydown", (e) => {
                if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
                
                // 1. Global Panic (From inside the game)
                if (e.key === panicKey) {
                    // Force exit fullscreen from both the iframe and the main document
                    if (document.fullscreenElement) document.exitFullscreen();
                    if (gameIframe.contentWindow.document.fullscreenElement) {
                        gameIframe.contentWindow.document.exitFullscreen();
                    }
                    window.top.location.href = panicURL;
                    return;
                }
 // 3. Viewer Controls Shortcuts (NEW)
    const viewerElement = document.getElementById("viewer");
    if (viewerElement && viewerElement.style.display === "flex") {
        const matchedControl = viewerControlsConfig.find(c => c.key === e.key.toLowerCase());
        
        // Only trigger if the control is currently visible/enabled
        if (matchedControl && viewerControlsVisibility[matchedControl.id]) {
            e.preventDefault(); 
            new Function(matchedControl.action)(); // Executes "goHome()", "reloadGame()", etc.
        }
    }
                // 2. In-Game File Swap
                if (e.key === inGamePanicKey) {
                    const mappings = JSON.parse(localStorage.getItem("mathmaster_game_panic_maps") || "{}");
                    if (typeof currentSrc !== 'undefined' && mappings[currentSrc]) {
                        gameIframe.src = mappings[currentSrc]; 
                    }
                }
            });
        } catch (err) {
            console.log("Cross-origin security prevented panic key injection.", err);
        }
    });
}
// === v3.0 Countdown Logic ===
function initCountdown() {
    const timerDisplay = document.getElementById("countdownTimer");
    if (!timerDisplay) return;

    // Target Date: April 1, 2026 00:00:00 (Midnight)
    const targetDate = new Date("April 1, 2026 00:00:00").getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        // If the countdown finishes, update the text and stop the timer
        if (distance <= 0) {
            clearInterval(interval);
            timerDisplay.innerHTML = "✨ IT IS LIVE! ✨";
            return;
        }

        // Calculate time units
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Format to always show double digits for hours, minutes, and seconds
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');

        timerDisplay.innerHTML = `${days}d ${h}h ${m}m ${s}s`;
    }, 1000); // Updates every 1 second
}
// Initialization
window.onload = function() {
    renderGamesGrid();
    populatePanicGames();
    initCountdown();
    
    if (localStorage.getItem("mathmaster_tour_completed") !== "true") {
        setTimeout(() => {
            const modal = document.getElementById("tourWelcomeModal");
            if (modal) modal.style.display = "flex";
        }, 500); 
    }

};
let mediaStates = {
    music: { active: false, title: '', artist: '', playing: false, volume: 0.8 },
    movie: { active: false, title: '', playing: false, volume: 1.0 },
    unknown: { active: false, playing: false, volume: 1.0 }
};

// Sense incoming audio streams from iframes
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.target === 'music') {
        mediaStates.music = { active: true, title: data.title || 'Unknown', artist: data.artist || '', playing: data.playing, volume: data.volume };
        updateMixerUI();
    } else if (data.target === 'movie') {
        mediaStates.movie = { active: true, title: data.title || 'Unknown', playing: data.playing, volume: data.volume };
        updateMixerUI();
    } else if (data.isPlaying !== undefined && !data.target) {
        // Fallback for unknown audio streams
        mediaStates.unknown.active = true;
        mediaStates.unknown.playing = data.isPlaying;
        updateMixerUI();
    }
});

// Sends volume updates directly to the specific stream
window.changeVolume = function(target, value) {
    const newVol = parseFloat(value);
    if(mediaStates[target]) {
        mediaStates[target].volume = newVol;
    }
    sendMediaCommand(target, 'setVolume', { volume: newVol });
};

// Sends play, pause, seek, and skip commands
window.mediaAction = function(target, action) {
    sendMediaCommand(target, action);
};

// The communication pipeline to your iframes
function sendMediaCommand(target, action, extra = {}) {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ target, action, ...extra }, '*');
        }
    });
}

function updateMixerUI() {
    const svgPlay = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    const svgPause = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    // Toggle Music Card
    const musicCard = document.getElementById('mixer-card-music');
    if (musicCard) {
        musicCard.style.display = mediaStates.music.active ? 'flex' : 'none';
        document.getElementById('mix-music-title').textContent = mediaStates.music.title;
        document.getElementById('mix-music-artist').textContent = mediaStates.music.artist;
        document.getElementById('mix-music-vol').value = mediaStates.music.volume;
        
        const playBtn = document.getElementById('mix-music-play');
        if (playBtn) playBtn.innerHTML = mediaStates.music.playing ? svgPause : svgPlay;
    }

    // Toggle Movie Card
    const movieCard = document.getElementById('mixer-card-movie');
    if (movieCard) {
        movieCard.style.display = mediaStates.movie.active ? 'flex' : 'none';
        document.getElementById('mix-movie-title').textContent = mediaStates.movie.title;
        document.getElementById('mix-movie-vol').value = mediaStates.movie.volume;
        
        const playBtnMovie = document.getElementById('mix-movie-play');
        if (playBtnMovie) playBtnMovie.innerHTML = mediaStates.movie.playing ? svgPause : svgPlay;
    }
    
    // Toggle Unknown Card
    const unknownCard = document.getElementById('mixer-card-unknown');
    if (unknownCard) {
        unknownCard.style.display = mediaStates.unknown.active ? 'flex' : 'none';
        const playBtnUnknown = document.getElementById('mix-unknown-play');
        if (playBtnUnknown) playBtnUnknown.innerHTML = mediaStates.unknown.playing ? svgPause : svgPlay;
    }
}
// --- New Go to Movie Button Logic ---
document.getElementById('mp-go-to-movie').addEventListener('click', () => {
    // Find the movies dock button
    const movieBtn = document.querySelector('.dock-btn[data-app="app-movies"]');
    // Switch to the movie section just like the dock does
    switchSection('app-movies', movieBtn);
});
// === GLOBAL FLOATING DRAGGABLE CONSOLE ===
const globalConsole = document.createElement('div');
globalConsole.id = 'global-dev-console';
globalConsole.style.cssText = `
    position: fixed; bottom: 100px; left: 20px; width: 450px; height: 300px;
    background: rgba(5, 5, 5, 0.98); border: 1px solid var(--accent-color, #00C9FF);
    border-radius: 12px; color: #0f0; font-family: monospace; font-size: 12px;
    overflow: hidden; z-index: 1000000; display: none;
    box-shadow: 0 20px 50px rgba(0,0,0,0.9); backdrop-filter: blur(15px);
    display: flex; flex-direction: column; cursor: grab;
`;

// Header for dragging
const consoleHeader = document.createElement('div');
consoleHeader.style.cssText = `padding: 8px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold; font-size: 10px; color: #888; display: flex; justify-content: space-between;`;
consoleHeader.innerHTML = `<span>GLOBAL SITE CONSOLE</span><span id="close-console" style="cursor:pointer">✕</span>`;
globalConsole.appendChild(consoleHeader);

// Log Container
const logContainer = document.createElement('div');
logContainer.id = 'log-container';
logContainer.style.cssText = `flex: 1; overflow-y: auto; padding: 10px;`;
globalConsole.appendChild(logContainer);

document.body.appendChild(globalConsole);

// Dragging Logic
let isDragging = false, offset = [0,0];
consoleHeader.onmousedown = (e) => {
    isDragging = true;
    offset = [globalConsole.offsetLeft - e.clientX, globalConsole.offsetTop - e.clientY];
    globalConsole.style.cursor = 'grabbing';
};
document.onmousemove = (e) => {
    if (!isDragging) return;
    globalConsole.style.left = (e.clientX + offset[0]) + 'px';
    globalConsole.style.top = (e.clientY + offset[1]) + 'px';
    globalConsole.style.bottom = 'auto'; // Break the bottom anchor
};
document.onmouseup = () => { isDragging = false; globalConsole.style.cursor = 'grab'; };

document.getElementById('close-console').onclick = () => globalConsole.style.display = 'none';

function renderGlobalLog(msg, type='log', source='MAIN') {
    const div = document.createElement('div');
    div.style.cssText = `margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px;`;
    if (type === 'error') div.style.color = '#ff4a4a';
    if (type === 'warn') div.style.color = '#ffcc00';
    div.textContent = `[${source}] ${msg}`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Global Message Listener (Catch logs from any iframe)
window.addEventListener('message', (e) => {
    if (e.data.type === 'CONSOLE_CMD') {
        if (e.data.action === 'SHOW') globalConsole.style.display = 'flex';
        if (e.data.action === 'DOCK') {
            globalConsole.style.left = '260px'; // Adjust for file.html sidebar
            globalConsole.style.bottom = '20px';
            globalConsole.style.top = 'auto';
            globalConsole.style.width = 'calc(100% - 280px)';
        }
    }
    if (e.data && e.data.type === 'IFRAME_LOG') {
        renderGlobalLog(e.data.message, e.data.level, e.data.source);
    }
});

// Hijack Main
const origLog = console.log;
console.log = (...args) => { origLog(...args); renderGlobalLog(args.join(' '), 'log'); };
// ===GLOBAL DEV CONSOLE & OMNISCIENT TRACKER ===
const globalConsole = document.getElementById('global-dev-console');
const consoleOutput = document.getElementById('console-output');
const consoleHandle = document.getElementById('console-drag-handle');

// 1. Master Log Renderer
function renderGlobalLog(msg, level = 'log', source = 'MAIN') {
    if (!consoleOutput) return;
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    div.style.paddingBottom = '4px';
    div.style.wordWrap = 'break-word';
    
    let color = '#0f0'; // Default
    if(level === 'warn') color = '#ffcc00';
    if(level === 'error') color = '#ff4a4a';
    if(level === 'network') color = '#ff00ff'; // Magenta for network blocks
    
    // Clean up the source name for readability
    let cleanSource = source.split('/').pop() || source;
    if(cleanSource.length > 20) cleanSource = cleanSource.substring(0, 17) + '...';

    div.style.color = color;
    div.innerHTML = `<span style="color: #666;">[${cleanSource}]</span> <span style="font-weight:bold; opacity: 0.8;">[${level.toUpperCase()}]</span> ${msg}`;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Hijack Main Window Console
const origLog = console.log, origWarn = console.warn, origError = console.error;
console.log = (...args) => { origLog(...args); renderGlobalLog(args.join(' '), 'log'); };
console.warn = (...args) => { origWarn(...args); renderGlobalLog(args.join(' '), 'warn'); };
console.error = (...args) => { origError(...args); renderGlobalLog(args.join(' '), 'error'); };

// Catch Main Window Global Errors
window.addEventListener('error', (e) => renderGlobalLog(`${e.message} at ${e.filename}:${e.lineno}`, 'error'));
window.addEventListener('unhandledrejection', (e) => renderGlobalLog(`Unhandled Promise: ${e.reason}`, 'error'));

// 2. The Iframe Payload (This gets injected into every app)
const iframePayload = function() {
    if (window.__ludusTrackerInjected) return;
    window.__ludusTrackerInjected = true;

    const sourceName = window.location.pathname.split('/').pop() || 'iframe';
    const sendLog = (level, args) => {
        const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        window.parent.postMessage({ type: 'IFRAME_LOG', level, source: sourceName, message: msg }, '*');
    };

    // Hijack Iframe Console
    const oLog = console.log, oWarn = console.warn, oErr = console.error;
    console.log = (...args) => { oLog(...args); sendLog('log', args); };
    console.warn = (...args) => { oWarn(...args); sendLog('warn', args); };
    console.error = (...args) => { oErr(...args); sendLog('error', args); };

    // Catch Iframe Global Errors
    window.addEventListener('error', (e) => sendLog('error', [`Global Error: ${e.message} at ${e.filename}:${e.lineno}`]));
    window.addEventListener('unhandledrejection', (e) => sendLog('error', [`Unhandled Promise: ${e.reason}`]));

    // Hijack Fetch (Catches modern network blocks)
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        try {
            const res = await origFetch(...args);
            if (!res.ok) sendLog('network', [`Fetch failed: ${args[0]} (Status: ${res.status})`]);
            return res;
        } catch (err) {
            sendLog('network', [`Fetch BLOCKED or FAILED: ${args[0]} - ${err.message}`]);
            throw err;
        }
    };
    
    // Hijack XHR (Catches older network blocks)
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('error', () => sendLog('network', [`XHR BLOCKED: ${url}`]));
        this.addEventListener('load', () => { if(this.status >= 400) sendLog('network', [`XHR Error: ${url} (Status: ${this.status})`]) });
        origOpen.apply(this, arguments);
    };
};

// 3. The Omniscient Injector
function attachTrackerToIframe(iframe) {
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc) return;
        
        // Inject the payload script
        const script = doc.createElement('script');
        script.textContent = `(${iframePayload.toString()})();`;
        doc.head.appendChild(script);
        
        renderGlobalLog(`Tracker attached to: ${iframe.id || 'Unnamed App'}`, 'log', 'SYSTEM');
    } catch (e) {
        // This fails silently if the iframe is cross-origin (e.g. Chatbot on Zapier). 
        // We can't legally track cross-origin frames due to browser security.
    }
}

// Listen for loads on existing frames
document.querySelectorAll('iframe, embed[type="text/html"]').forEach(frame => {
    frame.addEventListener('load', () => attachTrackerToIframe(frame));
});

// Watch for dynamically added frames (like when you open a game)
const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
        m.addedNodes.forEach(node => {
            if (node.tagName === 'IFRAME' || (node.tagName === 'EMBED' && node.type === 'text/html')) {
                node.addEventListener('load', () => attachTrackerToIframe(node));
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// 4. Message & Console UI Logic
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'IFRAME_LOG') {
        renderGlobalLog(data.message, data.level, data.source);
    }
    
    if (data.type === 'CONSOLE_CMD') {
        if (data.action === 'TOGGLE' || data.action === 'SHOW') {
            globalConsole.style.display = globalConsole.style.display === 'none' || globalConsole.style.display === '' ? 'flex' : 'none';
        }
        if (data.action === 'DOCK' && globalConsole.style.display === 'flex') {
            globalConsole.style.transition = 'all 0.3s ease';
            globalConsole.style.left = '240px';
            globalConsole.style.bottom = '0px';
            globalConsole.style.top = 'auto';
            globalConsole.style.right = '0px';
            globalConsole.style.width = 'calc(100vw - 240px)';
            globalConsole.style.height = '200px';
            globalConsole.style.borderRadius = '12px 0 0 0';
            setTimeout(() => { globalConsole.style.transition = 'none'; }, 300);
        }
    }
});

// 5. Drag Physics
let isDraggingConsole = false;
let consoleOffsetX = 0, consoleOffsetY = 0;

if (consoleHandle && globalConsole) {
    consoleHandle.addEventListener('mousedown', (e) => {
        isDraggingConsole = true;
        const rect = globalConsole.getBoundingClientRect();
        consoleOffsetX = e.clientX - rect.left;
        consoleOffsetY = e.clientY - rect.top;
        consoleHandle.style.cursor = 'grabbing';
        
        globalConsole.style.width = '450px';
        globalConsole.style.height = '300px';
        globalConsole.style.borderRadius = '12px';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingConsole) return;
        e.preventDefault();
        let newX = e.clientX - consoleOffsetX;
        let newY = e.clientY - consoleOffsetY;

        newX = Math.max(0, Math.min(window.innerWidth - globalConsole.offsetWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - globalConsole.offsetHeight, newY));

        globalConsole.style.left = newX + 'px';
        globalConsole.style.top = newY + 'px';
        globalConsole.style.right = 'auto';
        globalConsole.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDraggingConsole = false;
        if (consoleHandle) consoleHandle.style.cursor = 'grab';
    });
}
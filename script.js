// === Unified Settings & Canvas System ===

// Expand Viewer Controls to include Favorites
let viewerControlsConfig = JSON.parse(localStorage.getItem('mathmaster_controls')) || [
    { id: 'dashboard', label: '← Dashboard', action: 'goHome()', key: 'h' },
    { id: 'reload', label: 'Reload', action: 'reloadGame()', key: 'r' },
    { id: 'fullscreen', label: 'Fullscreen', action: 'toggleFullscreen()', key: 'f' },
    { id: 'newtab', label: 'Open New Tab', action: 'openInNewTab()', key: 'n' }
];

let viewerControlsVisibility = JSON.parse(localStorage.getItem('mathmaster_controls_vis')) || {
    'dashboard': true, 'reload': true, 'fullscreen': true, 'newtab': true
};

// FORCE the favorite button to exist AND be visible for returning users
let favControl = viewerControlsConfig.find(c => c.id === 'favorite');
if (!favControl) {
    viewerControlsConfig.push({ id: 'favorite', label: 'Favorite', action: 'toggleFavorite()', key: 'v' });
} else if (favControl.label === '⭐ Favorite') {
    // Strip the emoji from returning users' local storage
    favControl.label = 'Favorite';
    localStorage.setItem('mathmaster_controls', JSON.stringify(viewerControlsConfig));
}

if (viewerControlsVisibility['favorite'] === undefined) {
    viewerControlsVisibility['favorite'] = true;
    localStorage.setItem('mathmaster_controls_vis', JSON.stringify(viewerControlsVisibility));
}
function loadGame(p) {
    currentSrc = p; frame.src = p;
    grid.style.display = "none"; viewer.style.display = "flex";
    document.querySelector('.dock-container').style.transform = "translate(-50%, 200%)"; 
    window.scrollTo({ top: viewer.offsetTop - 20, behavior: "smooth" });

    // --- Traceability Logic for Recently Played ---
    let recentlyPlayed = JSON.parse(localStorage.getItem('mathmaster_recent')) || [];
    recentlyPlayed = recentlyPlayed.filter(src => src !== p); // Remove if it already exists
    recentlyPlayed.unshift(p); // Push to the absolute front
    if (recentlyPlayed.length > 50) recentlyPlayed.pop(); // Cap history memory
    localStorage.setItem('mathmaster_recent', JSON.stringify(recentlyPlayed));

    renderViewerButtons(); // Refresh buttons so the Favorite star is accurate
}

function toggleFavorite() {
    // 1. Ensure a game is actually loaded
    if (!currentSrc) return;
    
    // 2. Fetch current favorites list
    let favoriteGames = JSON.parse(localStorage.getItem('mathmaster_favs')) || [];

    // 3. Add or remove the current game
    if (favoriteGames.includes(currentSrc)) {
        favoriteGames = favoriteGames.filter(src => src !== currentSrc);
    } else {
        favoriteGames.push(currentSrc);
    }

    // 4. Save back to local storage
    localStorage.setItem('mathmaster_favs', JSON.stringify(favoriteGames));
    
    // 5. Force the viewer buttons to redraw so the star updates instantly
    renderViewerButtons(); 
    
    // 6. Refresh the home grid in the background if looking at the favorites tab
    const filterDropdown = document.getElementById('filterDropdown');
    if (filterDropdown && filterDropdown.value === 'favs') {
        if (typeof renderGamesGrid === 'function') renderGamesGrid();
    }
}

function renderViewerButtons() {
    const container = document.getElementById('viewerControlsContainer');
    if (!container) return;
    
    let favoriteGames = JSON.parse(localStorage.getItem('mathmaster_favs')) || [];
    let html = '';
    
    viewerControlsConfig.forEach((ctrl, index) => {
        if (viewerControlsVisibility[ctrl.id]) {
            let btnContent = ctrl.label;
            
            // Specific logic for the Favorite button rendering
            if (ctrl.id === 'favorite') {
                const isFav = favoriteGames.includes(currentSrc);
                
                // Filled yellow star if favorited, hollow white star if not
                const starSvg = isFav 
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                
                // Wrapping inside a flex div ensures the icon and text align perfectly
                btnContent = `<div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                ${starSvg} <span style="line-height: 1;">Favorite</span>
                              </div>`;
            }
            
            html += `<button class="viewer-btn-spot spot-${index}" onclick="${ctrl.action}">${btnContent}</button>`;
        }
    });
    container.innerHTML = html;
}
function renderViewerButtons() {
    const container = document.getElementById('viewerControlsContainer');
    if (!container) return;
    
    let html = '';
    viewerControlsConfig.forEach((ctrl, index) => {
        if (viewerControlsVisibility[ctrl.id]) {
            html += `<button class="viewer-btn-spot spot-${index}" onclick="${ctrl.action}">${ctrl.label}</button>`;
        }
    });
    container.innerHTML = html;
}

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
            <div class="settings-row">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="settings-arrows" style="display: flex; flex-direction: column; gap: 4px;">
                        <svg onclick="event.stopPropagation(); ${upDisabled ? '' : `moveControl(${index}, -1)`}" class="settings-arrow-icon ${upDisabled ? 'disabled' : ''}" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:white; stroke-width:2; fill:none; cursor:pointer; opacity:0.6;"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        <svg onclick="event.stopPropagation(); ${downDisabled ? '' : `moveControl(${index}, 1)`}" class="settings-arrow-icon ${downDisabled ? 'disabled' : ''}" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:white; stroke-width:2; fill:none; cursor:pointer; opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="settings-info">
                        <span class="settings-label">${ctrl.label}</span>
                        <span class="settings-desc" style="color: var(--accent-color); font-size: 11px; font-weight: 600; text-transform: uppercase;">${currentPosition}</span>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                    <input type="text" class="settings-input" maxlength="1" value="${ctrl.key || ''}" 
                           onchange="updateControlKey('${ctrl.id}', this.value)" 
                           placeholder="Key" 
                           style="width: 45px; text-align: center; font-weight: bold; text-transform: lowercase;">
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

function moveControl(index, direction) {
    const target = viewerControlsConfig[index];
    viewerControlsConfig.splice(index, 1); 
    viewerControlsConfig.splice(index + direction, 0, target); 
    saveAndRenderControls();
}

function toggleControlVis(id, isVisible) {
    viewerControlsVisibility[id] = isVisible;
    saveAndRenderControls();
    checkSecretTrigger(); 
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
    
    closePopups(); 
    
    if (!isActive) {
        settingsPanel.classList.add("active");
        settingsBtn.classList.add("active-mode");
        renderSettingsList(); 
    }
}

renderViewerButtons();

/* ================= LOGIC ================= */

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
        indexedDB: {} 
    };

    if (window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        saveData.meta.dbCount = dbs.length;
    }

    const blob = new Blob(
        [JSON.stringify(saveData, null, 2)], 
        { type: "application/json" }
    );

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
                localStorage.clear();
                Object.entries(data.storage.local).forEach(([k, v]) => localStorage.setItem(k, v));

                sessionStorage.clear();
                Object.entries(data.storage.session).forEach(([k, v]) => sessionStorage.setItem(k, v));

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

function closePopups() {
    if (typeof searchBar !== 'undefined' && searchBar) searchBar.classList.remove('active');
    if (typeof searchBtn !== 'undefined' && searchBtn) searchBtn.classList.remove('active-mode');
    if (settingsPanel) settingsPanel.classList.remove('active');
    if (settingsBtn) settingsBtn.classList.remove('active-mode');
}

function toggleSearch() {
    const isActive = searchBar.classList.contains("active");
    closePopups(); 
    
    if (!isActive) {
        searchBar.classList.add("active");
        searchBtn.classList.add("active-mode");
        searchInput.focus();
    } else {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event('input')); 
    }
}

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

document.addEventListener('click', (e) => {
    const isDock = e.target.closest('.dock-container');
    const isTour = e.target.closest('#tourWelcomeModal') || e.target.closest('#tourTooltip');
    const isVersion = e.target.closest('.version-container'); 

    if (!isDock && !isTour) closePopups();

    if (!isVersion) {
        const bubble = document.getElementById('versionInputBubble');
        if (bubble && bubble.style.display === 'flex') {
            bubble.style.display = 'none';
        }
    }
});
// --- NEW: Cloud Overwrite Logic ---
const cloudOverwriteToggle = document.getElementById("settingsCloudOverwriteToggle");
// Default to false (safe mode)
let allowCloudOverwrite = localStorage.getItem("mathmaster_cloud_overwrite") === "true";

if (cloudOverwriteToggle) {
    cloudOverwriteToggle.checked = allowCloudOverwrite;
    cloudOverwriteToggle.addEventListener('change', (e) => {
        allowCloudOverwrite = e.target.checked;
        localStorage.setItem("mathmaster_cloud_overwrite", allowCloudOverwrite);
    });
}
// === FIRST-TIME TOUR LOGIC ===
const tourWelcomeModal = document.getElementById('tourWelcomeModal');
const tourOverlay = document.getElementById('tourOverlay');
const tourTooltip = document.getElementById('tourTooltip');
const tourTextEl = document.getElementById('tourText');
const tourNextBtn = document.getElementById('tourNextBtn');
const tourEndBtn = document.getElementById('tourEndBtn');
if (tourNextBtn) tourNextBtn.addEventListener("click", nextTourStep);

let currentStep = 0;

const tourSteps = [
    { element: 'h1 .version', text: 'This is the **Version Number (v2.8)**, check here for update information!', position: 'bottom', adjust: {y: 10, x: 0} },
    { element: '.header p a:nth-child(1)', text: 'The **Game Request** link is where you can request new games to be added!', position: 'bottom', adjust: {y: 10, x: 0} },
    { element: '.header p a:nth-child(2)', text: 'The **Contact Us** link is where you can send a message, primarily for **Game Requests**!', position: 'bottom', adjust: {y: 10, x: 0} },
    { element: '.header p a:nth-child(3)', text: 'The **Unblock Form** is a way to request access if the site is blocked.', position: 'bottom', adjust: {y: 10, x: 0} },
    { element: '.header p a:nth-child(4)', text: 'The **Github** link is where you can view the source code and contribute!', position: 'bottom', adjust: {y: 10, x: 0} },
    { element: '.collapsible-header', text: 'This is the **Credits Panel**. Click it to see the original creators of the games.', position: 'left', adjust: {y: 0, x: -10} },
    { element: '#searchBtn', text: 'This is the **Search** button. It opens a quick search bar above the dock.', position: 'top', adjust: {y: -10, x: 0} },
    { element: '#settingsBtn', text: 'This is **Site Settings**. Click it to open the settings panel, where the canvas mode, export and import buttons, and viewer controls can be customized!', position: 'top', adjust: {y: -10, x: 0} }
];

function checkSecretTrigger() {
    const allButtonsOff = Object.values(viewerControlsVisibility).every(val => val === false);
    if (isCanvasMode && allButtonsOff) {
        document.getElementById("loginGate").style.display = "flex";
        closePopups();
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
        endTour(true);
    }
}

function endTour(completed) {
    localStorage.setItem("mathmaster_tour_completed", "true");
    if(tourWelcomeModal) tourWelcomeModal.style.display = 'none';
    if(tourOverlay) tourOverlay.style.display = 'none';
    if(tourTooltip) tourTooltip.style.opacity = '0';
    const highlight = document.querySelector('.tour-highlight');
    if (highlight) highlight.remove();
}

function showTourStep(stepIndex) {
    const step = tourSteps[stepIndex];
    const targetElement = document.querySelector(step.element);

    if (!targetElement) {
        console.error(`Tour element not found for step ${stepIndex}: ${step.element}`);
        nextTourStep(); 
        return;
    }
    
    tourTextEl.innerHTML = step.text;
    if (stepIndex === tourSteps.length - 1) {
        tourNextBtn.style.display = 'none';
        tourEndBtn.style.display = 'block';
    } else {
        tourNextBtn.style.display = 'block';
        tourEndBtn.style.display = 'none';
    }

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        let highlight = document.querySelector('.tour-highlight');
        if (!highlight) {
            highlight = document.createElement('div');
            highlight.className = 'tour-highlight';
            tourOverlay.appendChild(highlight);
        }

        highlight.style.width = `${rect.width + 10}px`;
        highlight.style.height = `${rect.height + 10}px`;
        highlight.style.top = `${rect.top + window.scrollY - 5}px`;
        highlight.style.left = `${rect.left + window.scrollX - 5}px`;
        
        let tooltipX, tooltipY;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        switch (step.position) {
            case 'top': tooltipX = centerX - tourTooltip.offsetWidth / 2; tooltipY = rect.top - tourTooltip.offsetHeight - 15 + (step.adjust.y || 0); break;
            case 'bottom': tooltipX = centerX - tourTooltip.offsetWidth / 2; tooltipY = rect.bottom + 15 + (step.adjust.y || 0); break;
            case 'left': tooltipX = rect.left - tourTooltip.offsetWidth - 15 + (step.adjust.x || 0); tooltipY = centerY - tourTooltip.offsetHeight / 2; break;
            case 'right': tooltipX = rect.right + 15 + (step.adjust.x || 0); tooltipY = centerY - tourTooltip.offsetHeight / 2; break;
            default: tooltipX = centerX - tourTooltip.offsetWidth / 2; tooltipY = rect.bottom + 15;
        }
        
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + tourTooltip.offsetWidth > window.innerWidth - 10) {
            tooltipX = window.innerWidth - tourTooltip.offsetWidth - 10;
        }
        
        tourTooltip.style.left = `${tooltipX + window.scrollX}px`;
        tourTooltip.style.top = `${tooltipY + window.scrollY}px`;
        tourTooltip.style.opacity = '1';
    }, 400); 
}

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

// === Checks if user has access to secret apps/games ===
function isSecretUnlocked() {
    const deviceId = localStorage.getItem("mathmaster_device_id");
    const list = JSON.parse(localStorage.getItem("mathmaster_registered_devices") || "[]");
    const sessionUnlocked = sessionStorage.getItem("mathmaster_session_unlocked") === "true";
    
    return sessionUnlocked || (deviceId && list.includes(deviceId));
}

// === Custom Game Fetcher System ===
function getCustomGames() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve([]);
            return;
        }

        try {
            const request = indexedDB.open("GlassExplorerDB", 1);
            
            request.onupgradeneeded = (e) => {
                resolve([]); 
            };
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("files")) {
                    resolve([]);
                    return;
                }
                
                const transaction = db.transaction(["files"], "readonly");
                const store = transaction.objectStore("files");
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    const files = getAllRequest.result || [];
                    const customGames = files.filter(f => f.path && f.path.startsWith("Games/") && f.name.endsWith(".html"));
                    resolve(customGames);
                };
                
                getAllRequest.onerror = () => resolve([]);
            };
            
            request.onerror = () => resolve([]);
        } catch (error) {
            console.error("Ludus Drive Error:", error);
            resolve([]);
        }
    });
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
        if (!deviceId || !list.includes(deviceId)) {
            if (list.length >= MAX_DEVICES) { limit.style.display = "block"; return; }
            deviceId = crypto.randomUUID();
            list.push(deviceId);
            localStorage.setItem(DEVICE_KEY, deviceId);
            localStorage.setItem(MASTER_LIST_KEY, JSON.stringify(list));
        }
    } else {
        sessionStorage.setItem("mathmaster_session_unlocked", "true");
    }

    document.getElementById("loginGate").style.display = "none";
    renderGamesGrid(); 
}

function toggleCredits() {
    const panel = document.getElementById("creditsPanel");
    if (panel) {
        panel.style.display = (panel.style.display === "block") ? "none" : "block";
    }
}

function reloadGame() {
    const frame = document.getElementById("gameFrame");
    if (frame && frame.src) frame.src = frame.src; 
}

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

function openInNewTab() {
    const frame = document.getElementById("gameFrame");
    if (frame && frame.src) {
        window.open(frame.src, '_blank');
    }
}

// === Games List ===
const games = [
  {name:"Chatbot", path:"https://mathmaster-tx-prem.zapier.app/chat", logo:"Versions/Assets/Pictures/Non-edited/Chatbot-n.png", external:true, secret: true},

  {name:"Your Mom's House", path:"Versions/Assets/Game Data/Five Nights at Epsteins.html", logo:"Versions/Assets/Pictures/Non-edited/FNAE.jpg", secret: true},
  {name:"Your Mom's House 2", path:"Versions/Assets/Game Data/Five Nights at Last Breath.html", logo:"Versions/Assets/Pictures/Non-edited/Mom21-n.jpg", secret: true},
  {name:"Love Meter", path:"Versions/Assets/Game Data/love_meter.html", logo:"Versions/Assets/Pictures/Edited/LoveMeter-ed.png"},
  {name:"12 Mini Battles", path:"Versions/Assets/Game Data/12 Mini Battles.html", logo:"Versions/Assets/Pictures/Non-edited/12MiniBattles-n.png"},
  {name:"1v1.lol", path:"Versions/Assets/Game Data/1v1lol/index.html", logo:"Versions/Assets/Pictures/Non-edited/1v1.lol-n.png"},
  {name:"2048", path:"Versions/Assets/Game Data/2048/index.html", logo:"Versions/Assets/Pictures/Non-edited/2048-n.png"},
  {name:"Among Us", path:"Versions/Assets/Game Data/among-us/index.html", logo:"Versions/Assets/Pictures/Non-edited/AmongUs-n.png"},
  {name:"Arthur's Nightmare", path:"Versions/Assets/Game Data/Arthur Nightmare.html", logo:"Versions/Assets/Pictures/Non-edited/Arthur-Nightmare-n.webp"},
  {name:"Backrooms", path:"Versions/Assets/Game Data/backrooms/index.html", logo:"Versions/Assets/Pictures/Non-edited/Backrooms-n.png"},
  {name:"Brawl Stars", path:"Versions/Assets/Game Data/Brawl Simulator 3D.html", logo:"Versions/Assets/Pictures/Non-edited/Brawl-n.png"},
  {name:"Bad Ice Cream", path:"Versions/Assets/Game Data/bad-ice-cream/index.html", logo:"Versions/Assets/Pictures/Non-edited/BadIceCream-n.png"},
  {name:"Baldis Basics", path:"Versions/Assets/Game Data/baldis-basics/index.html", logo:"Versions/Assets/Pictures/Non-edited/BaldiBasics-n.png"},
  {name:"Baseball Bros", path:"Versions/Assets/Game Data/Baseball Bros.html", logo:"Versions/Assets/Pictures/Non-edited/baseball-n.png"},
  {name: "Basket Bros", path: "Versions/Assets/Game Data/Basket Bros.html", logo: "Versions/Assets/Pictures/Non-edited/Basket-n.png"},
  {name:"Basketball Stars", path:"Versions/Assets/Game Data/basketball-stars/index.html", logo:"Versions/Assets/Pictures/Non-edited/BasketballStars-n.png"},
  {name:'Basket Random', path:'Versions/Assets/Game Data/basketrandom/index.html', logo:'Versions/Assets/Pictures/Non-edited/BasketRandom-n.jpg'},
  {name:'Bitlife', path:'Versions/Assets/Game Data/bitlife-main/bitlife-main/index.html', logo:'Versions/Assets/Pictures/Non-edited/Bitlife-n.jpg'},
  {name:"Block Blast", path:"Versions/Assets/Game Data/Block Blast.html", logo:"Versions/Assets/Pictures/Non-edited/BlockBlast-n.png"},
  {name:"Bridge Race", path:"Versions/Assets/Game Data/Bridge Race.html", logo:"Versions/Assets/Pictures/Non-edited/BridgeRace-n.png"},
  {name:'Boxing Random', path:'Versions/Assets/Game Data/boxingrandom/index.html', logo:'Versions/Assets/Pictures/Non-edited/BoxingRandom-n.jpg'},
  {name:'Breakout', path:'Versions/Assets/Game Data/breakout/index.html', logo:'Versions/Assets/Pictures/Non-edited/Breakout-n.png'},
  {name:"Candy Crush", path: "Versions/Assets/Game Data/Candy Crush.html", logo: "Versions/Assets/Pictures/Non-edited/CandyCrush-n.png"}, 
  {name:"Cluster Rush", path:"Versions/Assets/Game Data/cluster-rush/index.html", logo:"Versions/Assets/Pictures/Non-edited/ClusterTruck-n.png"},
  {name:"Cookie Clicker", path:"Versions/Assets/Game Data/cookieclicker/index.html", logo:"Versions/Assets/Pictures/Non-edited/CookieClicker-n.ico", external:true}, 
  {name:"Crossyroad", path:"Versions/Assets/Game Data/crossyroad/index.html", logo:"Versions/Assets/Pictures/Non-edited/CrossyRoad-n.png"},
  {name:'Chess', path:'Versions/Assets/Game Data/chess/index.html', logo:'Versions/Assets/Pictures/Non-edited/Chess-n.png'},
  {name:'Chrome Dino', path:'Versions/Assets/Game Data/chromedino/index.html', logo:'Versions/Assets/Pictures/Non-edited/DinosaurGame-n.png'},
  {name:"Drift Hunters",path:"Versions/Assets/Game Data/Drift Hunters.html", logo:"Versions/Assets/Pictures/Non-edited/Drift-Hunters-n.png"},
  {name:"Drive Mad", path:"Versions/Assets/Game Data/drive-mad/index.html", logo:"Versions/Assets/Pictures/Non-edited/DriveMad-n.jpg"},
  {name:"Duck Life 4", path:"Versions/Assets/Game Data/ducklife4/index.html", logo:"Versions/Assets/Pictures/Non-edited/DuckLife4-n.jpg"},
  {name:'Doodle Jump', path:'Versions/Assets/Game Data/doodlejump/index.html', logo:'Versions/Assets/Pictures/Non-edited/DoodleJump-n.png'},
  {name:"Five Nights at Freddy's", path:"Versions/Assets/Game Data/Five Nights at Freddys.html", logo:"Versions/Assets/Pictures/Non-edited/FNAF-n.png"},
  {name:"Five Nights at Freddy's 2", path:"Versions/Assets/Game Data/Five Nights at Freddys 2.html", logo:"Versions/Assets/Pictures/Non-edited/FNAF2-n.png"},
  {name:"Five Nights at Freddy's 3", path:"Versions/Assets/Game Data/Five Nights at Freddys 3.html", logo:"Versions/Assets/Pictures/Non-edited/FNAF3-n.png"},
  {name:"Five Nights at Freddy's 4", path:"Versions/Assets/Game Data/Five Nights at Freddys 4.html", logo:"Versions/Assets/Pictures/Non-edited/FNAF4-n.png"},
  {name:"Five Nights at Freddy's Sister Location", path:"Versions/Assets/Game Data/Five Nights at Freddys Sister Location.html", logo: "Versions/Assets/Pictures/Non-edited/Sister-Location-n.png"},
  {name:"Five Nights at Freddy's Ultimate Customs Night", path:"Versions/Assets/Game Data/Five Nights at Freddys Ultimate Custom Night.html", logo: "Versions/Assets/Pictures/Non-edited/Customs-Night-n.png"},
  {name: "Five Nights at Winston's", path: "Versions/Assets/Game Data/Five Nights at Winstons.html", logo: "Versions/Assets/Pictures/Non-edited/Winston-n.png"},
  {name:"FNAF World", path:"Versions/Assets/Game Data/FNAF World.html", logo:"Versions/Assets/Pictures/Non-edited/FNAF-World.png"},
  {name: "Free Rider Jumps", path: "Versions/Assets/Game Data/free_rider_jumps/index.html", logo: "Versions/Assets/Pictures/Non-edited/Free-n.webp"},
  {name:"Fruit Ninja", path:"Versions/Assets/Game Data/fruitninja/index.html", logo:"Versions/Assets/Pictures/Non-edited/FruitNinja-n.jpg"},
  {name:'Flappy Bird', path:'Versions/Assets/Game Data/flappybird/index.html', logo:'Versions/Assets/Pictures/Non-edited/FlappyBird-n.webp'},
  {name: 'Friday Night Funkin (For Jacob)', path: 'Versions/Assets/Game Data/Friday Night Funkin.html', logo: 'Versions/Assets/Pictures/Non-edited/Friday-n.png'},
  {name:"Football Bros", path:"Versions/Assets/Game Data/Football Bros (1).html", logo:"Versions/Assets/Pictures/Non-edited/Football-n.png"},
  {name:'Geometry Dash', path:'Versions/Assets/Game Data/geometrydash/index.html', logo:'Versions/Assets/Pictures/Non-edited/GeometryDash-n.jpg'}, 
  {name:"Gobble", path:'Versions/Assets/Game Data/Gobble.html', logo:"Versions/Assets/Pictures/Non-edited/Gobble-n.png"},
  {name:"Granny", path:"Versions/Assets/Game Data/Granny.html", logo:"Versions/Assets/Pictures/Non-edited/Granny-n.png"},
  {name:"Granny 2", path:"Versions/Assets/Game Data/Granny 2.html", logo:"Versions/Assets/Pictures/Non-edited/Granny-2-n.png"},
  {name:"Granny 3", path:"Versions/Assets/Game Data/Granny 3.html", logo:"Versions/Assets/Pictures/Non-edited/Granny-3-n.png"},
  {name:"Hill Climb Racing Lite", path:"Versions/Assets/Game Data/Hill Climb Racing Lite.html", logo:"Versions/Assets/Pictures/Non-edited/Hill-n.png"},
  {name:'Idle Breakout', path:'Versions/Assets/Game Data/idle-breakout-main/idle-breakout-main/game.html', logo:'Versions/Assets/Pictures/Non-edited/IdleBreakout-n.png'},
  {name:"Idle Lumber Inc.", path:"Versions/Assets/Game Data/Idle Lumber Inc.html", logo:"Versions/Assets/Pictures/Non-edited/Lumber-n.png"},
  {name:"Line Rider", path:"Versions/Assets/Game Data/Line Rider.html", logo: "Versions/Assets/Pictures/Non-edited/Line-Rider-n.jpg"},
  {name:'Super Mario Bros', path:'Versions/Assets/Game Data/mario/index.html', logo:"Versions/Assets/Pictures/Non-edited/Mario-n.png"},
  {name:'Monkey Mart', path: 'Versions/Assets/Game Data/monkeymart/index.html', logo:'Versions/Assets/Pictures/Non-edited/monkeymart-n.avif'},
  {name:"Minecraft", path:"Versions/Assets/Game Data/Minecraft 1.8.8.html", logo:"Versions/Assets/Pictures/Non-edited/Minecraft-n.png",external:true},
  {name:"Moto X3M 2", path:"Versions/Assets/Game Data/motox3m2/index.html", logo:"Versions/Assets/Pictures/Non-edited/Motox3m2-n.png"},
  {name:"Moto X3M 3", path:"Versions/Assets/Game Data/Moto X3M 3.html", logo:"Versions/Assets/Pictures/Non-edited/Motox3m3-n.png"},
  {name:"Moto X3M Pool Party", path:"Versions/Assets/Game Data/motox3m-pool/index.html", logo:"Versions/Assets/Pictures/Non-edited/Motox3mPool-n.jpg"},
  {name:"Moto X3M Spooky", path:"Versions/Assets/Game Data/motox3m-spooky/index.html", logo:"Versions/Assets/Pictures/Non-edited/Motox3mSpooky-n.jpeg"},
  {name:"Moto X3M Winter", path:"Versions/Assets/Game Data/motox3mwinter/index.html", logo:"Versions/Assets/Pictures/Non-edited/Motox3mWinter-n.webp"},
  {name:'Ovo', path:'Versions/Assets/Game Data/ovo/index.html', logo:'Versions/Assets/Pictures/Non-edited/ovo-n.png'},
  {name:"Ovo 2", path:"Versions/Assets/Game Data/OvO 2.html", logo:"Versions/Assets/Pictures/Non-edited/OvO-2-n.webp"},
  {name:'Pac-Man', path:'Versions/Assets/Game Data/pacman/index.html', logo:'Versions/Assets/Pictures/Non-edited/Pacman-n.png'},
  {name:"Paper io 2", path:"Versions/Assets/Game Data/paperio2/index.html", logo:"Versions/Assets/Pictures/Non-edited/Paperio2-n.png"},
  {name:"Plants Vs Zombies", path:"Versions/Assets/Game Data/Plants vs Zombies.html", logo:"Versions/Assets/Pictures/Non-edited/PlantsVsZombies-n.png"},
  {name: "Poly Track", path: "Versions/Assets/Game Data/poly-track/index.html", logo: "Versions/Assets/Pictures/Non-edited/Poly-n.png"},
  {name:"Red Ball 4", path:"Versions/Assets/Game Data/Red Ball 4.html", logo:"Versions/Assets/Pictures/Non-edited/RedBall4-n.png"},
  {name:"Red Ball 4 Vol. 2", path:"Versions/Assets/Game Data/Red Ball 4 Vol. 2.html", logo:"Versions/Assets/Pictures/Non-edited/RedBall4-2-n.png"},
  {name:"Red Ball 4 Vol. 3", path:"Versions/Assets/Game Data/Red Ball 4 Vol. 3.html", logo:"Versions/Assets/Pictures/Non-edited/RedBall4-3-n.png"},
  {name:"Retro Bowl", path:"Versions/Assets/Game Data/bowl/index.html", logo:"Versions/Assets/Pictures/Non-edited/Retrobowl-n.png"},
  {name:"Riddle School", path:"Versions/Assets/Game Data/Riddle School.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-n.png"},
  {name:"Riddle School 2", path:"Versions/Assets/Game Data/Riddle School 2.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-2-n.png"},
  {name:"Riddle School 3", path:"Versions/Assets/Game Data/Riddle School 3.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-3-n.png"},
  {name:"Riddle School 4", path:"Versions/Assets/Game Data/Riddle School 4.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-4-n.png"},
  {name:"Riddle School 5", path:"Versions/Assets/Game Data/Riddle School 5.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-5-n.png"},
  {name:"Riddle School 6", path:"Versions/Assets/Game Data/Riddle Transfer.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-6-n.png"},
  {name:"Riddle School 7", path:"Versions/Assets/Game Data/Riddle Transfer 2.html", logo:"Versions/Assets/Pictures/Non-edited/Riddle-7-n.png"},
  {name:"Rolly Vortex", path:"Versions/Assets/Game Data/Rolly Vortex.html", logo:"Versions/Assets/Pictures/Non-edited/RollyVortex-n.png"},
  {name:"Rooftop Snipers", path:"Versions/Assets/Game Data/rooftop-snipers/index.html", logo:"Versions/Assets/Pictures/Non-edited/RooftopSnipers-n.png"},
  {name:"Run", path:"Versions/Assets/Game Data/Run 1.html", logo:" Versions/Assets/Pictures/Non-edited/Run1-n.png"},
  {name: "Run 2", path: "Versions/Assets/Game Data/Run 2.html", logo: "Versions/Assets/Pictures/Non-edited/Run-2-n.png"},
  {name:"Run 3", path:"Versions/Assets/Game Data/Run 3.html", logo:"Versions/Assets/Pictures/Non-edited/Run3-n.png"},
  {name: "Schoolboy Runaway", path: "Versions/Assets/Game Data/Schoolboy Runaway.html", logo: "Versions/Assets/Pictures/Non-edited/Runaway-n.png"},
  {name: "Soccer Random", path: "Versions/Assets/Game Data/Soccer-Random/index.html", logo: "Versions/Assets/Pictures/Non-edited/SoccerRandom-n.jpg"},
  {name: "Soundboard", path: "Versions/Assets/Game Data/soundboard/index.html", logo: "Versions/Assets/Pictures/Non-edited/Soundboard-n.jpg"},
  {name:"Slither.io", path:"Versions/Assets/Game Data/sfge.html",logo:"Versions/Assets/Pictures/Non-edited/Slither-n.png"},
  {name:"Slender", path:"Versions/Assets/Game Data/Slender 8 Pages.html", logo: "Versions/Assets/Pictures/Non-edited/Slender-n.png"},
  {name:'Slope', path:'Versions/Assets/Game Data/Slope-Game-main/Slope-Game-main/index.html', logo:'Versions/Assets/Pictures/Non-edited/Slope-n.png'},
  {name:"Slope 2", path:"Versions/Assets/Game Data/Slope 2.html", logo:"Versions/Assets/Pictures/Non-edited/Slope2-n.png"},
  {name:"Solar Smash", path:"Versions/Assets/Game Data/Solar Smash.html", logo:"Versions/Assets/Pictures/Non-edited/SolarSmash-n.png"},
  {name:"Station Saturn", path:"Versions/Assets/Game Data/Station Saturn.html", logo:"Versions/Assets/Pictures/Non-edited/StationSaturn-n.png"},
  {name:"Steal A Brainrot", path:"Versions/Assets/Game Data/Steal A Brainrot.html", logo:"Versions/Assets/Pictures/Non-edited/StealABrainrot-n.png"},
  {name:"Subway Surfers", path:"Versions/Assets/Game Data/subway-surfers/index.html", logo:"Versions/Assets/Pictures/Non-edited/SubwaySurfers-n.jpg"},
  {name:"Stickman Hook", path:"Versions/Assets/Game Data/stickman-hook/index.html", logo:"Versions/Assets/Pictures/Non-edited/Stickman-n.png"},
  {name:"Slow Roads", path:"Versions/Assets/Game Data/Slowroads.html", logo:"Versions/Assets/Pictures/Non-edited/Slow-Roads-n.png"},
  {name:"Space Waves", path:"Versions/Assets/Game Data/Space Waves.html", logo:"Versions/Assets/Pictures/Non-edited/Space-Waves-n.png"},
  {name:"Temple Run 2", path:"Versions/Assets/Game Data/Temple Run 2.html", logo:"Versions/Assets/Pictures/Non-edited/TempleRun2-n.png"},
  {name:"Space Invaders", path:'Versions/Assets/Game Data/spaceinvaders/index.html', logo:'Versions/Assets/Pictures/Non-edited/SpaceInvaders-n.png'},
  {name:"Thats Not My Neighbor", path: 'Versions/Assets/Game Data/Thats Not My Neighbor.html', logo:"Versions/Assets/Pictures/Non-edited/ThatsNotMyNeighbor-n.png",external:true},
  {name:"Tunnel Rush", path: "Versions/Assets/Game Data/tunnelrush/index.html", logo: "Versions/Assets/Pictures/Non-edited/TunnelRush-n.jpg"},
  {name:"The Impossible Quiz", path:"Versions/Assets/Game Data/the-impossible-quiz/index.html", logo:"Versions/Assets/Pictures/Non-edited/ImpossibleQuiz-n.webp"},
  {name:"The Man In The Window", path:"Versions/Assets/Game Data/The Man In The Window.html", logo:"Versions/Assets/Pictures/Non-edited/ManFromWindow-n.png"},
  {name:"Tomb of the Mask", path:"Versions/Assets/Game Data/Tomb Of The Mask.html", logo:"Versions/Assets/Pictures/Non-edited/TombOfMask-n.png"},
  {name:"Volleyball Random", path:"Versions/Assets/Game Data/Volley-Random/index.html", logo:"Versions/Assets/Pictures/Non-edited/VolleyRandom-n.webp"},
  {name:"Wrestle Bros", path:"Versions/Assets/Game Data/wrestle-bros-io-main/wrestle-bros-io-main/index.html", logo:"Versions/Assets/Pictures/Non-edited/Wrestle-n.jpg"},
  {name:"Wordle", path:"Versions/Assets/Game Data/wordle/index.html", logo:"Versions/Assets/Pictures/Non-edited/Wordle-n.webp"},
  {name:"Worlds Hardest Game", path:"Versions/Assets/Game Data/worlds-hardest-game/index.html", logo:"Versions/Assets/Pictures/Non-edited/WorldHardestGame-n.jpeg"},
  {name:"Yohoho.io", path:"Versions/Assets/Game Data/YoHoHo.io-main/index.html", logo: "Versions/Assets/Pictures/Non-edited/yohoho-n.jpg"},
  { name: "Ninja vs EVILCORP", path: "Versions/Assets/Game Data/101.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "World's Hardest Game", path: "Versions/Assets/Game Data/103.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "World's Hardest Game 3", path: "Versions/Assets/Game Data/104.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "World's Hardest Game 4", path: "Versions/Assets/Game Data/105.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "106", path: "Versions/Assets/Game Data/106.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Tiny Fishing 1", path: "Versions/Assets/Game Data/108.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Toss the Turtle", path: "Versions/Assets/Game Data/110-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Tube Jumpers", path: "Versions/Assets/Game Data/111.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Pool", path: "Versions/Assets/Game Data/115.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Snow Rider 3D", path: "Versions/Assets/Game Data/119.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Knifecut 3D", path: "Versions/Assets/Game Data/128.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Trivia", path: "Versions/Assets/Game Data/163.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "CrazyCattle3D", path: "Versions/Assets/Game Data/164-temp.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Cheese Chompers 3D", path: "Versions/Assets/Game Data/165.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bad Parenting ", path: "Versions/Assets/Game Data/166.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Blade Ball", path: "Versions/Assets/Game Data/167.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Blocky Snakes", path: "Versions/Assets/Game Data/168.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bloxorz", path: "Versions/Assets/Game Data/169.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Big Tower Tiny Square 2", path: "Versions/Assets/Game Data/170.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Melon Playground ", path: "Versions/Assets/Game Data/172.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "worldbox", path: "Versions/Assets/Game Data/174.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "n-gon", path: "Versions/Assets/Game Data/180.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Ragdoll Archers", path: "Versions/Assets/Game Data/186.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Cashier", path: "Versions/Assets/Game Data/187.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Scrapmetal 3", path: "Versions/Assets/Game Data/188e.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Supreme Duelist", path: "Versions/Assets/Game Data/19.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Five Nights at Freddy's Pizzeria Simulator", path: "Versions/Assets/Game Data/191.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Do NOT Take This Cat Home", path: "Versions/Assets/Game Data/193.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "people playground.", path: "Versions/Assets/Game Data/194-a.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "R.E.P.O", path: "Versions/Assets/Game Data/195.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "ULTRAKILL", path: "Versions/Assets/Game Data/196-fixed.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Elastic Face", path: "Versions/Assets/Game Data/197.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Time Shooter", path: "Versions/Assets/Game Data/199.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Time Shooter 2", path: "Versions/Assets/Game Data/200.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Time Shooter 3 SWAT", path: "Versions/Assets/Game Data/201.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Doom", path: "Versions/Assets/Game Data/203-a.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Buckshot Roulette", path: "Versions/Assets/Game Data/205-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "SnowBattle.io", path: "Versions/Assets/Game Data/207.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "YT Game Wrapper WebGL Template", path: "Versions/Assets/Game Data/20a.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dragon Vs Bricks", path: "Versions/Assets/Game Data/210.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Death Run 3D", path: "Versions/Assets/Game Data/211.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Cut the Rope", path: "Versions/Assets/Game Data/212-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Cut the Rope: Time Travel", path: "Versions/Assets/Game Data/213-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Cut the Rope: Holiday Gift", path: "Versions/Assets/Game Data/214-fi.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bendy and the Ink Machine", path: "Versions/Assets/Game Data/215.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "HOTLINE MIAMI", path: "Versions/Assets/Game Data/217-c.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Pizzeria", path: "Versions/Assets/Game Data/218.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's", path: "Versions/Assets/Game Data/220.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Cupcake", path: "Versions/Assets/Game Data/221.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papas Donuteria", path: "Versions/Assets/Game Data/222.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Freezeria", path: "Versions/Assets/Game Data/223.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Hot Doggeneria", path: "Versions/Assets/Game Data/224.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Pizzeria", path: "Versions/Assets/Game Data/227.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Scooperia", path: "Versions/Assets/Game Data/228.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Sushieria", path: "Versions/Assets/Game Data/229.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papa's Wingeria", path: "Versions/Assets/Game Data/231.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "SUPERHOT", path: "Versions/Assets/Game Data/233.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Ducklife", path: "Versions/Assets/Game Data/234.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Ducklife 2", path: "Versions/Assets/Game Data/235.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Ducklife 3:Evolution", path: "Versions/Assets/Game Data/236.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Ducklife Treasure Hunt", path: "Versions/Assets/Game Data/238.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Crossy Road OG", path: "Versions/Assets/Game Data/24.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Red Ball 3", path: "Versions/Assets/Game Data/241.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely", path: "Versions/Assets/Game Data/245.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 2", path: "Versions/Assets/Game Data/246.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 3", path: "Versions/Assets/Game Data/247.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 4", path: "Versions/Assets/Game Data/248.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 5", path: "Versions/Assets/Game Data/249.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 6", path: "Versions/Assets/Game Data/250.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Wheely 7", path: "Versions/Assets/Game Data/251.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Google Baseball", path: "Versions/Assets/Game Data/252.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "CrazyChicken3D", path: "Versions/Assets/Game Data/255.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "CrazyKitty3D", path: "Versions/Assets/Game Data/256.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "257", path: "Versions/Assets/Game Data/257.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Class of '09", path: "Versions/Assets/Game Data/259.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "RERUN", path: "Versions/Assets/Game Data/260.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Xash", path: "Versions/Assets/Game Data/262.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Escape Road", path: "Versions/Assets/Game Data/264.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Escape Road 2", path: "Versions/Assets/Game Data/265-fix.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Speed Stars", path: "Versions/Assets/Game Data/266.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Pizza Tower", path: "Versions/Assets/Game Data/267.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bacon May Die", path: "Versions/Assets/Game Data/268.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Geometry Dash", path: "Versions/Assets/Game Data/27-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bad Ice Cream 2", path: "Versions/Assets/Game Data/270.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bad Ice Cream 3", path: "Versions/Assets/Game Data/271.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Blockpost", path: "Versions/Assets/Game Data/273.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "circlo", path: "Versions/Assets/Game Data/274.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Evil Glitch", path: "Versions/Assets/Game Data/277.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Madalin Stunt Cars 2", path: "Versions/Assets/Game Data/278.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Madalin Stunt Cars 3", path: "Versions/Assets/Game Data/279.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Basketball FRVR", path: "Versions/Assets/Game Data/28.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Papery Planes", path: "Versions/Assets/Game Data/280.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Pixel Gun Survival", path: "Versions/Assets/Game Data/281.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Protektor", path: "Versions/Assets/Game Data/282.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Rooftop Snipers", path: "Versions/Assets/Game Data/283.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Knights Arena", path: "Versions/Assets/Game Data/284.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Endoparasitic", path: "Versions/Assets/Game Data/286.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Idle Dice", path: "Versions/Assets/Game Data/294.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Little Runmo", path: "Versions/Assets/Game Data/302.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Alien Hominid", path: "Versions/Assets/Game Data/304.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Tanuki Sunset", path: "Versions/Assets/Game Data/305.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Shipo", path: "Versions/Assets/Game Data/306.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "NZ: Portable", path: "Versions/Assets/Game Data/308.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "SANDTRIS", path: "Versions/Assets/Game Data/311.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "BlackJack", path: "Versions/Assets/Game Data/312.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Minesweeper", path: "Versions/Assets/Game Data/313.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Jelly Mario", path: "Versions/Assets/Game Data/315.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Unity Web Player | Roulette", path: "Versions/Assets/Game Data/318.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Walk 3D", path: "Versions/Assets/Game Data/319.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Home", path: "Versions/Assets/Game Data/323.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Slime.io", path: "Versions/Assets/Game Data/327.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Tiletopia", path: "Versions/Assets/Game Data/329a.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Crazy Cars", path: "Versions/Assets/Game Data/331.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Going Balls", path: "Versions/Assets/Game Data/332.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Brad Borne 2", path: "Versions/Assets/Game Data/334.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Brad Borne 3", path: "Versions/Assets/Game Data/335.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Brad Borne 3", path: "Versions/Assets/Game Data/337.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Getaway Shootout", path: "Versions/Assets/Game Data/338.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "House of Hazards", path: "Versions/Assets/Game Data/339.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Retro Bowl College", path: "Versions/Assets/Game Data/34-fixed.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Learn to Fly", path: "Versions/Assets/Game Data/340.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Learn to fly 3", path: "Versions/Assets/Game Data/342.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Learn to Fly Idle", path: "Versions/Assets/Game Data/343.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Raft Wars 2", path: "Versions/Assets/Game Data/345.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Sort the Court!", path: "Versions/Assets/Game Data/346.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Zombie", path: "Versions/Assets/Game Data/348.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Spiral Roll", path: "Versions/Assets/Game Data/349.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "The Binding of Issac", path: "Versions/Assets/Game Data/350.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Soundboard 2", path: "Versions/Assets/Game Data/352.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "AdVenture Capitalist!", path: "Versions/Assets/Game Data/354-a.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dadish 2", path: "Versions/Assets/Game Data/355.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dadish 3", path: "Versions/Assets/Game Data/356.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dadish", path: "Versions/Assets/Game Data/357.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dadish 3D", path: "Versions/Assets/Game Data/358.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Dadish", path: "Versions/Assets/Game Data/359.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Monster Tracks", path: "Versions/Assets/Game Data/36.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Google Feud", path: "Versions/Assets/Game Data/361.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Idle Mining Empire", path: "Versions/Assets/Game Data/364.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Just Fall", path: "Versions/Assets/Game Data/365.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Smash Karts", path: "Versions/Assets/Game Data/370-f.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Stickman Fight Ragdoll", path: "Versions/Assets/Game Data/371e.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Stickman Climb", path: "Versions/Assets/Game Data/373.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Super Stickman Golf", path: "Versions/Assets/Game Data/374e.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Shooter", path: "Versions/Assets/Game Data/376.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Money Rush", path: "Versions/Assets/Game Data/377.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Sniper", path: "Versions/Assets/Game Data/378.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Driving", path: "Versions/Assets/Game Data/379.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Country Defense 3D", path: "Versions/Assets/Game Data/380.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Clothing Shop", path: "Versions/Assets/Game Data/381.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Car", path: "Versions/Assets/Game Data/382.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Rolly Car", path: "Versions/Assets/Game Data/383.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Decisions", path: "Versions/Assets/Game Data/384.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "My Carshop", path: "Versions/Assets/Game Data/385.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "386", path: "Versions/Assets/Game Data/386.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "DrawJoust", path: "Versions/Assets/Game Data/387.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Bomb 3D", path: "Versions/Assets/Game Data/388.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "My Fitness Club", path: "Versions/Assets/Game Data/390.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Soccer 3D", path: "Versions/Assets/Game Data/391.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Jump 3D", path: "Versions/Assets/Game Data/392.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Shooter 3D", path: "Versions/Assets/Game Data/393.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Gun Build 3D", path: "Versions/Assets/Game Data/394.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "GunBuild", path: "Versions/Assets/Game Data/395.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Car Build 3D", path: "Versions/Assets/Game Data/397.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Clean 3D", path: "Versions/Assets/Game Data/398.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Car Jump 3D", path: "Versions/Assets/Game Data/399.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Gladihoppers", path: "Versions/Assets/Game Data/4.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Money Roll", path: "Versions/Assets/Game Data/400.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Decisions 3D", path: "Versions/Assets/Game Data/403.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Gun 3D 2", path: "Versions/Assets/Game Data/405.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Supermarket 3D", path: "Versions/Assets/Game Data/406.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Flighter 3D", path: "Versions/Assets/Game Data/407.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Telekinesis Quest", path: "Versions/Assets/Game Data/409.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Telekinesis Car 3D", path: "Versions/Assets/Game Data/410.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Force Race", path: "Versions/Assets/Game Data/411.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Treasure Hunt", path: "Versions/Assets/Game Data/412.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Tug of War", path: "Versions/Assets/Game Data/413.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Runner Template", path: "Versions/Assets/Game Data/414.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Elastic Shoot", path: "Versions/Assets/Game Data/416.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Revolver 3D", path: "Versions/Assets/Game Data/418.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Weapon Upgrade Rush", path: "Versions/Assets/Game Data/419.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Road of Fury", path: "Versions/Assets/Game Data/42.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Run Rich", path: "Versions/Assets/Game Data/421.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "High Heels", path: "Versions/Assets/Game Data/422.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  { name: "Webfishing", path: "Versions/Assets/Game Data/423.html", logo: "Versions/Assets/Pictures/Non-edited/Placeholder.png" },
  {name:"Andy's Apple Farm",	path:"Versions/Assets/Game Data/426.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"OMORI",	path:"Versions/Assets/Game Data/427-z.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Five Nights at Freddy's 4 Halloween",	path:"Versions/Assets/Game Data/428.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},								
{name:"Driven Wild",	path:"Versions/Assets/Game Data/43.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"10 Minutes Till Dawn",	path:"Versions/Assets/Game Data/430.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"99 Balls",	path:"Versions/Assets/Game Data/431.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Abandoned",	path:"Versions/Assets/Game Data/432.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Yume Nikki",	path:"Versions/Assets/Game Data/433.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"God's Flesh",	path:"Versions/Assets/Game Data/434.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"A Small World Cup",	path:"Versions/Assets/Game Data/435.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Awesome Tanks",	path:"Versions/Assets/Game Data/436.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Bouncemasters",	path:"Versions/Assets/Game Data/437.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Awesome Tanks 2",	path:"Versions/Assets/Game Data/438.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Squid Game",	path:"Versions/Assets/Game Data/439.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Ragdoll Hit ",	path:"Versions/Assets/Game Data/44-fix.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Celeste",	path:"Versions/Assets/Game Data/440.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"KittyToy",	path:"Versions/Assets/Game Data/441.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Infinimoes",	path:"Versions/Assets/Game Data/442.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Adventure Drivers",	path:"Versions/Assets/Game Data/443.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Ages of Conflict",	path:"Versions/Assets/Game Data/444.html", logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Kindergarten",	path:"Versions/Assets/Game Data//445.html", logo:"Versions/Assets/Pictures/Non-edited(placeholder.png"}	,		
{name:"Kindergarten 2",	path:"Versions/Assets/Game Data/446.html",	logo: "versions/assets/pictures/non-edited/Placeholder.png"},								
{name:"Aquapark.io",	path:"Versions/Assets/Game Data/448.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Vex",	path:"Versions/Assets/Game Data/45.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Amanda The Adventurer",	path:"Versions/Assets/Game Data/450.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Station 141",	path:"Versions/Assets/Game Data/452.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},								
{name:"BLOODMONEY!",	path:"Versions/Assets/Game Data/454.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"BERGENTRUCK 201X",	path:"Versions/Assets/Game Data/455.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"UNDERTALE YELLOW",	path:"Versions/Assets/Game Data/456.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Raft",	path:"Versions/Assets/Game Data/457.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"The Deadseat",	path:"Versions/Assets/Game Data/458.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Vex 2",	path:"Versions/Assets/Game Data/46.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Fears To Fathom: Home Alone",	path:"Versions/Assets/Game Data/460.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"slither.io",	path:"Versions/Assets/Game Data/461.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"DEAD PLATE",	path:"Versions/Assets/Game Data/462.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"ChoppyOrc",	path:"Versions/Assets/Game Data/464.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Baldi's Basics Classic",	path:"Versions/Assets/Game Data/466.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Baldi's Basics Plus",	path:"Versions/Assets/Game Data/467-updatee.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Hollow Knight",	path:"Versions/Assets/Game Data/468-f.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,																	
{name:"Madness: Project Nexus",	path:"Versions/Assets/Game Data/471.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"SPACEBAR CLICKER",	path:"Versions/Assets/Game Data/473.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,					
{name:"Friday Night Funkin B Sides",	path:"Versions/Assets/Game Data/475.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin vs Hex",	path:"Versions/Assets/Game Data/476.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin' + Hatsune Miku",	path:"Versions/Assets/Game Data/477.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin Neo'",	path:"Versions/Assets/Game Data/478.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"479",	path:"Versions/Assets/Game Data/479.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Vex 3 Xmas",	path:"Versions/Assets/Game Data/48.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}		,	
{name:"Friday Night Funkin’ Mid-Fight Masses",	path:"Versions/Assets/Game Data/480.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin' (FNF)",	path:"Versions/Assets/Game Data/481.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"HUMAN EXPENDITURE PROGRAM",	path:"Versions/Assets/Game Data/482-2.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Hit Single Cool Sauce",	path:"Versions/Assets/Game Data/483.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin' Creapy Pasta",	path:"Versions/Assets/Game Data/484.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin': Psych Engine",	path:"Versions/Assets/Game Data(485.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin' Sonic",	path:"Versions/Assets/Game Data(486.html",	logo:"Versions(Assets/Pictures(Non-edited(Placeholder.png"}			,					
{name:"Friday Night Funkin': Mistful Crimson Morning",	path:"Versions/Assets/Game Data/488.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:" Friday Night Funkin' Indie Cross",	path:"Versions/Assets/Game Data/489.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Vex 4",	path:"Versions/Assets/Game Data/49.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Rooftop Snipers 2",	path:"Versions/Assets/Game Data/490.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Unity WebGL Player | I woke up next to you again",	path:"Versions/Assets/Game Data/491.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},																						
{name:"Endless Aethos",	path:"Versions/Assets/Game Data/496.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"BopCity",	path:"Versions/Assets/Game Data/497.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin' Rubber Breaker",	path:"Versions/Assets/Game Data/498.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Lobotomy Dash Funkin'",	path:"Versions/Assets/Game Data/499.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Ice Dodo",	path:"Versions/Assets/Game Data/5.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Vex 5",	path:"Versions/Assets/Game Data/50.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin' Mod",	path:"Versions/Assets/Game Data/500.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Kindergarten 3",	path:"Versions/Assets/Game Data/501.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Stick With It",	path:"Versions/Assets/Game Data/502-fixed.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Five Nights at Candy's",	path:"Versions/Assets/Game Data/503.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Five Nights at Candy's 2",	path:"Versions/Assets/Game Data/504.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},																							
{name:"FNF SOFT",	path:"Versions/Assets/Game Data/509.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Vex 6",	path:"Versions/Assets/Game Data/51.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Dogeminer",	path:"Versions/Assets/Game Data/511.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"The Final Earth 2",	path:"Versions/Assets/Game Data/512.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Swordfight",	path:"Versions/Assets/Game Data/513.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"PortaBoy",	path:"Versions/Assets/Game Data/514.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},								
{name:"OshiOshiPunch",	path:"Versions/Assets/Game Data/516.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Nubby's Number Factory",	path:"Versions/Assets/Game Data/517.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Luminous Strike",	path:"Versions/Assets/Game Data/518.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Vex 7",	path:"Versions/Assets/Game Data/52.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"LD47",	path:"Versions/Assets/Game Data/521.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Bad Monday Simulator",	path:"Versions/Assets/Game Data/522.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Touhou Mother",	path:"Versions/Assets/Game Data/523-f.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},								
{name:"Darkness Takeover",	path:"Versions/Assets/Game Data/525.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Spongebob: Land Ho!",	path:"Versions/Assets/Game Data/526.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Spongebob Run",	path:"Versions/Assets/Game Data/527.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,												
{name:"Vex 8",	path:"Versions/Assets/Game Data/53.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Spongebob: The Kah-Rah-Tay Squid",	path:"Versions/Assets/Game Data/531.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Spongebob: Weresquirrel",	path:"Versions/Assets/Game Data/532.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,							
{name:"Teen Titans Go Jump Jousts",	path:"Versions/Assets/Game Data/534.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,																						
{name:"Chiikawa Puzzle",	path:"Versions/Assets/Game Data/539.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Vex Challenges",	path:"Versions/Assets/Game Data/54.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"My Teardrop",	path:"Versions/Assets/Game Data/540.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Pibby Apocalypse",	path:"Versions/Assets/Game Data/541.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Karlson",	path:"Versions/Assets/Game Data/542-a.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Jelly Drift",	path:"Versions/Assets/Game Data/543-a.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}		,	
{name:"Plinko",	path:"Versions/Assets/Game Data/544.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}		,	
{name:"Clash Of Vikings",	path:"Versions/Assets/Game Data/545.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Recoil",	path:"Versions/Assets/Game Data/546.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,												
{name:"Sonic 2 Community's Cut",	path:"Versions/Assets/Game Data/549.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Vex X3M",	path:"Versions/Assets/Game Data/55.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Sonic 3 A.I.R.",	path:"Versions/Assets/Game Data/550.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Hypper",	path:"Versions/Assets/Game Data/551.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},								
{name:"Rolling Sky",	path:"Versions/Assets/Game Data/553.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Yandere Simulator",	path:"Versions/Assets/Game Data/554.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin' Arcade Showdown",	path:"Versions/Assets/Game Data/555.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Friday Night Funkin Mod 2",	path:"Versions/Assets/Game Data/556.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Getting Over It",	path:"Versions/Assets/Game Data/557.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin' Cyber Sensation ",	path:"Versions/Assets/Game Data/558.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"},			
{name:"Friday Night Funkin' VS Shaggy",	path:"Versions/Assets/Game Data/559.html",	logo:"Versions/Assets/Pictures/Non-edited/Placeholder.png"}	,		
{name:"Vex X3M 2",	path:"Versions/Assets/Game Data(56.html",	logo:"Versions/Assets/Pictures(Non-edited(Placeholder.png"},			
{name:"DELTATRAVELER",	path:"Versions/Assets/Game Data(560.html",	logo:"Versions/Assets/Pictures(Non-edited(Placeholder.png"}			
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
let isCanvasMode = localStorage.getItem("mathmaster_canvas_mode") === "true";
let panicKey = localStorage.getItem("mathmaster_panic_key") || "`";
let inGamePanicKey = localStorage.getItem("mathmaster_ingame_panic_key") || "]"; 
let panicURL = localStorage.getItem("mathmaster_panic_url") || "https://www.google.com";
let customTitle = localStorage.getItem("mathmaster_title") || "Math Master";
let customFavicon = localStorage.getItem("mathmaster_favicon") || "Versions/Assets/Pictures/Non-edited/Math-n.png";

function changeFavicon(src) {
    const oldLink = document.getElementById("favicon");
    if (oldLink) oldLink.remove();
    const newLink = document.createElement("link");
    newLink.id = "favicon";
    newLink.rel = "icon";
    newLink.href = src;
    document.head.appendChild(newLink);
}

function applyTabIdentity() {
    if (isCanvasMode) {
        document.title = "Quizzes 2";
        changeFavicon("Versions/Assets/Pictures/Non-edited/canvas-n.png");
    } else {
        document.title = customTitle;
        changeFavicon(customFavicon);
    }
}

window.addEventListener('beforeunload', function (e) {
    const blockToggle = document.getElementById('settingsBlockCloseToggle');
    if (blockToggle && blockToggle.checked) {
        e.preventDefault();
        e.returnValue = ''; 
    }
});
applyTabIdentity();

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

const titleInput = document.getElementById("settingsTabTitle");
if (titleInput) {
    titleInput.value = (customTitle !== "Math Master") ? customTitle : "";
    titleInput.addEventListener("input", (e) => {
        customTitle = e.target.value || "Math Master";
        localStorage.setItem("mathmaster_title", customTitle);
        applyTabIdentity();
    });
}

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

const inGamePanicInput = document.getElementById("settingsInGamePanicKey");
if (inGamePanicInput) {
    inGamePanicInput.value = inGamePanicKey;
    inGamePanicInput.addEventListener("input", (e) => {
        inGamePanicKey = e.target.value || "]";
        localStorage.setItem("mathmaster_ingame_panic_key", inGamePanicKey);
    });
}

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

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    
    if (e.key === panicKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        window.location.href = panicURL;
        return;
    }

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

    const viewerElement = document.getElementById("viewer");
    if (viewerElement && viewerElement.style.display === "flex") {
        const matchedControl = viewerControlsConfig.find(c => c.key === e.key.toLowerCase());
        
        if (matchedControl && viewerControlsVisibility[matchedControl.id]) {
            e.preventDefault(); 
            new Function(matchedControl.action)(); 
        }
    }
});

function openAboutBlank() {
    let win = window.open('about:blank', '_blank');
    if (!win) return alert("Please allow pop-ups for this site!");

    let currentTitle = document.title;
    let iconElement = document.getElementById("favicon");
    let currentIcon = iconElement ? iconElement.href : "";

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
    
    win.document.close();
    window.location.replace('https://classroom.google.com'); 
}
// Add this to your script.js
function resolveGameUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    
    // If it's already a standard HTTP/HTTPS link, leave it alone
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        return rawUrl;
    }

    // Strip the proxy wrapper to force it to load locally
    if (rawUrl.startsWith("/iframe.html?url=")) {
        const innerPath = rawUrl.slice(17); // removes "/iframe.html?url="
        const decodedPath = decodeURIComponent(innerPath);
        return decodedPath; // Returns the clean path like: /storage/ag/originals/tag
    }

    return rawUrl;
}
// Add this to your script.js
async function importGameCollection() {
    try {
        const response = await fetch('collection.json');
        const data = await response.json();
        
        // Map through the JSON to format the data to match your existing structure
        const formattedGames = data.games.map(game => ({
            title: game.label,
            image: game.imageUrl,
            // Run the URL through our resolver!
            url: resolveGameUrl(game.url),
            categories: game.categories || []
        }));

        // Push the new games into your existing game array
        // NOTE: Change 'myGames' to whatever variable holds your game list
        myGames.push(...formattedGames);

        // Call your existing function that draws the grid
        // NOTE: Change 'renderGames()' to whatever your render function is named
        renderGames(); 

    } catch (error) {
        console.error("Failed to load collection.json:", error);
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', () => {
    importGameCollection();
});
const gameIframe = document.getElementById("gameFrame");
if (gameIframe) {
    gameIframe.addEventListener("load", () => {
        try {
            gameIframe.contentWindow.document.addEventListener("keydown", (e) => {
                if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
                
                if (e.key === panicKey) {
                    if (document.fullscreenElement) document.exitFullscreen();
                    if (gameIframe.contentWindow.document.fullscreenElement) {
                        gameIframe.contentWindow.document.exitFullscreen();
                    }
                    window.top.location.href = panicURL;
                    return;
                }

                const viewerElement = document.getElementById("viewer");
                if (viewerElement && viewerElement.style.display === "flex") {
                    const matchedControl = viewerControlsConfig.find(c => c.key === e.key.toLowerCase());
                    
                    if (matchedControl && viewerControlsVisibility[matchedControl.id]) {
                        e.preventDefault(); 
                        new Function(matchedControl.action)(); 
                    }
                }

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

function initCountdown() {
    const timerDisplay = document.getElementById("countdownTimer");
    if (!timerDisplay) return;

    const targetDate = new Date("April 1, 2026 22:26:00").getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance <= 0) {
            clearInterval(interval);
            timerDisplay.innerHTML = "IT IS LIVE!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');

        timerDisplay.innerHTML = `${days}d ${h}h ${m}m ${s}s`;
    }, 1000); 
}

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

function switchSection(targetAppId, clickedBtn) {
    if (typeof closePopups === 'function') closePopups();

    const allSections = document.querySelectorAll('.app-section');
    allSections.forEach(section => {
        section.classList.remove('active-section');
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(targetAppId);
    if (targetSection) {
        targetSection.classList.add('active-section');
        targetSection.style.display = 'block';
    }

    const allDockBtns = document.querySelectorAll('.bottom-dock .dock-btn[data-app]');
    allDockBtns.forEach(btn => {
        btn.classList.remove('active-mode');
    });

    if (clickedBtn) {
        clickedBtn.classList.add('active-mode');
    }

    if (targetAppId === 'app-settings' && typeof renderSettingsList === 'function') {
        renderSettingsList();
    }
}
// === Movable & Collapsible Dock Logic ===
let isDockCollapsed = localStorage.getItem('mathmaster_dock_collapsed') === 'true';

function initDockState() {
    const dock = document.getElementById('bottomDock');
    const container = document.getElementById('dockContainer');
    if (!dock || !container) return;

    // Restore Collapse State
    if (isDockCollapsed) dock.classList.add('collapsed');

    // Restore Position State
    const savedLeft = localStorage.getItem('mathmaster_dock_x');
    const savedTop = localStorage.getItem('mathmaster_dock_y');

    if (savedLeft && savedTop) {
        container.classList.add('dragged');
        
        // Prevent dock from spawning off-screen on reload
        let x = parseFloat(savedLeft);
        let y = parseFloat(savedTop);
        
        const dockWidth = container.offsetWidth || 300;
        const dockHeight = container.offsetHeight || 80;
        
        // Keep it strictly within screen bounds
        x = Math.max(0, Math.min(window.innerWidth - dockWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - dockHeight, y));

        container.style.left = x + 'px';
        container.style.top = y + 'px';
        container.style.bottom = 'auto'; // override CSS default
    }
}

function toggleDock() {
    const dock = document.getElementById('bottomDock');
    if (!dock) return;
    isDockCollapsed = !isDockCollapsed;
    dock.classList.toggle('collapsed', isDockCollapsed);
    localStorage.setItem('mathmaster_dock_collapsed', isDockCollapsed);
}

// Drag & Drop Physics
const dragHandle = document.getElementById('dockDragHandle');
const dockContainer = document.getElementById('dockContainer');

let isDraggingDock = false;
let dockOffsetX = 0;
let dockOffsetY = 0;

function startDrag(e) {
    if (!dockContainer) return;
    isDraggingDock = true;
    
    // Convert from CSS centering to Absolute pixel position on first drag
    if (!dockContainer.classList.contains('dragged')) {
        const rect = dockContainer.getBoundingClientRect();
        dockContainer.style.left = rect.left + 'px';
        dockContainer.style.top = rect.top + 'px';
        dockContainer.style.bottom = 'auto';
        dockContainer.classList.add('dragged');
    }

    const rect = dockContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dockOffsetX = clientX - rect.left;
    dockOffsetY = clientY - rect.top;
}

function moveDrag(e) {
    if (!isDraggingDock || !dockContainer) return;
    e.preventDefault(); // Prevents screen scrolling on mobile while dragging
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let newX = clientX - dockOffsetX;
    let newY = clientY - dockOffsetY;

    // Keep it on screen
    const rect = dockContainer.getBoundingClientRect();
    newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX));
    newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));

    dockContainer.style.left = newX + 'px';
    dockContainer.style.top = newY + 'px';
}

function endDrag() {
    if (isDraggingDock && dockContainer) {
        isDraggingDock = false;
        localStorage.setItem('mathmaster_dock_x', dockContainer.style.left.replace('px', ''));
        localStorage.setItem('mathmaster_dock_y', dockContainer.style.top.replace('px', ''));
    }
}

if (dragHandle) {
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDockState);
function launchDropdownVersion() {
    const select = document.getElementById('versionSelect');
    const url = select.value;
    
    if (!url) {
        // Just in case they click Launch without picking one
        alert("Please select a version from the dropdown first!");
        return;
    }
    
    const overlay = document.getElementById('versionRunnerOverlay');
    const frame = document.getElementById('versionFrame');
    
    // Load the older HTML file (e.g., "Versions/beta.html")
    frame.src = url;
    overlay.style.display = 'block';
}

function exitVersion() {
    const overlay = document.getElementById('versionRunnerOverlay');
    const frame = document.getElementById('versionFrame');
    
    // Hide overlay and kill the iframe process
    overlay.style.display = 'none';
    frame.src = '';
    
    // Reset the dropdown for next time
    document.getElementById('versionSelect').value = "";
}
// 1. Define the versions you have in your /Versions folder
const knownVersions = ["Beta v1.0.html", "Beta v1.1.html","Beta v1.2.html","v1.0.html","v1.1.html", "v1.2.html","Beta v2.0.html","v2.0.html","v2.1.html","v2.2.html","v2.3.html","index_christmas.html","v2.4.html","v2.5.html","v2.6.html","v2.7.html", ];

function initTimeMachine() {
    const dropdown = document.getElementById('versionDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="" disabled selected>Select a version...</option>';

    knownVersions.forEach(file => {
        // Create a pretty name (e.g., "v1.0.html" -> "Version 1.0")
        let displayName = file.replace('.html', '').replace('v', 'Version ');
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        const opt = document.createElement('option');
        opt.value = `Versions/${file}`;
        opt.textContent = displayName;
        dropdown.appendChild(opt);
    });
}

function launchSelectedVersion() {
    const url = document.getElementById('versionDropdown').value;
    if (!url) return;

    const overlay = document.getElementById('versionRunnerOverlay');
    const frame = document.getElementById('versionFrame');
    
    frame.src = url;
    overlay.style.display = 'block';
    
    // Hide main site scroll
    document.body.style.overflow = 'hidden';
}

function exitVersion() {
    const overlay = document.getElementById('versionRunnerOverlay');
    const frame = document.getElementById('versionFrame');
    
    overlay.style.display = 'none';
    frame.src = '';
    
    // Restore main site scroll
    document.body.style.overflow = 'auto';
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initTimeMachine);
function triggerV3Intro() {
    // 1. Check if they already saw it
    if (localStorage.getItem("mathmaster_v3_intro_played") === "true") {
        document.getElementById("v3Countdown").style.display = "none";
        return;
    }

    const timer = document.getElementById("v3Countdown");
    const flash = document.getElementById("introFlash");
    
    // Grab all the new v3.0 UI elements we want to animate in
    const uiElements = document.querySelectorAll('.home-widget, .home-card, .dock-btn, .header h1, .header div');
    
    // Hide them initially
    uiElements.forEach(el => el.classList.add('ui-hidden'));

    // PHASE 1: The Massive Zoom
    timer.classList.add("zoom-out-of-bounds");

    // PHASE 2: The Pop/Flash
    setTimeout(() => {
        flash.style.opacity = "1"; // White flash covers screen
        
        // Remove timer completely while screen is white
        setTimeout(() => {
            timer.style.display = "none"; 
        }, 300);

        // PHASE 3: Fade flash and Reveal New UI
        setTimeout(() => {
            flash.style.opacity = "0"; // Fade out flash
            
            let delay = 0;
            uiElements.forEach((el) => {
                setTimeout(() => {
                    el.classList.remove('ui-hidden');
                    el.classList.add('ui-reveal');
                }, delay);
                delay += 80; // Stagger each element by 80ms for a cascading effect
            });

            // Mark as watched
            localStorage.setItem("mathmaster_v3_intro_played", "true");
            
        }, 600); // Wait for flash to peak before revealing
    }, 2200); // Timing aligns with the end of the zoom CSS animation
}

function initCountdown() {
    const timerDisplay = document.getElementById("countdownTimer");
    const timerContainer = document.getElementById("v3Countdown");
    if (!timerDisplay || !timerContainer) return;

    // Check if they already watched the intro. If so, hide the timer immediately and exit.
    if (localStorage.getItem("mathmaster_v3_intro_played") === "true") {
        timerContainer.style.display = "none";
        return;
    }

    const targetDate = new Date("April 1, 2026 22:26:00").getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance <= 0) {
            clearInterval(interval);
            timerDisplay.innerHTML = "IT IS LIVE!";
            
            // Wait 1 second so they can read "IT IS LIVE" before the cinematic starts
            setTimeout(() => {
                triggerV3Intro();
            }, 1000);
            
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');

        timerDisplay.innerHTML = `${days}d ${h}h ${m}m ${s}s`;
    }, 1000); 
}
async function renderGamesGrid() {
    const gridEl = document.getElementById("gameGrid");
    if (!gridEl) return;
    gridEl.innerHTML = ""; 
    
    // Ensure we are getting the live values every time the grid renders
    const sortDropdown = document.getElementById('sortDropdown');
    const filterDropdown = document.getElementById('filterDropdown');
    const searchInput = document.getElementById('searchInput');

    const unlocked = typeof isSecretUnlocked === 'function' ? isSecretUnlocked() : false;

    // FIX: Literally hide the Proxy and Chatbot dock buttons if locked
    const proxyBtn = document.querySelector('.dock-btn[data-app="app-proxy"]');
    const chatbotBtn = document.querySelector('.dock-btn[data-app="app-chatbot"]');
    
    if (proxyBtn) proxyBtn.style.display = unlocked ? 'flex' : 'none';
    if (chatbotBtn) chatbotBtn.style.display = unlocked ? 'flex' : 'none';

    const sortMethod = sortDropdown ? sortDropdown.value : 'default';
    const filterMethod = filterDropdown ? filterDropdown.value : 'all';
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    function appendGameCard(g) {
        const c = document.createElement("div");
        c.className = "card";
        if (g.secret) c.style.border = "1px solid var(--accent-color)"; 

        c.innerHTML = `<img src="${g.logo}"><h3>${g.name}</h3>`;
        c.innerHTML += g.external 
            ? `<button class="btn" onclick="window.open('${g.path}','_blank')">Open</button>`
            : `<button class="btn" onclick="loadGame('${g.path}')">Play</button>`;
        gridEl.appendChild(c);
    }
    
    // ... [Rest of your renderGamesGrid function continues normally below] ...
    // --- TIER 1: CUSTOM GAMES (PINNED) ---
    if (typeof getCustomGames === 'function') {
        const customGames = await getCustomGames();
        if (customGames && customGames.length > 0) {
            const controllerIcon = "Versions/Assets/Pictures/Non-edited/Placeholder.png";
            for (const cg of customGames) {
                let rawName = cg.name || "Custom Game";
                const displayName = rawName.split('/').pop().replace(/\.html$/i, '').trim(); 
                
                if (searchText && !displayName.toLowerCase().includes(searchText)) continue;

                const c = document.createElement("div");
                c.className = "card";
                c.style.border = "1px dashed var(--accent-color)"; 
                c.innerHTML = `<img src="${controllerIcon}" style="object-fit: contain; padding: 10px;"><h3>${displayName}</h3>`;
                
                const playBtn = document.createElement("button");
                playBtn.className = "btn";
                playBtn.textContent = "Play";
                playBtn.onclick = () => {
                    const blobUrl = URL.createObjectURL(cg.fileData);
                    loadGame(blobUrl);
                };
                c.appendChild(playBtn);
                gridEl.appendChild(c);
            }
        }
    }

    // --- TIER 2: SECRET GAMES (PINNED) ---
    if (unlocked) {
        let secretGames = games.filter(g => g.secret);
        secretGames.forEach(g => {
            if (searchText && !g.name.toLowerCase().includes(searchText)) return;
            appendGameCard(g);
        });
    }

    // --- TIER 3: STANDARD GAMES (SORTED & FILTERED) ---
    let standardGames = games.filter(g => !g.secret);

    // 1. Text Search
    if (searchText) {
        standardGames = standardGames.filter(g => g.name.toLowerCase().includes(searchText));
    }

    // 2. Dropdown Filters
    if (filterMethod === 'dev') {
        const startIdx = games.findIndex(g => g.name === "Love Meter");
        const endIdx = games.findIndex(g => g.name === "Yohoho.io");
        if (startIdx !== -1 && endIdx !== -1) {
            const devFavPaths = games.slice(startIdx, endIdx + 1).map(g => g.path);
            standardGames = standardGames.filter(g => devFavPaths.includes(g.path));
        }
    } else if (filterMethod === 'favs') {
        const favoriteGames = JSON.parse(localStorage.getItem('mathmaster_favs')) || [];
        standardGames = standardGames.filter(g => favoriteGames.includes(g.path));
    }

    // 3. Dropdown Sorting
    if (sortMethod === 'az') {
        standardGames.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMethod === 'recent') {
        const recent = JSON.parse(localStorage.getItem('mathmaster_recent')) || [];
        standardGames.sort((a, b) => {
            let idxA = recent.indexOf(a.path);
            let idxB = recent.indexOf(b.path);
            // Push unplayed games to the bottom
            if (idxA === -1) idxA = 99999;
            if (idxB === -1) idxB = 99999;
            return idxA - idxB;
        });
    }

    // 4. Render Standard Games
    standardGames.forEach(appendGameCard);
}
// --- GUARANTEED INITIALIZATION ---
function initGameFilters() {
    const sortDropdown = document.getElementById('sortDropdown');
    const filterDropdown = document.getElementById('filterDropdown');
    const searchInput = document.getElementById('searchInput');

    // Retrieve saved preferences or fallback to default
    const savedFilter = localStorage.getItem('mathmaster_default_filter') || 'all';
    const savedSort = localStorage.getItem('mathmaster_default_sort') || 'default';

    if (filterDropdown) {
        filterDropdown.value = savedFilter;
        filterDropdown.onchange = (e) => {
            localStorage.setItem('mathmaster_default_filter', e.target.value);
            syncSettingsUI();
            renderGamesGrid();
        };
    }
    
    if (sortDropdown) {
        sortDropdown.value = savedSort;
        sortDropdown.onchange = (e) => {
            localStorage.setItem('mathmaster_default_sort', e.target.value);
            syncSettingsUI();
            renderGamesGrid();
        };
    }
    
    if (searchInput) searchInput.oninput = () => renderGamesGrid();
    
    syncSettingsUI();
}

// Ensure the settings page dropdowns match the active selections
function syncSettingsUI() {
    const filter = localStorage.getItem('mathmaster_default_filter') || 'all';
    const sort = localStorage.getItem('mathmaster_default_sort') || 'default';
    
    const setFilter = document.getElementById('settingsDefaultFilter');
    const setSort = document.getElementById('settingsDefaultSort');
    
    if (setFilter) setFilter.value = filter;
    if (setSort) setSort.value = sort;
}

// Fired when changing the dropdowns directly from the Settings Page
function saveDefaultFilters() {
    const setFilter = document.getElementById('settingsDefaultFilter');
    const setSort = document.getElementById('settingsDefaultSort');
    
    if (setFilter) localStorage.setItem('mathmaster_default_filter', setFilter.value);
    if (setSort) localStorage.setItem('mathmaster_default_sort', setSort.value);
    
    // Visually update the games page dropdowns to match
    const filterDropdown = document.getElementById('filterDropdown');
    const sortDropdown = document.getElementById('sortDropdown');
    if (filterDropdown && setFilter) filterDropdown.value = setFilter.value;
    if (sortDropdown && setSort) sortDropdown.value = setSort.value;
    
    renderGamesGrid();
}

// Fire immediately upon script load, AND on DOM Content Loaded as a fallback
initGameFilters();
document.addEventListener('DOMContentLoaded', initGameFilters);
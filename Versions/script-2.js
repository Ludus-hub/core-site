(function() {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;

    if (window._customConsoleInitialized) return;
    window._customConsoleInitialized = true;

    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
    };

    function formatArgs(args) {
        return Array.from(args).map(arg => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg, null, 2); } catch(e) { return String(arg); }
            }
            return String(arg);
        }).join(' ');
    }

    function appendLog(level, source, message) {
        const el = document.createElement('div');
        el.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        el.style.padding = '4px 0';
        el.style.wordBreak = 'break-word';
        el.style.display = 'flex';
        el.style.gap = '12px';
        el.style.fontFamily = 'monospace';

        let color = '#fff';
        if (level === 'error') color = '#ff453a';
        else if (level === 'warn') color = '#ffd60a';
        else if (level === 'info') color = '#00aeff';
        el.style.color = color;

        const sourceSpan = document.createElement('span');
        sourceSpan.style.opacity = '0.5';
        sourceSpan.style.minWidth = '80px';
        sourceSpan.style.flexShrink = '0';
        sourceSpan.textContent = source;

        const msgSpan = document.createElement('span');
        msgSpan.style.whiteSpace = 'pre-wrap';
        msgSpan.textContent = message;

        el.appendChild(sourceSpan);
        el.appendChild(msgSpan);
        consoleOutput.appendChild(el);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function getSourceLine() {
        try { throw new Error(); } catch(e) {
            const stack = e.stack.split('\n');
            if (stack[3]) {
                const match = stack[3].match(/\/([^\/]+\.(?:js|html):\d+)/);
                if (match) return match[1];
            }
        }
        return 'app';
    }

    ['log', 'warn', 'error', 'info'].forEach(method => {
        console[method] = function(...args) {
            originalConsole[method].apply(console, args);
            appendLog(method, getSourceLine(), formatArgs(args));
        };
    });

    window.addEventListener('error', function(e) {
        if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG')) {
            const src = e.target.src || e.target.href;
            const file = src ? src.split('/').pop() : e.target.tagName.toLowerCase();
            appendLog('error', `${file}:1`, `Failed to load resource: the server responded with a status of 404 (Not Found)`);
        } else {
            const source = e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : 'window';
            appendLog('error', source, e.message);
        }
    }, true); 

    window.addEventListener('unhandledrejection', function(e) {
        const reason = e.reason;
        const msg = reason instanceof Error ? reason.stack : String(reason);
        appendLog('error', 'Uncaught (in promise)', msg);
    });

    window.pipeLogToParent = function(level, source, message) {
        appendLog(level, `[iframe] ${source}`, message);
    };

    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : 'unknown');
        try {
            const res = await origFetch(...args);
            if (!res.ok) appendLog('error', 'NETWORK', `GET ${url} net::ERR_FAILED ${res.status}`);
            return res;
        } catch (err) {
            appendLog('error', 'NETWORK', `Access to fetch at '${url}' has been blocked by CORS policy or net::ERR_FAILED`);
            throw err;
        }
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('error', () => { appendLog('error', 'NETWORK', `${method} ${url} net::ERR_FAILED (CORS or Network Error)`); });
        this.addEventListener('load', () => { if(this.status >= 400) appendLog('error', 'NETWORK', `${method} ${url} ${this.status} (${this.statusText})`); });
        origOpen.apply(this, arguments);
    };
})();

// === GLOBAL VARIABLES (Hoisted to prevent crashes) ===
let currentSrc = ""; // MUST be defined before UI tries to render!
const frame = document.getElementById("gameFrame");
const viewer = document.getElementById("viewer");
const grid = document.getElementById("gameGrid");


// === Unified Settings & Canvas System ===
let viewerControlsConfig = JSON.parse(localStorage.getItem('mathmaster_controls')) || [
    { id: 'dashboard', label: '← Dashboard', action: 'goHome()', key: 'h' },
    { id: 'reload', label: 'Reload', action: 'reloadGame()', key: 'r' },
    { id: 'fullscreen', label: 'Fullscreen', action: 'toggleFullscreen()', key: 'f' },
    { id: 'newtab', label: 'Open New Tab', action: 'openInNewTab()', key: 'n' }
];

let viewerControlsVisibility = JSON.parse(localStorage.getItem('mathmaster_controls_vis')) || {
    'dashboard': true, 'reload': true, 'fullscreen': true, 'newtab': true
};

let favControl = viewerControlsConfig.find(c => c.id === 'favorite');
if (!favControl) {
    viewerControlsConfig.push({ id: 'favorite', label: 'Favorite', action: 'toggleFavorite()', key: 'v' });
} else if (favControl.label === '⭐ Favorite') {
    favControl.label = 'Favorite';
    localStorage.setItem('mathmaster_controls', JSON.stringify(viewerControlsConfig));
}

if (viewerControlsVisibility['favorite'] === undefined) {
    viewerControlsVisibility['favorite'] = true;
    localStorage.setItem('mathmaster_controls_vis', JSON.stringify(viewerControlsVisibility));
}

function toggleFavorite() {
    if (!currentSrc) return;
    let favoriteGames = JSON.parse(localStorage.getItem('mathmaster_favs')) || [];

    if (favoriteGames.includes(currentSrc)) {
        favoriteGames = favoriteGames.filter(src => src !== currentSrc);
    } else {
        favoriteGames.push(currentSrc);
    }

    localStorage.setItem('mathmaster_favs', JSON.stringify(favoriteGames));
    renderViewerButtons(); 
    
    const filterDropdown = document.getElementById('filterDropdown');
    if (filterDropdown && filterDropdown.value === 'favs') {
        if (typeof renderGamesGrid === 'function') renderGamesGrid();
    }
}

// SVG icons for each viewer control — matched by id
const _VIEWER_ICONS = {
    dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    reload:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    fullscreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
    newtab:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
};

// These button ids go in the top-bar (quickControlsContainer); all others go in the dropdown
const _QUICK_CTRL_IDS = ['dashboard', 'fullscreen'];

function _makeViewerBtn(ctrl, index, isFav) {
    const btn = document.createElement('button');
    btn.className = `viewer-btn-spot spot-${index}`;
    btn.setAttribute('onclick', ctrl.action);
    btn.title = ctrl.label;
    btn.dataset.iconized = 'true'; // prevent the MutationObserver from re-processing
    // Icon button shared styles
    Object.assign(btn.style, {
        padding: '8px', borderRadius: '8px', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', minWidth: '36px',
        flexShrink: '0', margin: '0',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', top: 'auto', bottom: 'auto',
        left: 'auto', right: 'auto', transform: 'none',
        cursor: 'pointer',
    });

    if (ctrl.id === 'favorite') {
        const filled   = isFav ? '#FFD700' : 'none';
        const stroked  = isFav ? '#FFD700' : 'white';
        btn.innerHTML  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${filled}" stroke="${stroked}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        btn.title = isFav ? 'Unfavorite' : 'Favorite';
    } else {
        btn.innerHTML = _VIEWER_ICONS[ctrl.id] || `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 4.6l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15z"></path></svg>`;
    }
    return btn;
}

function renderViewerButtons() {
    const container      = document.getElementById('viewerControlsContainer');
    const quickContainer = document.getElementById('quickControlsContainer');
    if (!container) return;

    // Wipe both zones cleanly — no stale buttons, no duplicates
    container.innerHTML = '';
    if (quickContainer) quickContainer.innerHTML = '';

    const favoriteGames = JSON.parse(localStorage.getItem('mathmaster_favs')) || [];
    const isFav = favoriteGames.includes(currentSrc);

    viewerControlsConfig.forEach((ctrl, index) => {
        if (!viewerControlsVisibility[ctrl.id]) return;
        const btn = _makeViewerBtn(ctrl, index, isFav);
        if (_QUICK_CTRL_IDS.includes(ctrl.id) && quickContainer) {
            quickContainer.appendChild(btn);
        } else {
            container.appendChild(btn);
        }
    });
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

async function exportSave() {
    const saveData = {
        meta: { date: new Date().toISOString(), version: "2.5-FullBackup" },
        storage: { local: { ...localStorage }, session: { ...sessionStorage }, cookies: document.cookie },
        indexedDB: {} 
    };

    if (window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        saveData.meta.dbCount = dbs.length;
    }

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
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
                    data.storage.cookies.split(";").forEach(cookie => { document.cookie = cookie.trim() + ";path=/;max-age=31536000"; });
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

// 1. Define the debounce helper
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 2. Apply it to the search input
if (searchInput) {
    searchInput.addEventListener('input', debounce(e => filterGames(e.target.value), 250));
}

function filterGames(query) {
  const q = query.toLowerCase().trim();
  const cards = [...document.querySelectorAll('#gameGrid .card')];
  if (suggestionsEl) suggestionsEl.innerHTML = "";

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
    })).sort((a, b) => a.score - b.score).slice(0, 3);

    if (suggestionsEl) {
        suggestionsEl.innerHTML = "Did you mean:<br>" + guesses.map(g => `<b>${g.name}</b>`).join("<br>");
    }

    const best = guesses.map(g => g.name.toLowerCase());
    visible = cards.filter(c => best.includes(c.querySelector('h3').textContent.toLowerCase()));
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

const cloudOverwriteToggle = document.getElementById("settingsCloudOverwriteToggle");
let allowCloudOverwrite = localStorage.getItem("mathmaster_cloud_overwrite") !== "false";

if (cloudOverwriteToggle) {
    cloudOverwriteToggle.checked = allowCloudOverwrite;
    cloudOverwriteToggle.addEventListener('change', (e) => {
        allowCloudOverwrite = e.target.checked;
        localStorage.setItem("mathmaster_cloud_overwrite", allowCloudOverwrite);
    });
}

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

// Patch script injected before ytgame.js / PixiJS in srcdoc games.
// Fixes: (1) /undefined/ in CDN fetch/XHR/script-tag paths, (2) WebGL crash via forceCanvas.
const GAME_PATCH_SCRIPT = `<script>
(function(){
  var LOCALE = 'en';
  var UNDEF_RE = /\\/undefined\\//g;

  // --- Fix 1a: Patch fetch + XHR (catches most requests) ---
  var _fetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string') url = url.replace(UNDEF_RE, '/' + LOCALE + '/');
    return _fetch.call(this, url, opts);
  };
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url) {
    if (typeof url === 'string') arguments[1] = url.replace(UNDEF_RE, '/' + LOCALE + '/');
    return _open.apply(this, arguments);
  };

  // --- Fix 1b: Patch dynamically created <script>/<link>/<img> src/href ---
  // ytgame.js loads its home page via an injected <script src> tag which bypasses fetch/XHR.
  var _createElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = _createElement(tag);
    var t = (tag || '').toLowerCase();
    if (t === 'script' || t === 'link' || t === 'img') {
      ['src', 'href'].forEach(function(attr) {
        var proto = Object.getPrototypeOf(el);
        // Walk prototype chain to find the real descriptor
        var desc;
        var p = proto;
        while (p && !desc) { desc = Object.getOwnPropertyDescriptor(p, attr); p = Object.getPrototypeOf(p); }
        if (!desc || !desc.set) return;
        Object.defineProperty(el, attr, {
          get: desc.get ? desc.get.bind(el) : undefined,
          set: function(v) {
            if (typeof v === 'string') v = v.replace(UNDEF_RE, '/' + LOCALE + '/');
            desc.set.call(el, v);
          },
          configurable: true
        });
      });
    }
    return el;
  };

  // --- Fix 1c: Synthetic ytgame locale dispatch ---
  // ytgame.js waits for a postMessage from YouTube with {type:'ytgame:set_data', hl:'en'}.
  // That message never arrives in our iframe, so hl stays undefined.
  // We dispatch it after a tick (once ytgame.js has registered its 'message' listener).
  setTimeout(function() {
    var payload = JSON.stringify({ type: 'ytgame:set_data', hl: LOCALE, countryCode: 'US' });
    window.dispatchEvent(new MessageEvent('message', { data: payload, origin: window.location.origin }));
    // Some ytgame versions parse the object directly (not JSON-stringified)
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'ytgame:set_data', hl: LOCALE, countryCode: 'US' }, origin: window.location.origin }));
  }, 0);

  // --- Fix 2: Force PixiJS canvas renderer (WebGL unavailable in sandboxed iframe) ---
  var _PIXI;
  Object.defineProperty(window, 'PIXI', {
    get: function() { return _PIXI; },
    set: function(v) {
      _PIXI = v;
      if (!v || !v.Application) return;
      var OrigApp = v.Application;
      v.Application = function(opts) {
        opts = Object.assign({}, opts || {}, { forceCanvas: true });
        return new OrigApp(opts);
      };
      Object.setPrototypeOf(v.Application, OrigApp);
      v.Application.prototype = OrigApp.prototype;
    },
    configurable: true
  });
})();
<\/script>`;

async function loadGame(p) {
    currentSrc = p;
    // Save scroll position so we can restore it when returning to the game grid
    try { localStorage.setItem('mathmaster_scroll_pos', window.scrollY); } catch(e) {}

    grid.style.display = "none"; viewer.style.display = "flex";
    document.querySelector('.dock-container').style.transform = "translate(-50%, 200%)"; 
    window.scrollTo({ top: viewer.offsetTop - 20, behavior: "smooth" });

    let recentlyPlayed = JSON.parse(localStorage.getItem('mathmaster_recent')) || [];
    recentlyPlayed = recentlyPlayed.filter(src => src !== p);
    recentlyPlayed.unshift(p); 
    if (recentlyPlayed.length > 50) recentlyPlayed.pop(); 
    localStorage.setItem('mathmaster_recent', JSON.stringify(recentlyPlayed));

    // Attempt srcdoc injection for ytgame/Pixi games so patches run before those libs.
    // Falls back to direct src= if the file can't be fetched (e.g. cross-origin blob URLs).
    let usedSrcdoc = false;
    try {
        const resp = await fetch(p);
        if (resp.ok) {
            let html = await resp.text();
            if (html.includes('ytgame.js') || html.includes('pixi') || html.includes('PIXI')) {
                html = html.replace(/(<head[^>]*>)/i, '$1' + GAME_PATCH_SCRIPT);
                frame.removeAttribute('src');
                frame.srcdoc = html;
                usedSrcdoc = true;
            }
        }
    } catch(e) { /* fetch failed — fall through to direct src */ }

    if (!usedSrcdoc) {
        frame.removeAttribute('srcdoc');
        frame.src = p;
    }

    renderViewerButtons(); 
}

function goHome() {
    if (document.fullscreenElement) document.exitFullscreen();
    viewer.style.display = "none";
    grid.style.display = "grid";
    frame.src = "";
    document.querySelector('.dock-container').style.transform = "translateX(-50%)";
    // Restore the scroll position saved when the user opened this game
    try {
        const saved = localStorage.getItem('mathmaster_scroll_pos');
        if (saved !== null) {
            requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)));
        }
    } catch(e) {}
}

function isSecretUnlocked() {
    const deviceId = localStorage.getItem("mathmaster_device_id");
    const list = JSON.parse(localStorage.getItem("mathmaster_registered_devices") || "[]");
    const sessionUnlocked = sessionStorage.getItem("mathmaster_session_unlocked") === "true";
    return sessionUnlocked || (deviceId && list.includes(deviceId));
}

function getCustomGames() {
    return new Promise((resolve) => {
        if (!window.indexedDB) { resolve([]); return; }
        try {
            const request = indexedDB.open("GlassExplorerDB", 1);
            request.onupgradeneeded = () => resolve([]); 
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("files")) { resolve([]); return; }
                const transaction = db.transaction(["files"], "readonly");
                const store = transaction.objectStore("files");
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => {
                    const files = getAllRequest.result || [];
                    resolve(files.filter(f => f.path && f.path.startsWith("Games/") && f.name.endsWith(".html")));
                };
                getAllRequest.onerror = () => resolve([]);
            };
            request.onerror = () => resolve([]);
        } catch (error) { resolve([]); }
    });
}

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
    if (panel) panel.style.display = (panel.style.display === "block") ? "none" : "block";
}

function reloadGame() {
    if (currentSrc) {
        loadGame(currentSrc); // re-runs fetch+srcdoc injection
    } else {
        const gameFrame = document.getElementById("gameFrame");
        if (gameFrame && gameFrame.src) gameFrame.src = gameFrame.src;
    }
}

function toggleFullscreen() {
    const viewerElement = document.getElementById("viewer");
    if (!document.fullscreenElement) viewerElement.requestFullscreen().catch(err => console.error(err));
    else document.exitFullscreen();
}

function openInNewTab() {
    // Resolve to absolute URL so it works when hosted on any domain
    if (currentSrc) window.open(new URL(currentSrc, window.location.href).href, '_blank');
}

// ==============================================
// === PASTE YOUR ENTIRE GAMES ARRAY HERE! ======
// ==============================================
const games = [
 
  {name:"Your Mom's House", path:"Assets/Game Data/Five Nights at Epsteins.html", logo:"Assets/Pictures/Non-edited/FNAE.jpg", secret: true},
  {name:"Your Mom's House 2", path:"Assets/Game Data/Five Nights at Last Breath.html", logo:"Assets/Pictures/Non-edited/Mom21-n.jpg", secret: true},
  {name:"Your Mom's Basics", path:"./Assets/Game Data/751.html", logo:"./Assets/Pictures/Non-edited/Basics-n.webp", secret: true},
  {name:"Love Meter", path:"Assets/Game Data/love_meter.html", logo:"Assets/Pictures/Non-edited/LoveMeter-n.png"},
  {name:"12 Mini Battles", path:"Assets/Game Data/12 Mini Battles.html", logo:"Assets/Pictures/Non-edited/12MiniBattles-n.png"},
  {name:"1v1.lol", path:"Assets/Game Data/1v1lol/index.html", logo:"Assets/Pictures/Non-edited/1v1.lol-n.png"},
  {name:"2048", path:"Assets/Game Data/2048/index.html", logo:"Assets/Pictures/Non-edited/2048-n.png"},
  {name:"Among Us", path:"Assets/Game Data/among-us/index.html", logo:"Assets/Pictures/Non-edited/AmongUs-n.png"},
  {name:"Arthur's Nightmare", path:"Assets/Game Data/Arthur Nightmare.html", logo:"Assets/Pictures/Non-edited/Arthur-Nightmare-n.webp"},
  {name:"Backrooms", path:"Assets/Game Data/backrooms/index.html", logo:"Assets/Pictures/Non-edited/Backrooms-n.png"},
  {name:"Brawl Stars", path:"Assets/Game Data/Brawl Simulator 3D.html", logo:"Assets/Pictures/Non-edited/Brawl-n.png"},
  {name:"Bad Ice Cream", path:"Assets/Game Data/bad-ice-cream/index.html", logo:"Assets/Pictures/Non-edited/BadIceCream-n.png"},
  {name:"Baldis Basics", path:"Assets/Game Data/baldis-basics/index.html", logo:"Assets/Pictures/Non-edited/BaldiBasics-n.png"},
  {name:"Baseball Bros", path:"Assets/Game Data/Baseball Bros.html", logo:"Assets/Pictures/Non-edited/Baseball-n.png"},
  {name: "Basket Bros", path: "Assets/Game Data/Basket Bros.html", logo: "Assets/Pictures/Non-edited/Basket-n.png"},
  {name:"Basketball Stars", path:"Assets/Game Data/basketball-stars/index.html", logo:"Assets/Pictures/Non-edited/BasketballStars-n.png"},
  {name:"Block Blast", path:"Assets/Game Data/Block Blast.html", logo:"Assets/Pictures/Non-edited/BlockBlast-n.png"},
  {name:"Bridge Race", path:"Assets/Game Data/Bridge Race.html", logo:"Assets/Pictures/Non-edited/BridgeRace-n.png"},
  {name:"Candy Crush", path: "Assets/Game Data/Candy Crush.html", logo: "Assets/Pictures/Non-edited/CandyCrush-n.png"},
  {name:"Cluster Rush", path:"Assets/Game Data/cluster-rush/index.html", logo:"Assets/Pictures/Non-edited/ClusterTruck-n.png"},
  {name:"Cookie Clicker", path:"Assets/Game Data/cookieclicker/index.html", logo:"Assets/Pictures/Non-edited/CookieClicker-n.ico", external:true},
  {name:"Coreball",path:"Assets/Game Data/Coreball.html", logo:"Assets/Pictures/Non-edited/Core-n.png"},
  {name:"Crossyroad", path:"Assets/Game Data/crossyroad/index.html", logo:"Assets/Pictures/Non-edited/CrossyRoad-n.png"},
  {name:"Drift Hunters",path:"Assets/Game Data/Drift Hunters.html", logo:"Assets/Pictures/Non-edited/Drift-Hunters-n.png"},
  {name:"Drive Mad", path:"Assets/Game Data/drive-mad/index.html", logo:"Assets/Pictures/Non-edited/DriveMad-n.jpg"},
  {name:"Duck Life 4", path:"Assets/Game Data/ducklife4/index.html", logo:"Assets/Pictures/Non-edited/DuckLife4-n.jpg"},
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
  {name:"Football Bros", path:"Assets/Game Data/Football Bros (1).html", logo:"Assets/Pictures/Non-edited/Football-n.png"},
  {name:"Granny", path:"Assets/Game Data/Granny.html", logo:"Assets/Pictures/Non-edited/Granny-n.png"},
  {name:"Granny 2", path:"Assets/Game Data/Granny 2.html", logo:"Assets/Pictures/Non-edited/Granny-2-n.png"},
  {name:"Granny 3", path:"Assets/Game Data/Granny 3.html", logo:"Assets/Pictures/Non-edited/Granny-3-n.png"},
  {name:"Hill Climb Racing Lite", path:"Assets/Game Data/Hill Climb Racing Lite.html", logo:"Assets/Pictures/Non-edited/Hill-n.png"},
  {name:"Idle Lumber Inc.", path:"Assets/Game Data/Idle Lumber Inc.html", logo:"Assets/Pictures/Non-edited/Lumber-n.png"},
  {name:"Line Rider", path:"Assets/Game Data/Line Rider.html", logo: "Assets/Pictures/Non-edited/Line-Rider-n.jpg"},
  {name:"Minecraft", path:"Assets/Game Data/Minecraft 1.8.8.html", logo:"Assets/Pictures/Non-edited/Minecraft-n.png",external:true},
  {name:"Moto X3M 2", path:"Assets/Game Data/motox3m2/index.html", logo:"Assets/Pictures/Non-edited/Motox3m2-n.png"},
  {name:"Moto X3M 3", path:"Assets/Game Data/Moto X3M 3.html", logo:"Assets/Pictures/Non-edited/Motox3m3-n.png"},
  {name:"Moto X3M Pool Party", path:"Assets/Game Data/motox3m-pool/index.html", logo:"Assets/Pictures/Non-edited/Motox3mPool-n.jpg"},
  {name:"Moto X3M Spooky", path:"Assets/Game Data/motox3m-spooky/index.html", logo:"Assets/Pictures/Non-edited/Motox3mSpooky-n.jpeg"},
  {name:"Moto X3M Winter", path:"Assets/Game Data/motox3mwinter/index.html", logo:"Assets/Pictures/Non-edited/Motox3mWinter-n.webp"},
  {name:"Ovo 2", path:"Assets/Game Data/OvO 2.html", logo:"Assets/Pictures/Non-edited/OvO-2-n.webp"},
  {name:"Paper io 2", path:"Assets/Game Data/paperio2/index.html", logo:"Assets/Pictures/Non-edited/Paperio2-n.png"},
  {name:"Plants Vs Zombies", path:"Assets/Game Data/Plants vs Zombies.html", logo:"Assets/Pictures/Non-edited/PlantsVsZombies-n.png"},
  {name: "Poly Track", path: "Assets/Game Data/poly-track/index.html", logo: "Assets/Pictures/Non-edited/Poly-n.png"},
  {name:"Red Ball 4", path:"Assets/Game Data/Red Ball 4.html", logo:"Assets/Pictures/Non-edited/RedBall4-n.png"},
  {name:"Red Ball 4 Vol. 2", path:"Assets/Game Data/Red Ball 4 Vol. 2.html", logo:"Assets/Pictures/Non-edited/RedBall4-2-n.png"},
  {name:"Red Ball 4 Vol. 3", path:"Assets/Game Data/Red Ball 4 Vol. 3.html", logo:"Assets/Pictures/Non-edited/RedBall4-3-n.png"},
  {name:"Retro Bowl", path:"Assets/Game Data/bowl/index.html", logo:"Assets/Pictures/Non-edited/Retrobowl-n.png"},
  {name:"Riddle School", path:"Assets/Game Data/Riddle School.html", logo:"Assets/Pictures/Non-edited/Riddle-n.png"},
  {name:"Riddle School 2", path:"Assets/Game Data/Riddle School 2.html", logo:"Assets/Pictures/Non-edited/Riddle-2-n.png"},
  {name:"Riddle School 3", path:"Assets/Game Data/Riddle School 3.html", logo:"Assets/Pictures/Non-edited/Riddle-3-n.png"},
  {name:"Riddle School 4", path:"Assets/Game Data/Riddle School 4.html", logo:"Assets/Pictures/Non-edited/Riddle-4-n.png"},
  {name:"Riddle School 5", path:"Assets/Game Data/Riddle School 5.html", logo:"Assets/Pictures/Non-edited/Riddle-5-n.png"},
  {name:"Riddle School 6", path:"Assets/Game Data/Riddle Transfer.html", logo:"Assets/Pictures/Non-edited/Riddle-6-n.png"},
  {name:"Riddle School 7", path:"Assets/Game Data/Riddle Transfer 2.html", logo:"Assets/Pictures/Non-edited/Riddle-7-n.png"},
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
  {name:"Slope 2", path:"Assets/Game Data/Slope 2.html", logo:"Assets/Pictures/Non-edited/Slope2-n.png"},
  {name:"Solar Smash", path:"Assets/Game Data/Solar Smash.html", logo:"Assets/Pictures/Non-edited/SolarSmash-n.png"},
  {name:"Station Saturn", path:"Assets/Game Data/Station Saturn.html", logo:"Assets/Pictures/Non-edited/StationSaturn-n.png"},
  {name:"Steal A Brainrot", path:"Assets/Game Data/Steal A Brainrot.html", logo:"Assets/Pictures/Non-edited/StealABrainrot-n.png"},
  {name:"Subway Surfers", path:"Assets/Game Data/subway-surfers/index.html", logo:"Assets/Pictures/Non-edited/SubwaySurfers-n.jpg"},
  {name:"Stickman Hook", path:"Assets/Game Data/stickman-hook/index.html", logo:"Assets/Pictures/Non-edited/Stickman-n.png"},
  {name:"Slow Roads", path:"Assets/Game Data/Slowroads.html", logo:"Assets/Pictures/Non-edited/Slow-Roads-n.png"},
  {name:"Space Waves", path:"Assets/Game Data/Space Waves.html", logo:"Assets/Pictures/Non-edited/Space-Waves-n.png"},
  {name:"Temple Run 2", path:"Assets/Game Data/Temple Run 2.html", logo:"Assets/Pictures/Non-edited/TempleRun2-n.png"},
  {name:"Tunnel Rush", path: "Assets/Game Data/tunnelrush/index.html", logo: "Assets/Pictures/Non-edited/TunnelRush-n.jpg"},
  {name:"The Impossible Quiz", path:"Assets/Game Data/the-impossible-quiz/index.html", logo:"Assets/Pictures/Non-edited/ImpossibleQuiz-n.webp"},
  {name:"The Man In The Window", path:"Assets/Game Data/The Man In The Window.html", logo:"Assets/Pictures/Non-edited/ManFromWindow-n.png"},
  {name:"Tomb of the Mask", path:"Assets/Game Data/Tomb Of The Mask.html", logo:"Assets/Pictures/Non-edited/TombOfMask-n.png"},
  {name:"Volleyball Random", path:"Assets/Game Data/Volley-Random/index.html", logo:"Assets/Pictures/Non-edited/VolleyRandom-n.webp"},
  {name:"Wrestle Bros", path:"Assets/Game Data/wrestle-bros-io-main/wrestle-bros-io-main/index.html", logo:"Assets/Pictures/Non-edited/wrestle-n.jpg"},
  {name:"Wordle", path:"Assets/Game Data/wordle/index.html", logo:"Assets/Pictures/Non-edited/Wordle-n.webp"},
  {name:"Worlds Hardest Game", path:"Assets/Game Data/worlds-hardest-game/index.html", logo:"Assets/Pictures/Non-edited/WorldHardestGame-n.jpeg"},
  {name:"Yohoho.io", path:"Assets/Game Data/YoHoHo.io-main/index.html", logo: "Assets/Pictures/Non-edited/yohoho-n.jpg"},
  {name:"Bowmasters", path:"./Assets/Game Data/0.html", logo:"./Assets/Pictures/Non-edited/0.png", external:true},
  {name:"OvO", path:"./Assets/Game Data/1-fde.html", logo:"./Assets/Pictures/Non-edited/1.png"},
  {name:"OvO 3 Dimensions", path:"./Assets/Game Data/3.html", logo:"./Assets/Pictures/Non-edited/3.png"},
  {name:"Gladihoppers", path:"./Assets/Game Data/4.html", logo:"./Assets/Pictures/Non-edited/4.png"},
  {name:"Ice Dodo", path:"./Assets/Game Data/5.html", logo:"./Assets/Pictures/Non-edited/5.png"},
  {name:"Jetpack Joyride", path:"./Assets/Game Data/7.html", logo:"./Assets/Pictures/Non-edited/7.png"},
  {name:"Friday Night Funkin", path:"./Assets/Game Data/8-wow.html", logo:"./Assets/Pictures/Non-edited/8.png"},
  {name:"Sprunki", path:"./Assets/Game Data/9.html", logo:"./Assets/Pictures/Non-edited/9.png"},
  {name:"Attack Hole", path:"./Assets/Game Data/13.html", logo:"./Assets/Pictures/Non-edited/13.png", external:true},
  {name:"Color Water Sort 3D", path:"./Assets/Game Data/15.html", logo:"./Assets/Pictures/Non-edited/15.png"},
  {name:"Hide N Seek", path:"./Assets/Game Data/16.html", logo:"./Assets/Pictures/Non-edited/16.png"},
  {name:"Magic Tiles 3", path:"./Assets/Game Data/17.html", logo:"./Assets/Pictures/Non-edited/17.png"},
  {name:"Stacky Dash", path:"./Assets/Game Data/18.html", logo:"./Assets/Pictures/Non-edited/18.png"},
  {name:"Supreme Duelist", path:"./Assets/Game Data/19.html", logo:"./Assets/Pictures/Non-edited/19.png"},
  {name:"Tall Man Run", path:"./Assets/Game Data/20a.html", logo:"./Assets/Pictures/Non-edited/20.png"},
  {name:"Turbo Stars", path:"./Assets/Game Data/21.html", logo:"./Assets/Pictures/Non-edited/21.png"},
  {name:"Mob Control HTML5", path:"./Assets/Game Data/22.html", logo:"./Assets/Pictures/Non-edited/22.png"},
  {name:"Pou", path:"./Assets/Game Data/23.html", logo:"./Assets/Pictures/Non-edited/23.png"},
  {name:"Crossy Road", path:"./Assets/Game Data/24.html", logo:"./Assets/Pictures/Non-edited/24.png"},
  {name:"Basket Battle", path:"./Assets/Game Data/25.html", logo:"./Assets/Pictures/Non-edited/25.png"},
  {name:"Amaze", path:"./Assets/Game Data/26.html", logo:"./Assets/Pictures/Non-edited/26.png", external:true},
  {name:"Geometry Dash Lite (REMAKE)", path:"./Assets/Game Data/27-f.html", logo:"./Assets/Pictures/Non-edited/27.png"},
  {name:"Basketball Frvr", path:"./Assets/Game Data/28.html", logo:"./Assets/Pictures/Non-edited/28.png"},
  {name:"Bazooka Boy", path:"./Assets/Game Data/29.html", logo:"./Assets/Pictures/Non-edited/29.png", external:true},
  {name:"Bottle Jump 3D", path:"./Assets/Game Data/30.html", logo:"./Assets/Pictures/Non-edited/30.png", external:true},
  {name:"Color Match", path:"./Assets/Game Data/31.html", logo:"./Assets/Pictures/Non-edited/31.png"},
  {name:"Dig Deep", path:"./Assets/Game Data/32.html", logo:"./Assets/Pictures/Non-edited/32.png"},
  {name:"Retro Bowl College", path:"./Assets/Game Data/34-fixed.html", logo:"./Assets/Pictures/Non-edited/34.png"},
  {name:"Monster Tracks", path:"./Assets/Game Data/36.html", logo:"./Assets/Pictures/Non-edited/36.png"},
  {name:"Gobble", path:"./Assets/Game Data/37.html", logo:"./Assets/Pictures/Non-edited/37.png"},
  {name:"Road of Fury", path:"./Assets/Game Data/42.html", logo:"./Assets/Pictures/Non-edited/42.png"},
  {name:"Driven Wild", path:"./Assets/Game Data/43.html", logo:"./Assets/Pictures/Non-edited/43.png"},
  {name:"Ragdoll Hit", path:"./Assets/Game Data/44-fix.html", logo:"./Assets/Pictures/Non-edited/44.png"},
  {name:"Vex 1", path:"./Assets/Game Data/45.html", logo:"./Assets/Pictures/Non-edited/45.png"},
  {name:"Vex 2", path:"./Assets/Game Data/46.html", logo:"./Assets/Pictures/Non-edited/46.png"},
  {name:"Vex 3", path:"./Assets/Game Data/47.html", logo:"./Assets/Pictures/Non-edited/47.png"},
  {name:"Vex 3 XMAS", path:"./Assets/Game Data/48.html", logo:"./Assets/Pictures/Non-edited/48.png"},
  {name:"Vex 4", path:"./Assets/Game Data/49.html", logo:"./Assets/Pictures/Non-edited/49.png"},
  {name:"Vex 5", path:"./Assets/Game Data/50.html", logo:"./Assets/Pictures/Non-edited/50.png"},
  {name:"Vex 6", path:"./Assets/Game Data/51.html", logo:"./Assets/Pictures/Non-edited/51.png"},
  {name:"Vex 7", path:"./Assets/Game Data/52.html", logo:"./Assets/Pictures/Non-edited/52.png"},
  {name:"Vex 8", path:"./Assets/Game Data/53.html", logo:"./Assets/Pictures/Non-edited/53.png"},
  {name:"Vex Challenges", path:"./Assets/Game Data/54.html", logo:"./Assets/Pictures/Non-edited/54.png"},
  {name:"Vex X3M", path:"./Assets/Game Data/55.html", logo:"./Assets/Pictures/Non-edited/55.png"},
  {name:"Vex X3M 2", path:"./Assets/Game Data/56.html", logo:"./Assets/Pictures/Non-edited/56.png"},
  {name:"A Dance of Fire and Ice", path:"./Assets/Game Data/59.html", logo:"./Assets/Pictures/Non-edited/59.png"},
  {name:"Achievement Unlocked", path:"./Assets/Game Data/60.html", logo:"./Assets/Pictures/Non-edited/60.png"},
  {name:"Achievement Unlocked 2", path:"./Assets/Game Data/61.html", logo:"./Assets/Pictures/Non-edited/61.png"},
  {name:"Achievement Unlocked 3", path:"./Assets/Game Data/62.html", logo:"./Assets/Pictures/Non-edited/62.png"},
  
  {name:"Baldi's Basics", path:"./Assets/Game Data/65-fixed.html", logo:"./Assets/Pictures/Non-edited/65.png"},
  {name:"Basket Random", path:"./Assets/Game Data/66.html", logo:"./Assets/Pictures/Non-edited/66.png"},
 
  {name:"Big NEON Tower Tiny Square", path:"./Assets/Game Data/68.html", logo:"./Assets/Pictures/Non-edited/68.png"},
  {name:"Big ICE Tower Tiny Square", path:"./Assets/Game Data/69.html", logo:"./Assets/Pictures/Non-edited/69.png"},
  {name:"BitLife", path:"./Assets/Game Data/70.html", logo:"./Assets/Pictures/Non-edited/70.png"},
 
  {name:"Bloons TD 2", path:"./Assets/Game Data/72.html", logo:"./Assets/Pictures/Non-edited/72.png"},
 
  {name:"Bloons TD 4", path:"./Assets/Game Data/74.html", logo:"./Assets/Pictures/Non-edited/74.png"},
  {name:"Bloons TD 5", path:"./Assets/Game Data/75-fix.html", logo:"./Assets/Pictures/Non-edited/75.png"},
  {name:"Bob The Robber 2", path:"./Assets/Game Data/76-fix.html", logo:"./Assets/Pictures/Non-edited/76.png"},
  {name:"Boxing Random", path:"./Assets/Game Data/77.html", logo:"./Assets/Pictures/Non-edited/77.png"},
  {name:"Burrito Bison: Launcha Libre", path:"./Assets/Game Data/78.html", logo:"./Assets/Pictures/Non-edited/78.png"},
  {name:"Cannon Basketball", path:"./Assets/Game Data/79.html", logo:"./Assets/Pictures/Non-edited/79.png"},
  {name:"Cannon Basketball 2", path:"./Assets/Game Data/80.html", logo:"./Assets/Pictures/Non-edited/80.png"},
  {name:"Cubefield", path:"./Assets/Game Data/84.html", logo:"./Assets/Pictures/Non-edited/84.png"},
  {name:"Cut the Rope", path:"./Assets/Game Data/85-f.html", logo:"./Assets/Pictures/Non-edited/85.png"},
  {name:"Draw Climber", path:"./Assets/Game Data/86.html", logo:"./Assets/Pictures/Non-edited/86.png"},
  {name:"Emulator.JS", path:"./Assets/Game Data/87.html", logo:"./Assets/Pictures/Non-edited/87.png"},
  {name:"Fireboy and Watergirl 2", path:"./Assets/Game Data/88.html", logo:"./Assets/Pictures/Non-edited/88.png"},
  {name:"Fireboy and Watergirl 3", path:"./Assets/Game Data/89.html", logo:"./Assets/Pictures/Non-edited/89.png"},
  {name:"Gunspin", path:"./Assets/Game Data/91.html", logo:"./Assets/Pictures/Non-edited/91.png"},
  {name:"Highway Racer 2", path:"./Assets/Game Data/92.html", logo:"./Assets/Pictures/Non-edited/92.png"},
  {name:"Johnny Trigger", path:"./Assets/Game Data/93.html", logo:"./Assets/Pictures/Non-edited/93.png"},
  {name:"Journey Downhill", path:"./Assets/Game Data/94.html", logo:"./Assets/Pictures/Non-edited/94.png"},
  {name:"Moto X3M", path:"./Assets/Game Data/96.html", logo:"./Assets/Pictures/Non-edited/96.png"},
  {name:"Ninja vs EvilCorp", path:"./Assets/Game Data/101.html", logo:"./Assets/Pictures/Non-edited/101.png"},
  {name:"Paper.io 2", path:"./Assets/Game Data/102.html", logo:"./Assets/Pictures/Non-edited/102.png"},
  {name:"The World's Hardest Game", path:"./Assets/Game Data/103.html", logo:"./Assets/Pictures/Non-edited/103.png"},
  {name:"The World's Hardest Game 3", path:"./Assets/Game Data/104.html", logo:"./Assets/Pictures/Non-edited/104.png"},
  {name:"The World's Hardest Game 4", path:"./Assets/Game Data/105.html", logo:"./Assets/Pictures/Non-edited/105.png"},
  {name:"This Is The Only Level", path:"./Assets/Game Data/106.html", logo:"./Assets/Pictures/Non-edited/106.png"},
  {name:"This Is The Only Level 2", path:"./Assets/Game Data/107.html", logo:"./Assets/Pictures/Non-edited/107.png"},
  {name:"Tiny Fishing", path:"./Assets/Game Data/108.html", logo:"./Assets/Pictures/Non-edited/108.png"},
  {name:"Toss The Turtle", path:"./Assets/Game Data/110-f.html", logo:"./Assets/Pictures/Non-edited/110.png"},
  {name:"Tube Jumpers", path:"./Assets/Game Data/111.html", logo:"./Assets/Pictures/Non-edited/111.png"},
  {name:"Ruffle", path:"./Assets/Game Data/113.html", logo:"./Assets/Pictures/Non-edited/113.png"},
  {name:"8 Ball Pool", path:"./Assets/Game Data/115.html", logo:"./Assets/Pictures/Non-edited/115.png"},
  {name:"Offroad Mountain Bike", path:"./Assets/Game Data/116.html", logo:"./Assets/Pictures/Non-edited/116.png"},
  {name:"Snow Rider 3D", path:"./Assets/Game Data/119.html", logo:"./Assets/Pictures/Non-edited/119.png"},
  {name:"Fortzone Battle Royale", path:"./Assets/Game Data/120.html", logo:"./Assets/Pictures/Non-edited/120.png"},

  {name:"Survival Race", path:"./Assets/Game Data/122.html", logo:"./Assets/Pictures/Non-edited/122.png"},
  {name:"Fashion Battle", path:"./Assets/Game Data/127.html", logo:"./Assets/Pictures/Non-edited/127.png"},
  {name:"Slice it All", path:"./Assets/Game Data/128.html", logo:"./Assets/Pictures/Non-edited/128.png"},
  {name:"Flappy Bird", path:"./Assets/Game Data/129.html", logo:"./Assets/Pictures/Non-edited/129.png"},
  {name:"osu!", path:"./Assets/Game Data/130.html", logo:"./Assets/Pictures/Non-edited/130.png"},
  {name:"8 Ball Classic", path:"./Assets/Game Data/146.html", logo:"./Assets/Pictures/Non-edited/146.png", external:true},
  {name:"Angry Birds Showdown", path:"./Assets/Game Data/147.html", logo:"./Assets/Pictures/Non-edited/147.png", external:true},
  {name:"Archery World Tour", path:"./Assets/Game Data/148.html", logo:"./Assets/Pictures/Non-edited/148.png", external:true},
  {name:"Ball Blast", path:"./Assets/Game Data/149.html", logo:"./Assets/Pictures/Non-edited/149.png", external:true},
  {name:"Cannon Balls 3D", path:"./Assets/Game Data/150.html", logo:"./Assets/Pictures/Non-edited/150.png"},
  {name:"Chess Classic", path:"./Assets/Game Data/151.html", logo:"./Assets/Pictures/Non-edited/151.png"},
  {name:"Draw the Line", path:"./Assets/Game Data/152.html", logo:"./Assets/Pictures/Non-edited/152.png"},
  {name:"Flappy Dunk", path:"./Assets/Game Data/153.html", logo:"./Assets/Pictures/Non-edited/153.png"},
  {name:"Fork n Sausage", path:"./Assets/Game Data/154.html", logo:"./Assets/Pictures/Non-edited/154.png"},
  {name:"Guess Their Answer", path:"./Assets/Game Data/155.html", logo:"./Assets/Pictures/Non-edited/155.png"},
  {name:"Harvest.io", path:"./Assets/Game Data/156.html", logo:"./Assets/Pictures/Non-edited/156.png"},
  {name:"Pac-Man Superfast", path:"./Assets/Game Data/158.html", logo:"./Assets/Pictures/Non-edited/158.png"},
  {name:"Parking Rush", path:"./Assets/Game Data/159.html", logo:"./Assets/Pictures/Non-edited/159.png"},
  {name:"Race Master 3D", path:"./Assets/Game Data/160.html", logo:"./Assets/Pictures/Non-edited/160.png"},
  {name:"State.io", path:"./Assets/Game Data/161.html", logo:"./Assets/Pictures/Non-edited/161.png"},
  {name:"Tower Crash 3D", path:"./Assets/Game Data/162.html", logo:"./Assets/Pictures/Non-edited/162.png"},
  {name:"Trivia Crack", path:"./Assets/Game Data/163.html", logo:"./Assets/Pictures/Non-edited/163.png"},
  {name:"Crazy Cattle 3D", path:"./Assets/Game Data/164-temp2.html", logo:"./Assets/Pictures/Non-edited/164.png"},
  {name:"Cheese Chompers 3D", path:"./Assets/Game Data/165.html", logo:"./Assets/Pictures/Non-edited/165.png"},
  {name:"Bad Parenting 1", path:"./Assets/Game Data/166.html", logo:"./Assets/Pictures/Non-edited/166.png"},
  {name:"Blade Ball", path:"./Assets/Game Data/167.html", logo:"./Assets/Pictures/Non-edited/167.png"},
  {name:"Blocky Snakes", path:"./Assets/Game Data/168.html", logo:"./Assets/Pictures/Non-edited/168.png"},
  {name:"Bloxorz", path:"./Assets/Game Data/169.html", logo:"./Assets/Pictures/Non-edited/169.png"},
  {name:"Big Tower Tiny Square 2", path:"./Assets/Game Data/170.html", logo:"./Assets/Pictures/Non-edited/170.png"},
  {name:"Melon Playground", path:"./Assets/Game Data/172.html", logo:"./Assets/Pictures/Non-edited/172.png"},
  {name:"World Box", path:"./Assets/Game Data/174.html", logo:"./Assets/Pictures/Non-edited/174.png"},
  {name:"Run 1", path:"./Assets/Game Data/175.html", logo:"./Assets/Pictures/Non-edited/175.png"},
  {name:"Swords and Souls", path:"./Assets/Game Data/178.html", logo:"./Assets/Pictures/Non-edited/178.png"},
  {name:"n-gon", path:"./Assets/Game Data/180.html", logo:"./Assets/Pictures/Non-edited/180.png"},
  {name:"Minecraft 1.8.8", path:"./Assets/Game Data/181.html", logo:"./Assets/Pictures/Non-edited/181.png"},
  {name:"Minecraft 1.12.2", path:"./Assets/Game Data/182.html", logo:"./Assets/Pictures/Non-edited/182.png"},
  {name:"Minecraft 1.21.4", path:"./Assets/Game Data/183.html", logo:"./Assets/Pictures/Non-edited/183.png"},
  {name:"Five Nights at Freddy's: Sister Location", path:"./Assets/Game Data/185.html", logo:"./Assets/Pictures/Non-edited/185.png"},
  {name:"Ragdoll Archers", path:"./Assets/Game Data/186.html", logo:"./Assets/Pictures/Non-edited/186.png"},
  {name:"Papers, Please", path:"./Assets/Game Data/187.html", logo:"./Assets/Pictures/Non-edited/187.png"},
  {name:"Scrap Metal 3", path:"./Assets/Game Data/188e.html", logo:"./Assets/Pictures/Non-edited/188.png"},
  {name:"Five Nights at Freddy's: World", path:"./Assets/Game Data/190.html", logo:"./Assets/Pictures/Non-edited/190.png"},
  {name:"Five Nights at Freddy's: Pizza Simulator", path:"./Assets/Game Data/191.html", logo:"./Assets/Pictures/Non-edited/191.png"},
  {name:"Five Nights at Freddy's: Ultimate Custom Night", path:"./Assets/Game Data/192.html", logo:"./Assets/Pictures/Non-edited/192.png"},
  {name:"Do NOT Take This Cat Home", path:"./Assets/Game Data/193.html", logo:"./Assets/Pictures/Non-edited/193.png"},
  {name:"People Playground", path:"./Assets/Game Data/194-a.html", logo:"./Assets/Pictures/Non-edited/194-m.png"},
  {name:"R.E.P.O", path:"./Assets/Game Data/195.html", logo:"./Assets/Pictures/Non-edited/195.png"},
  {name:"ULTRAKILL", path:"./Assets/Game Data/196-fixed.html", logo:"./Assets/Pictures/Non-edited/196.png"},
  {name:"Elastic Man", path:"./Assets/Game Data/197.html", logo:"./Assets/Pictures/Non-edited/197.png"},
  {name:"Slope", path:"./Assets/Game Data/198.html", logo:"./Assets/Pictures/Non-edited/198.png"},
  {name:"Time Shooter 1", path:"./Assets/Game Data/199.html", logo:"./Assets/Pictures/Non-edited/199.png"},
  {name:"Time Shooter 2", path:"./Assets/Game Data/200.html", logo:"./Assets/Pictures/Non-edited/200.png"},
  {name:"Time Shooter 3: SWAT", path:"./Assets/Game Data/201.html", logo:"./Assets/Pictures/Non-edited/201.png"},
  {name:"Carrom Clash", path:"./Assets/Game Data/202.html", logo:"./Assets/Pictures/Non-edited/202.png"},
  {name:"DOOM", path:"./Assets/Game Data/203-a.html", logo:"./Assets/Pictures/Non-edited/203.png"},
  {name:"Buckshot Roulette", path:"./Assets/Game Data/205-f.html", logo:"./Assets/Pictures/Non-edited/205.png"},
  {name:"Snowbattle.io", path:"./Assets/Game Data/207.html", logo:"./Assets/Pictures/Non-edited/207.png"},
  {name:"Draw the Hill", path:"./Assets/Game Data/209.html", logo:"./Assets/Pictures/Non-edited/209.png"},
  {name:"Dragon vs Bricks", path:"./Assets/Game Data/210.html", logo:"./Assets/Pictures/Non-edited/210.png"},
  {name:"Death Run 3D", path:"./Assets/Game Data/211.html", logo:"./Assets/Pictures/Non-edited/211.png"},
  {name:"Cut the Rope", path:"./Assets/Game Data/212-f.html", logo:"./Assets/Pictures/Non-edited/212.png"},
  {name:"Cut the Rope: Time Travel", path:"./Assets/Game Data/213-f.html", logo:"./Assets/Pictures/Non-edited/213.png"},
  {name:"Cut the Rope: Holiday Gift", path:"./Assets/Game Data/214-fi.html", logo:"./Assets/Pictures/Non-edited/214.png"},
  {name:"Bendy and the Ink Machine", path:"./Assets/Game Data/215.html", logo:"./Assets/Pictures/Non-edited/215.png"},
  {name:"That's Not My Neighbor", path:"./Assets/Game Data/216.html", logo:"./Assets/Pictures/Non-edited/216.png"},
  {name:"Hotline Miami", path:"./Assets/Game Data/217-c.html", logo:"./Assets/Pictures/Non-edited/217.png"},
  {name:"Papa's Bakeria", path:"./Assets/Game Data/218.html", logo:"./Assets/Pictures/Non-edited/218.png"},
  {name:"Papa's Burgeria", path:"./Assets/Game Data/219.html", logo:"./Assets/Pictures/Non-edited/219.png"},
  {name:"Papa's Cheeseria", path:"./Assets/Game Data/220.html", logo:"./Assets/Pictures/Non-edited/220.png"},
  {name:"Papa's Cupcakeria", path:"./Assets/Game Data/221.html", logo:"./Assets/Pictures/Non-edited/221.png"},
  {name:"Papa's Donuteria", path:"./Assets/Game Data/222.html", logo:"./Assets/Pictures/Non-edited/222.png"},
  {name:"Papa's Freezeria", path:"./Assets/Game Data/223.html", logo:"./Assets/Pictures/Non-edited/223.png"},
  {name:"Papa's Hot Doggeria", path:"./Assets/Game Data/224.html", logo:"./Assets/Pictures/Non-edited/224.png"},
  {name:"Papa's Pancakeria", path:"./Assets/Game Data/225.html", logo:"./Assets/Pictures/Non-edited/225.png"},
  {name:"Papa's Pastaria", path:"./Assets/Game Data/226.html", logo:"./Assets/Pictures/Non-edited/226.png"},
  {name:"Papa's Pizeria", path:"./Assets/Game Data/227.html", logo:"./Assets/Pictures/Non-edited/227.png"},
  {name:"Papa's Scooperia", path:"./Assets/Game Data/228.html", logo:"./Assets/Pictures/Non-edited/228.png"},
  {name:"Papa's Sushiria", path:"./Assets/Game Data/229.html", logo:"./Assets/Pictures/Non-edited/229.png"},
  {name:"Papa's Taco Mia", path:"./Assets/Game Data/230.html", logo:"./Assets/Pictures/Non-edited/230.png"},
  {name:"Papa's Wingeria", path:"./Assets/Game Data/231.html", logo:"./Assets/Pictures/Non-edited/231.png"},
  {name:"Superhot", path:"./Assets/Game Data/233.html", logo:"./Assets/Pictures/Non-edited/233.png"},
  {name:"Duck Life", path:"./Assets/Game Data/234.html", logo:"./Assets/Pictures/Non-edited/234.png"},
  {name:"Duck Life 2", path:"./Assets/Game Data/235.html", logo:"./Assets/Pictures/Non-edited/235.png"},
  {name:"Duck Life 3", path:"./Assets/Game Data/236.html", logo:"./Assets/Pictures/Non-edited/236.png"},
  {name:"Duck Life 5", path:"./Assets/Game Data/238.html", logo:"./Assets/Pictures/Non-edited/238.png"},
  {name:"Red Ball", path:"./Assets/Game Data/239.html", logo:"./Assets/Pictures/Non-edited/239.png"},
  {name:"Red Ball 2", path:"./Assets/Game Data/240.html", logo:"./Assets/Pictures/Non-edited/240.png"},
  {name:"Red Ball 3", path:"./Assets/Game Data/241.html", logo:"./Assets/Pictures/Non-edited/241.png"},
  {name:"Wheely", path:"./Assets/Game Data/245.html", logo:"./Assets/Pictures/Non-edited/245.png"},
  {name:"Wheely 2", path:"./Assets/Game Data/246.html", logo:"./Assets/Pictures/Non-edited/246.png"},
  {name:"Wheely 3", path:"./Assets/Game Data/247.html", logo:"./Assets/Pictures/Non-edited/247.png"},
  {name:"Wheely 4", path:"./Assets/Game Data/248.html", logo:"./Assets/Pictures/Non-edited/248.png"},
  {name:"Wheely 5", path:"./Assets/Game Data/249.html", logo:"./Assets/Pictures/Non-edited/249.png"},
  {name:"Wheely 6", path:"./Assets/Game Data/250.html", logo:"./Assets/Pictures/Non-edited/250.png"},
  {name:"Wheely 7", path:"./Assets/Game Data/251.html", logo:"./Assets/Pictures/Non-edited/251.png"},
  {name:"Wheely 8", path:"./Assets/Game Data/252.html", logo:"./Assets/Pictures/Non-edited/252.png"},
 
  {name:"Crazy Chicken 3D", path:"./Assets/Game Data/255.html", logo:"./Assets/Pictures/Non-edited/255.png"},
  {name:"Crazy Kitty 3D", path:"./Assets/Game Data/256.html", logo:"./Assets/Pictures/Non-edited/256.png"},
  {name:"Google Baseball", path:"./Assets/Game Data/257.html", logo:"./Assets/Pictures/Non-edited/257.png"},
  {name:"A Bite at Freddy's", path:"./Assets/Game Data/258.html", logo:"./Assets/Pictures/Non-edited/258.png"},
  {name:"Class of '09", path:"./Assets/Game Data/259.html", logo:"./Assets/Pictures/Non-edited/259.png"},
  {name:"RE:RUN", path:"./Assets/Game Data/260.html", logo:"./Assets/Pictures/Non-edited/260.png"},
  {name:"Half Life", path:"./Assets/Game Data/262.html", logo:"./Assets/Pictures/Non-edited/262.png"},
  {name:"Quake III Arena", path:"./Assets/Game Data/263.html", logo:"./Assets/Pictures/Non-edited/263.png"},
  {name:"Escape Road", path:"./Assets/Game Data/264.html", logo:"./Assets/Pictures/Non-edited/264.png"},
  {name:"Escape Road 2", path:"./Assets/Game Data/265-fix.html", logo:"./Assets/Pictures/Non-edited/265.png"},
  {name:"Speed Stars", path:"./Assets/Game Data/266-a.html", logo:"./Assets/Pictures/Non-edited/266.png"},
  {name:"Pizza Tower", path:"./Assets/Game Data/267.html", logo:"./Assets/Pictures/Non-edited/267.png"},
  {name:"Bacon May Die", path:"./Assets/Game Data/268.html", logo:"./Assets/Pictures/Non-edited/268.png"},
  {name:"Bad Ice Cream 2", path:"./Assets/Game Data/270.html", logo:"./Assets/Pictures/Non-edited/270.png"},
  {name:"Bad Ice Cream 3", path:"./Assets/Game Data/271.html", logo:"./Assets/Pictures/Non-edited/271.png"},
  {name:"BlockPost", path:"./Assets/Game Data/273.html", logo:"./Assets/Pictures/Non-edited/273.png"},
  {name:"CircloO", path:"./Assets/Game Data/274.html", logo:"./Assets/Pictures/Non-edited/274.png"},
  {name:"CircloO 2", path:"./Assets/Game Data/275.html", logo:"./Assets/Pictures/Non-edited/275.png"},
  {name:"Drift Boss", path:"./Assets/Game Data/276.html", logo:"./Assets/Pictures/Non-edited/276.png"},
  {name:"Evil Glitch", path:"./Assets/Game Data/277.html", logo:"./Assets/Pictures/Non-edited/277.png"},
  {name:"Madalin Stunt Cars 2", path:"./Assets/Game Data/278.html", logo:"./Assets/Pictures/Non-edited/278.png"},
  {name:"Madalin Stunt Cars 3", path:"./Assets/Game Data/279.html", logo:"./Assets/Pictures/Non-edited/279.png"},
  {name:"Papery Planes", path:"./Assets/Game Data/280.html", logo:"./Assets/Pictures/Non-edited/280.png"},
  {name:"Pixel Gun Survival", path:"./Assets/Game Data/281.html", logo:"./Assets/Pictures/Non-edited/281.png"},
  {name:"Protektor", path:"./Assets/Game Data/282.html", logo:"./Assets/Pictures/Non-edited/282.png"},
  {name:"War The Knights", path:"./Assets/Game Data/284.html", logo:"./Assets/Pictures/Non-edited/284.png"},
  {name:"Endoparasitic", path:"./Assets/Game Data/286.html", logo:"./Assets/Pictures/Non-edited/286.png"},
  {name:"Riddle Transfer", path:"./Assets/Game Data/292.html", logo:"./Assets/Pictures/Non-edited/292.png"},
  {name:"Riddle Transfer 2", path:"./Assets/Game Data/293.html", logo:"./Assets/Pictures/Non-edited/293.png"},
  {name:"Idle Dice", path:"./Assets/Game Data/294.html", logo:"./Assets/Pictures/Non-edited/294.png"},
  {name:"Minecraft 1.5.2", path:"./Assets/Game Data/297.html", logo:"./Assets/Pictures/Non-edited/297.png"},
  {name:"Minecraft Alpha 1.2.6", path:"./Assets/Game Data/298.html", logo:"./Assets/Pictures/Non-edited/298.png"},
  {name:"Minecraft Beta 1.3", path:"./Assets/Game Data/299.html", logo:"./Assets/Pictures/Non-edited/299.png"},
  {name:"Minecraft Beta 1.7.3", path:"./Assets/Game Data/300.html", logo:"./Assets/Pictures/Non-edited/300.png"},
  {name:"Minecraft Indev", path:"./Assets/Game Data/301.html", logo:"./Assets/Pictures/Non-edited/301.png"},
  {name:"Little Runmo", path:"./Assets/Game Data/302.html", logo:"./Assets/Pictures/Non-edited/302.png"},
  {name:"Territorial.io", path:"./Assets/Game Data/303.html", logo:"./Assets/Pictures/Non-edited/303.png"},
  {name:"Alien Hominid", path:"./Assets/Game Data/304.html", logo:"./Assets/Pictures/Non-edited/304.png"},
  {name:"Tanuki Sunset", path:"./Assets/Game Data/305.html", logo:"./Assets/Pictures/Non-edited/305.png"},
  {name:"Shipo.io", path:"./Assets/Game Data/306.html", logo:"./Assets/Pictures/Non-edited/306.png"},
  {name:"Rainbow Obby", path:"./Assets/Game Data/307.html", logo:"./Assets/Pictures/Non-edited/307.png"},
  {name:"Nazi Zombies: Portable", path:"./Assets/Game Data/308.html", logo:"./Assets/Pictures/Non-edited/308.png"},
  {name:"Sandboxels", path:"./Assets/Game Data/309.html", logo:"./Assets/Pictures/Non-edited/309.png"},
  {name:"Dreadhead Parkour", path:"./Assets/Game Data/310.html", logo:"./Assets/Pictures/Non-edited/310.png"},
  {name:"Sandtris", path:"./Assets/Game Data/311.html", logo:"./Assets/Pictures/Non-edited/311.png"},
  {name:"BlackJack", path:"./Assets/Game Data/312.html", logo:"./Assets/Pictures/Non-edited/312.png"},
  {name:"Minesweeper Mania", path:"./Assets/Game Data/313.html", logo:"./Assets/Pictures/Non-edited/313.png"},
  {name:"Super Mario 63", path:"./Assets/Game Data/314.html", logo:"./Assets/Pictures/Non-edited/314.png"},
  {name:"Jelly Mario", path:"./Assets/Game Data/315.html", logo:"./Assets/Pictures/Non-edited/315.png"},
  {name:"Angry Birds Chrome", path:"./Assets/Game Data/316.html", logo:"./Assets/Pictures/Non-edited/316.png", external:true},
  {name:"sandspiel", path:"./Assets/Game Data/317.html", logo:"./Assets/Pictures/Non-edited/317.png"},
  {name:"Side Effects", path:"./Assets/Game Data/318.html", logo:"./Assets/Pictures/Non-edited/318.png"},
  {name:"Build a Queen", path:"./Assets/Game Data/319.html", logo:"./Assets/Pictures/Non-edited/319.png"},
  {name:"3D Bowling", path:"./Assets/Game Data/320.html", logo:"./Assets/Pictures/Non-edited/320.png", external:true},
  {name:"Room Sort", path:"./Assets/Game Data/321.html", logo:"./Assets/Pictures/Non-edited/321.png"},
  {name:"Sushi Roll", path:"./Assets/Game Data/322.html", logo:"./Assets/Pictures/Non-edited/322.png"},
  {name:"Find the Alien", path:"./Assets/Game Data/323.html", logo:"./Assets/Pictures/Non-edited/323.png"},
  {name:"Maze Speedrun", path:"./Assets/Game Data/324.html", logo:"./Assets/Pictures/Non-edited/324.png"},
  {name:"Kitchen Bazar", path:"./Assets/Game Data/325.html", logo:"./Assets/Pictures/Non-edited/325.png"},
  {name:"Pokey Ball", path:"./Assets/Game Data/326.html", logo:"./Assets/Pictures/Non-edited/326.png"},
  {name:"Slime.io", path:"./Assets/Game Data/327.html", logo:"./Assets/Pictures/Non-edited/327.png"},
  {name:"Om Nom Run", path:"./Assets/Game Data/328.html", logo:"./Assets/Pictures/Non-edited/328.png"},
  {name:"TileTopia", path:"./Assets/Game Data/329a.html", logo:"./Assets/Pictures/Non-edited/329.png"},
  {name:"BitPlanes", path:"./Assets/Game Data/330.html", logo:"./Assets/Pictures/Non-edited/330.png"},
  {name:"Crazy Cars", path:"./Assets/Game Data/331.html", logo:"./Assets/Pictures/Non-edited/331.png"},
  {name:"Fancy Pants Adventure", path:"./Assets/Game Data/333.html", logo:"./Assets/Pictures/Non-edited/333.png"},
  {name:"Fancy Pants Adventure 2", path:"./Assets/Game Data/334.html", logo:"./Assets/Pictures/Non-edited/334.png"},
  {name:"Fancy Pants Adventure 3", path:"./Assets/Game Data/335.html", logo:"./Assets/Pictures/Non-edited/335.png"},
  {name:"Fancy Pants Adventure 4 Part 1", path:"./Assets/Game Data/336.html", logo:"./Assets/Pictures/Non-edited/336.png"},
  {name:"Fancy Pants Adventure 4 Part 2", path:"./Assets/Game Data/337.html", logo:"./Assets/Pictures/Non-edited/337.png"},
  {name:"Getaway Shootout", path:"./Assets/Game Data/338.html", logo:"./Assets/Pictures/Non-edited/338.png"},
  {name:"House of Hazards", path:"./Assets/Game Data/339.html", logo:"./Assets/Pictures/Non-edited/339.png"},
  {name:"Learn to Fly", path:"./Assets/Game Data/340.html", logo:"./Assets/Pictures/Non-edited/340.png"},
  {name:"Learn to Fly 2", path:"./Assets/Game Data/341.html", logo:"./Assets/Pictures/Non-edited/341.png"},
  {name:"Learn to Fly 3", path:"./Assets/Game Data/342.html", logo:"./Assets/Pictures/Non-edited/342.png"},
  {name:"Learn to Fly Idle", path:"./Assets/Game Data/343.html", logo:"./Assets/Pictures/Non-edited/343.png"},
  {name:"Raft Wars", path:"./Assets/Game Data/RaftWars-gh-pages/index.html", logo:"./Assets/Pictures/Non-edited/344.png"},
  {name:"Raft Wars 2", path:"./Assets/Game Data/345.html", logo:"./Assets/Pictures/Non-edited/345.png"},
  {name:"Sort the Court", path:"./Assets/Game Data/346.html", logo:"./Assets/Pictures/Non-edited/346.png"},
  {name:"SpiderDoll", path:"./Assets/Game Data/347.html", logo:"./Assets/Pictures/Non-edited/347.png"},
  {name:"They Are Coming", path:"./Assets/Game Data/348.html", logo:"./Assets/Pictures/Non-edited/348.png"},
  {name:"Spiral Roll", path:"./Assets/Game Data/349.html", logo:"./Assets/Pictures/Non-edited/349.png"},
  {name:"Binding of Issac: Wrath of the Lamb", path:"./Assets/Game Data/350.html", logo:"./Assets/Pictures/Non-edited/350.png"},
  {name:"Happy Sheepies", path:"./Assets/Game Data/351.html", logo:"./Assets/Pictures/Non-edited/351.png"},
  {name:"DON'T YOU LECTURE ME", path:"./Assets/Game Data/352.html", logo:"./Assets/Pictures/Non-edited/352.png"},
  
  {name:"Adventure Capatalist", path:"./Assets/Game Data/354-a.html", logo:"./Assets/Pictures/Non-edited/354.png"},
  {name:"Dadish 2", path:"./Assets/Game Data/355.html", logo:"./Assets/Pictures/Non-edited/355.png"},
  {name:"Dadish 3", path:"./Assets/Game Data/356.html", logo:"./Assets/Pictures/Non-edited/356.png"},
  {name:"Dadish", path:"./Assets/Game Data/357.html", logo:"./Assets/Pictures/Non-edited/357.png"},
  {name:"Dadish 3D", path:"./Assets/Game Data/358.html", logo:"./Assets/Pictures/Non-edited/358.png"},
  {name:"Daily Dadish", path:"./Assets/Game Data/359.html", logo:"./Assets/Pictures/Non-edited/359.png"},
  {name:"EvoWars.io", path:"./Assets/Game Data/360.html", logo:"./Assets/Pictures/Non-edited/360.png"},
  {name:"Google Feud", path:"./Assets/Game Data/361.html", logo:"./Assets/Pictures/Non-edited/361.png"},
  {name:"Idle Breakout", path:"./Assets/Game Data/362.html", logo:"./Assets/Pictures/Non-edited/362.png"},
  {name:"Idle Lumber Inc", path:"./Assets/Game Data/363.html", logo:"./Assets/Pictures/Non-edited/363.png"},
  {name:"Idle Mining Empire", path:"./Assets/Game Data/364.html", logo:"./Assets/Pictures/Non-edited/364.png"},
  {name:"JustFall.lol", path:"./Assets/Game Data/365.html", logo:"./Assets/Pictures/Non-edited/365.png"},
  {name:"Merge Harvest", path:"./Assets/Game Data/366.html", logo:"./Assets/Pictures/Non-edited/366.png"},
  {name:"Parking Fury 3D", path:"./Assets/Game Data/367.html", logo:"./Assets/Pictures/Non-edited/367.png"},
  {name:"Slowroads", path:"./Assets/Game Data/369.html", logo:"./Assets/Pictures/Non-edited/369.png"},
  {name:"Smash Karts", path:"./Assets/Game Data/370-f.html", logo:"./Assets/Pictures/Non-edited/370.png"},
  {name:"Stickman Fight Ragdoll", path:"./Assets/Game Data/371e.html", logo:"./Assets/Pictures/Non-edited/371.png"},
  {name:"Stickman Boost", path:"./Assets/Game Data/372.html", logo:"./Assets/Pictures/Non-edited/372.png"},
  {name:"Stickman Climb", path:"./Assets/Game Data/373.html", logo:"./Assets/Pictures/Non-edited/373.png"},
  {name:"Stickman Golf", path:"./Assets/Game Data/374e.html", logo:"./Assets/Pictures/Non-edited/374.png"},
 
  {name:"Build a Big Army", path:"./Assets/Game Data/376.html", logo:"./Assets/Pictures/Non-edited/376.png"},
  {name:"Build a Plane", path:"./Assets/Game Data/377.html", logo:"./Assets/Pictures/Non-edited/377.png"},
  {name:"Camouflage and Sniper", path:"./Assets/Game Data/378.html", logo:"./Assets/Pictures/Non-edited/378.png"},
  {name:"Car Survival 3D", path:"./Assets/Game Data/379.html", logo:"./Assets/Pictures/Non-edited/379.png"},
  {name:"City Defense", path:"./Assets/Game Data/380.html", logo:"./Assets/Pictures/Non-edited/380.png"},
  {name:"Clothing Shop 3D", path:"./Assets/Game Data/381.html", logo:"./Assets/Pictures/Non-edited/381.png"},
  {name:"Cool Cars Run 3D", path:"./Assets/Game Data/382.html", logo:"./Assets/Pictures/Non-edited/382.png"},
  {name:"Crush Cars 3D", path:"./Assets/Game Data/383.html", logo:"./Assets/Pictures/Non-edited/383.png"},
  {name:"Destiny Run 3D", path:"./Assets/Game Data/384.html", logo:"./Assets/Pictures/Non-edited/384.png"},
  {name:"Destroy The Car 3D", path:"./Assets/Game Data/385.html", logo:"./Assets/Pictures/Non-edited/385.png"},
  {name:"Diamond Seeker", path:"./Assets/Game Data/386.html", logo:"./Assets/Pictures/Non-edited/386.png"},
  {name:"Draw Joust", path:"./Assets/Game Data/387.html", logo:"./Assets/Pictures/Non-edited/387.png"},
  {name:"Evolving Bombs 3D", path:"./Assets/Game Data/388.html", logo:"./Assets/Pictures/Non-edited/388.png"},
  {name:"Fire and Frost Master", path:"./Assets/Game Data/389.html", logo:"./Assets/Pictures/Non-edited/389.png"},
  {name:"Fitness Empire", path:"./Assets/Game Data/390.html", logo:"./Assets/Pictures/Non-edited/390.png"},
  {name:"Flick Goal", path:"./Assets/Game Data/391.html", logo:"./Assets/Pictures/Non-edited/391.png"},
  {name:"Flip Master", path:"./Assets/Game Data/392.html", logo:"./Assets/Pictures/Non-edited/392.png"},
  {name:"Giant Wanted", path:"./Assets/Game Data/393.html", logo:"./Assets/Pictures/Non-edited/393.png"},
  {name:"Gun Clone", path:"./Assets/Game Data/394.html", logo:"./Assets/Pictures/Non-edited/394.png"},
  {name:"Gun Runner", path:"./Assets/Game Data/395.html", logo:"./Assets/Pictures/Non-edited/395.png"},
  {name:"Kaji Run", path:"./Assets/Game Data/396.html", logo:"./Assets/Pictures/Non-edited/396.png"},
  {name:"Make a SuperBoat", path:"./Assets/Game Data/397.html", logo:"./Assets/Pictures/Non-edited/397.png"},
  {name:"Makeover Run", path:"./Assets/Game Data/398.html", logo:"./Assets/Pictures/Non-edited/398.png"},
  {name:"Mega Car Jumps", path:"./Assets/Game Data/399.html", logo:"./Assets/Pictures/Non-edited/399.png"},
  {name:"Money Rush", path:"./Assets/Game Data/400.html", logo:"./Assets/Pictures/Non-edited/400.png"},
  {name:"Monster Box 3D", path:"./Assets/Game Data/401.html", logo:"./Assets/Pictures/Non-edited/401.png"},
  {name:"Office Fight", path:"./Assets/Game Data/402.html", logo:"./Assets/Pictures/Non-edited/402.png"},
  {name:"Robot Invasion", path:"./Assets/Game Data/403.html", logo:"./Assets/Pictures/Non-edited/403.png"},
  {name:"Seat Jam 3D", path:"./Assets/Game Data/404.html", logo:"./Assets/Pictures/Non-edited/404.png"},
  {name:"Shooting Master", path:"./Assets/Game Data/405.html", logo:"./Assets/Pictures/Non-edited/405.png"},
  {name:"Supermarket 3D", path:"./Assets/Game Data/406.html", logo:"./Assets/Pictures/Non-edited/406.png"},
  {name:"Survive to Victory", path:"./Assets/Game Data/407.html", logo:"./Assets/Pictures/Non-edited/407.png"},
  {name:"Telekinesis Attack", path:"./Assets/Game Data/408.html", logo:"./Assets/Pictures/Non-edited/408.png"},
  {name:"Telekinesis Car", path:"./Assets/Game Data/409.html", logo:"./Assets/Pictures/Non-edited/409.png"},
  {name:"Telekinesis Drive", path:"./Assets/Game Data/410.html", logo:"./Assets/Pictures/Non-edited/410.png"},
  {name:"Telekinesis", path:"./Assets/Game Data/411.html", logo:"./Assets/Pictures/Non-edited/411.png"},
  {name:"Tug of War with Cars", path:"./Assets/Game Data/413.html", logo:"./Assets/Pictures/Non-edited/413.png"},
  {name:"Twerk Race 3D", path:"./Assets/Game Data/414.html", logo:"./Assets/Pictures/Non-edited/414.png"},
  {name:"Twisted Rope 3D", path:"./Assets/Game Data/415.html", logo:"./Assets/Pictures/Non-edited/415.png"},
  {name:"Wall Crawler", path:"./Assets/Game Data/416.html", logo:"./Assets/Pictures/Non-edited/416.png"},
  {name:"War Regions", path:"./Assets/Game Data/417.html", logo:"./Assets/Pictures/Non-edited/417.png"},
  {name:"Weapon Craft Run", path:"./Assets/Game Data/418.html", logo:"./Assets/Pictures/Non-edited/418.png"},
  {name:"Weapon Upgrade Rush", path:"./Assets/Game Data/419.html", logo:"./Assets/Pictures/Non-edited/419.png"},
  {name:"Weapon Scale", path:"./Assets/Game Data/420.html", logo:"./Assets/Pictures/Non-edited/420.png"},
  {name:"Rich Run 3D", path:"./Assets/Game Data/421.html", logo:"./Assets/Pictures/Non-edited/421.png"},
  {name:"High Heels", path:"./Assets/Game Data/422.html", logo:"./Assets/Pictures/Non-edited/422.png"},
  {name:"WebFishing", path:"./Assets/Game Data/423.html", logo:"./Assets/Pictures/Non-edited/423.png"},
  {name:"Andy's Apple Farm", path:"./Assets/Game Data/426.html", logo:"./Assets/Pictures/Non-edited/426.png"},
  {name:"OMORI", path:"./Assets/Game Data/427-z.html", logo:"./Assets/Pictures/Non-edited/427.png"},
  {name:"Five Nights at Freddy's 4: Halloween", path:"./Assets/Game Data/428.html", logo:"./Assets/Pictures/Non-edited/428.png"},
  {name:"Code Editor", path:"./Assets/Game Data/429-f.html", logo:"./Assets/Pictures/Non-edited/429.png"},
  {name:"10 Minutes Till Dawn", path:"./Assets/Game Data/430.html", logo:"./Assets/Pictures/Non-edited/430.png"},
  {name:"99 Balls", path:"./Assets/Game Data/431.html", logo:"./Assets/Pictures/Non-edited/431.png"},
  {name:"Abandoned", path:"./Assets/Game Data/432.html", logo:"./Assets/Pictures/Non-edited/432.png"},
  {name:"Yume Nikki", path:"./Assets/Game Data/433.html", logo:"./Assets/Pictures/Non-edited/433.png"},
  {name:"God's Flesh", path:"./Assets/Game Data/434.html", logo:"./Assets/Pictures/Non-edited/434.png"},
  {name:"A Small World Cup", path:"./Assets/Game Data/435.html", logo:"./Assets/Pictures/Non-edited/435.png"},
  {name:"Awesome Tanks", path:"./Assets/Game Data/436.html", logo:"./Assets/Pictures/Non-edited/436.png"},
  {name:"Bouncemasters", path:"./Assets/Game Data/437.html", logo:"./Assets/Pictures/Non-edited/437.png"},
  {name:"Awesome Tanks 2", path:"./Assets/Game Data/438.html", logo:"./Assets/Pictures/Non-edited/438.png"},
  {name:"Bank Robbery 2", path:"./Assets/Game Data/439.html", logo:"./Assets/Pictures/Non-edited/439.png"},
  {name:"Celeste PICO", path:"./Assets/Game Data/440.html", logo:"./Assets/Pictures/Non-edited/440.png"},
  {name:"Kitty Toy", path:"./Assets/Game Data/441.html", logo:"./Assets/Pictures/Non-edited/441.png"},
  {name:"Infinimoes", path:"./Assets/Game Data/442.html", logo:"./Assets/Pictures/Non-edited/442.png"},
  {name:"Adventure Drivers", path:"./Assets/Game Data/443.html", logo:"./Assets/Pictures/Non-edited/443.png"},
  {name:"Ages of Conflict", path:"./Assets/Game Data/444.html", logo:"./Assets/Pictures/Non-edited/444.png"},
  {name:"Kindergarten", path:"./Assets/Game Data/445.html", logo:"./Assets/Pictures/Non-edited/445.png"},
  {name:"Kindergarten 2", path:"./Assets/Game Data/446.html", logo:"./Assets/Pictures/Non-edited/446.png"},
  {name:"Nijika's Ahoge", path:"./Assets/Game Data/447-e.html", logo:"./Assets/Pictures/Non-edited/447.png"},
  {name:"Aquapark.io", path:"./Assets/Game Data/448.html", logo:"./Assets/Pictures/Non-edited/448.png", external:true},
  {name:"City Smash", path:"./Assets/Game Data/449.html", logo:"./Assets/Pictures/Non-edited/449.png"},

  {name:"Slender: The 8 Pages", path:"./Assets/Game Data/451.html", logo:"./Assets/Pictures/Non-edited/451.png"},
  {name:"Station 141", path:"./Assets/Game Data/452.html", logo:"./Assets/Pictures/Non-edited/452.png"},
  {name:"BLOODMONEY!", path:"./Assets/Game Data/454.html", logo:"./Assets/Pictures/Non-edited/454.png"},
  {name:"BERGENTRUCK 201x", path:"./Assets/Game Data/455.html", logo:"./Assets/Pictures/Non-edited/455.png"},
  {name:"Undertale Yellow", path:"./Assets/Game Data/456.html", logo:"./Assets/Pictures/Non-edited/456.png"},
  {name:"Raft", path:"./Assets/Game Data/457.html", logo:"./Assets/Pictures/Non-edited/457.png"},
  {name:"The Deadseat", path:"./Assets/Game Data/458.html", logo:"./Assets/Pictures/Non-edited/458.png"},
  {name:"Fears to Fathom: Home Alone", path:"./Assets/Game Data/460.html", logo:"./Assets/Pictures/Non-edited/460.png"},
  {name:"DEAD PLATE", path:"./Assets/Game Data/462.html", logo:"./Assets/Pictures/Non-edited/462.png"},
  {name:"Lacey's Flash Games", path:"./Assets/Game Data/463.html", logo:"./Assets/Pictures/Non-edited/463.png"},
  {name:"Choppy Orc", path:"./Assets/Game Data/464.html", logo:"./Assets/Pictures/Non-edited/464.png"},
  {name:"Cuphead", path:"./Assets/Game Data/465-fix.html", logo:"./Assets/Pictures/Non-edited/465.png"},
  {name:"Baldi's Basics Classic Remastered", path:"./Assets/Game Data/466.html", logo:"./Assets/Pictures/Non-edited/466.png"},
  {name:"Baldi's Basics Plus", path:"./Assets/Game Data/467-updatee.html", logo:"./Assets/Pictures/Non-edited/467.png"},
  {name:"Hollow Knight", path:"./Assets/Game Data/468-f.html", logo:"./Assets/Pictures/Non-edited/468.png"},
  {name:"sandstone", path:"./Assets/Game Data/469.html", logo:"./Assets/Pictures/Non-edited/469.png"},
  {name:"Doodle Jump", path:"./Assets/Game Data/470.html", logo:"./Assets/Pictures/Non-edited/470.png"},
  {name:"Madness Combat: Project Nexus (classic)", path:"./Assets/Game Data/471.html", logo:"./Assets/Pictures/Non-edited/471.png"},
  {name:"Bad Time Simulator", path:"./Assets/Game Data/472.html", logo:"./Assets/Pictures/Non-edited/472.png"},
  {name:"Spacebar Clicker", path:"./Assets/Game Data/473.html", logo:"./Assets/Pictures/Non-edited/473.png"},
  {name:"Friday Night Funkin': V.S. Whitty", path:"./Assets/Game Data/474.html", logo:"./Assets/Pictures/Non-edited/474.png"},
  {name:"Friday Night Funkin': B-Sides", path:"./Assets/Game Data/475.html", logo:"./Assets/Pictures/Non-edited/475.png"},
  {name:"Friday Night Funkin': Vs. Hex", path:"./Assets/Game Data/476.html", logo:"./Assets/Pictures/Non-edited/476.png"},
  {name:"Friday Night Funkin': Vs. Hatsune Miku", path:"./Assets/Game Data/477.html", logo:"./Assets/Pictures/Non-edited/477.png"},
  {name:"Friday Night Funkin': Neo", path:"./Assets/Game Data/478.html", logo:"./Assets/Pictures/Non-edited/478.png"},
  {name:"Friday Night Funkin': Sarvente's Mid-Fight Masses", path:"./Assets/Game Data/480.html", logo:"./Assets/Pictures/Non-edited/480.png"},
  {name:"Friday Night Funkin': vs. Tricky", path:"./Assets/Game Data/481.html", logo:"./Assets/Pictures/Non-edited/481.png"},
  {name:"Human Expenditure Program", path:"./Assets/Game Data/482-2.html", logo:"./Assets/Pictures/Non-edited/482.png"},
  {name:"Friday Night Funkin': Hit Single Real", path:"./Assets/Game Data/483.html", logo:"./Assets/Pictures/Non-edited/483.png"},
  {name:"Friday Night Funkin': Creepypasta JP", path:"./Assets/Game Data/484.html", logo:"./Assets/Pictures/Non-edited/484.png"},
  {name:"Friday Night Funkin': vs. Garcello", path:"./Assets/Game Data/485.html", logo:"./Assets/Pictures/Non-edited/485.png"},
  {name:"Friday Night Funkin': Sonic Legacy", path:"./Assets/Game Data/486.html", logo:"./Assets/Pictures/Non-edited/486.png"},
  {name:"Friday Night Funkin': vs. QT", path:"./Assets/Game Data/487.html", logo:"./Assets/Pictures/Non-edited/487.png"},
  {name:"Friday Night Funkin': Mistful Crimson Morning Reboot", path:"./Assets/Game Data/488.html", logo:"./Assets/Pictures/Non-edited/488.png"},
  {name:"Friday Night Funkin': Indie Cross", path:"./Assets/Game Data/489.html", logo:"./Assets/Pictures/Non-edited/489.png"},
  {name:"Rooftop Snipers 2", path:"./Assets/Game Data/490.html", logo:"./Assets/Pictures/Non-edited/490.png"},
  {name:"I woke up next to you again.", path:"./Assets/Game Data/491.html", logo:"./Assets/Pictures/Non-edited/491.png"},
  {name:"UNDERWHEELS", path:"./Assets/Game Data/492.html", logo:"./Assets/Pictures/Non-edited/492.png"},
  {name:"RigBMX", path:"./Assets/Game Data/493.html", logo:"./Assets/Pictures/Non-edited/493.png"},
  {name:"RigBMX 2", path:"./Assets/Game Data/494.html", logo:"./Assets/Pictures/Non-edited/494.png"},
  {name:"groon groon, babey!", path:"./Assets/Game Data/495.html", logo:"./Assets/Pictures/Non-edited/495.png"},
  {name:"Friday Night Funkin': Jeffy's Endless Aethos", path:"./Assets/Game Data/496.html", logo:"./Assets/Pictures/Non-edited/496.png"},
  {name:"Friday Night Funkin': vs. BOPCITY", path:"./Assets/Game Data/497.html", logo:"./Assets/Pictures/Non-edited/497.png"},
  {name:"Friday Night Funkin': 17 Bucks: Floor 1", path:"./Assets/Game Data/498.html", logo:"./Assets/Pictures/Non-edited/498.png"},
  {name:"Friday Night Funkin': FIRE IN THE HOLE: Lobotomy Dash Funkin'", path:"./Assets/Game Data/499.html", logo:"./Assets/Pictures/Non-edited/499.png"},
  {name:"Friday Night Funkin': TWIDDLEFINGER", path:"./Assets/Game Data/500.html", logo:"./Assets/Pictures/Non-edited/500.png"},
  {name:"Kindergarten 3", path:"./Assets/Game Data/501.html", logo:"./Assets/Pictures/Non-edited/501.png"},
  {name:"Stick With It", path:"./Assets/Game Data/502-fixed.html", logo:"./Assets/Pictures/Non-edited/502.png"},
  {name:"Five Nights at Candy's", path:"./Assets/Game Data/503.html", logo:"./Assets/Pictures/Non-edited/503.png"},
  {name:"Five Nights at Candy's 2", path:"./Assets/Game Data/504.html", logo:"./Assets/Pictures/Non-edited/504.png"},
  {name:"Pokemon Red", path:"./Assets/Game Data/505.html", logo:"./Assets/Pictures/Non-edited/505.png"},
  {name:"Pokemon Emerald", path:"./Assets/Game Data/506.html", logo:"./Assets/Pictures/Non-edited/506.png"},
  {name:"Super Mario Bros", path:"./Assets/Game Data/508.html", logo:"./Assets/Pictures/Non-edited/508.png"},
  {name:"Friday Night Funkin’ Soft", path:"./Assets/Game Data/509.html", logo:"./Assets/Pictures/Non-edited/509.png"},
  {name:"Tomodachi Collection", path:"./Assets/Game Data/510.html", logo:"./Assets/Pictures/Non-edited/510.png"},
  {name:"Doge Miner", path:"./Assets/Game Data/511.html", logo:"./Assets/Pictures/Non-edited/511.png"},
  {name:"Final Earth 2", path:"./Assets/Game Data/512.html", logo:"./Assets/Pictures/Non-edited/512.png"},
  {name:"Swordfight!!", path:"./Assets/Game Data/513.html", logo:"./Assets/Pictures/Non-edited/513.png"},
  {name:"PortaBoy+", path:"./Assets/Game Data/514.html", logo:"./Assets/Pictures/Non-edited/514.png"},
  {name:"PacMan (Horror)", path:"./Assets/Game Data/515.html", logo:"./Assets/Pictures/Non-edited/515.png"},
  {name:"Oshi Oshi Punch!", path:"./Assets/Game Data/516.html", logo:"./Assets/Pictures/Non-edited/516.png"},
  {name:"Nubby's Number Factory", path:"./Assets/Game Data/517.html", logo:"./Assets/Pictures/Non-edited/517.png"},
  {name:"Touhou: Luminous Strike", path:"./Assets/Game Data/518.html", logo:"./Assets/Pictures/Non-edited/518.png"},
  {name:"Generic Fighter Maybe", path:"./Assets/Game Data/519.html", logo:"./Assets/Pictures/Non-edited/519.png"},
  {name:"Dan The Man", path:"./Assets/Game Data/520-fix.html", logo:"./Assets/Pictures/Non-edited/520.png"},
  {name:"Bust a Loop", path:"./Assets/Game Data/521.html", logo:"./Assets/Pictures/Non-edited/521.png"},
  {name:"Bad Monday Simulator", path:"./Assets/Game Data/522.html", logo:"./Assets/Pictures/Non-edited/522.png"},
  {name:"Touhou Mother", path:"./Assets/Game Data/523-f.html", logo:"./Assets/Pictures/Non-edited/523.png"},
  {name:"Parappa The Rapper", path:"./Assets/Game Data/524.html", logo:"./Assets/Pictures/Non-edited/524.png"},
  {name:"Friday Night Funkin': Darkness Takeover", path:"./Assets/Game Data/525.html", logo:"./Assets/Pictures/Non-edited/525.png"},
  {name:"SpongeBob SquarePants: Land Ho!", path:"./Assets/Game Data/526.html", logo:"./Assets/Pictures/Non-edited/526.png"},
  {name:"SpongeBob SquarePants: SpongeBob Run", path:"./Assets/Game Data/527.html", logo:"./Assets/Pictures/Non-edited/527.png"},
  {name:"SpongeBob SquarePants: Squidward's Sizzlin' Scare", path:"./Assets/Game Data/528.html", logo:"./Assets/Pictures/Non-edited/528.png"},
  {name:"SpongeBob SquarePants: Sandy's Sponge Stacker", path:"./Assets/Game Data/529.html", logo:"./Assets/Pictures/Non-edited/529.png"},
  {name:"SpongeBob SquarePants: Tasty Pastry Party", path:"./Assets/Game Data/530.html", logo:"./Assets/Pictures/Non-edited/530.png"},
  {name:"SpongeBob SquarePants: The Kah-Ray-Tay Squid", path:"./Assets/Game Data/531.html", logo:"./Assets/Pictures/Non-edited/531.png"},
  {name:"SpongeBob SquarePants: WereSquirrel", path:"./Assets/Game Data/532.html", logo:"./Assets/Pictures/Non-edited/532.png"},
  {name:"SpongeBob SquarePants: Krabby Katch", path:"./Assets/Game Data/533.html", logo:"./Assets/Pictures/Non-edited/533.png"},
  {name:"Teen Titans GO!: Jump Jousts", path:"./Assets/Game Data/534.html", logo:"./Assets/Pictures/Non-edited/534.png"},
  {name:"Teen Titans GO!: Jump Jousts 2", path:"./Assets/Game Data/535.html", logo:"./Assets/Pictures/Non-edited/535.png"},
  {name:"Cat Connection", path:"./Assets/Game Data/536.html", logo:"./Assets/Pictures/Non-edited/536.png"},
  {name:"Cat Gunner: Super Zombie Shoot", path:"./Assets/Game Data/537.html", logo:"./Assets/Pictures/Non-edited/537.png"},
  {name:"Love Letters", path:"./Assets/Game Data/538.html", logo:"./Assets/Pictures/Non-edited/538.png"},
  {name:"Chiikawa Puzzle", path:"./Assets/Game Data/539.html", logo:"./Assets/Pictures/Non-edited/539.png"},
  {name:"myTeardrop", path:"./Assets/Game Data/540.html", logo:"./Assets/Pictures/Non-edited/540.png"},
  {name:"Friday Night Funkin': Pibby: Apocalypse", path:"./Assets/Game Data/541.html", logo:"./Assets/Pictures/Non-edited/541.png"},
  {name:"Karlson", path:"./Assets/Game Data/542-a.html", logo:"./Assets/Pictures/Non-edited/542.png"},
  {name:"Jelly Drift", path:"./Assets/Game Data/543-a.html", logo:"./Assets/Pictures/Non-edited/543.png"},
  {name:"Plinko", path:"./Assets/Game Data/544.html", logo:"./Assets/Pictures/Non-edited/544.png"},
  {name:"Clash Of Vikings", path:"./Assets/Game Data/545.html", logo:"./Assets/Pictures/Non-edited/545.png"},
  {name:"Recoil", path:"./Assets/Game Data/546.html", logo:"./Assets/Pictures/Non-edited/546.png"},
  {name:"Sonic the Hedgehog 2: Community's Cut", path:"./Assets/Game Data/549.html", logo:"./Assets/Pictures/Non-edited/549.png"},
  {name:"Sonic the Hedgehog 3: Angel Island Remastered", path:"./Assets/Game Data/550.html", logo:"./Assets/Pictures/Non-edited/550.png"},
  {name:"Hypper Sandbox", path:"./Assets/Game Data/551.html", logo:"./Assets/Pictures/Non-edited/551.png"},
  {name:"Aviamasters", path:"./Assets/Game Data/552.html", logo:"./Assets/Pictures/Non-edited/552.png"},
  {name:"Rolling Sky", path:"./Assets/Game Data/553.html", logo:"./Assets/Pictures/Non-edited/553.png"},
  {name:"Yandere Simulator", path:"./Assets/Game Data/554.html", logo:"./Assets/Pictures/Non-edited/554.png"},
  {name:"Friday Night Funkin VS. KAPI", path:"./Assets/Game Data/555.html", logo:"./Assets/Pictures/Non-edited/555.png"},
  {name:"Friday Night Funkin VS. Sky", path:"./Assets/Game Data/556.html", logo:"./Assets/Pictures/Non-edited/556.png"},
  {name:"Getting Over It with Bennett Foddy", path:"./Assets/Game Data/557.html", logo:"./Assets/Pictures/Non-edited/557.png"},
  {name:"Friday Night Funkin Vs. Cyber Sensation", path:"./Assets/Game Data/558.html", logo:"./Assets/Pictures/Non-edited/558.png"},
  {name:"Friday Night Funkin vs Shaggy", path:"./Assets/Game Data/559.html", logo:"./Assets/Pictures/Non-edited/559.png"},
  {name:"Deltatraveler", path:"./Assets/Game Data/560.html", logo:"./Assets/Pictures/Non-edited/560.png"},
 
  {name:"Boom Slingers: Reboom", path:"./Assets/Game Data/562.html", logo:"./Assets/Pictures/Non-edited/562.png"},
  {name:"CG FC 25", path:"./Assets/Game Data/563.html", logo:"./Assets/Pictures/Non-edited/563.png"},
  {name:"Count Masters: Stickman Games", path:"./Assets/Game Data/564.html", logo:"./Assets/Pictures/Non-edited/564.png"},
  {name:"Dalgona Candy Honeycomb Cookie", path:"./Assets/Game Data/565.html", logo:"./Assets/Pictures/Non-edited/565.png"},
  {name:"Highway Racer", path:"./Assets/Game Data/567.html", logo:"./Assets/Pictures/Non-edited/567.png"},
  {name:"Highway Racer 2 REMASTERED", path:"./Assets/Game Data/568.html", logo:"./Assets/Pictures/Non-edited/568.png"},
  {name:"Hula Hoop Race", path:"./Assets/Game Data/569.html", logo:"./Assets/Pictures/Non-edited/569.png"},
  {name:"Jelly Restaurant", path:"./Assets/Game Data/570.html", logo:"./Assets/Pictures/Non-edited/570.png"},
  {name:"Layers Roll", path:"./Assets/Game Data/571.html", logo:"./Assets/Pictures/Non-edited/571.png"},
  {name:"Lazy Jumper", path:"./Assets/Game Data/572.html", logo:"./Assets/Pictures/Non-edited/572.png"},
  {name:"Man Runner 2048", path:"./Assets/Game Data/573.html", logo:"./Assets/Pictures/Non-edited/573.png"},
  {name:"Pottery Master", path:"./Assets/Game Data/574.html", logo:"./Assets/Pictures/Non-edited/574.png"},
  {name:"Shovel 3D", path:"./Assets/Game Data/575.html", logo:"./Assets/Pictures/Non-edited/575.png"},
  {name:"Sky Riders", path:"./Assets/Game Data/576.html", logo:"./Assets/Pictures/Non-edited/576.png"},
  {name:"Steal Brainrot Online", path:"./Assets/Game Data/577.html", logo:"./Assets/Pictures/Non-edited/577.png"},
  {name:"Stickman and Guns", path:"./Assets/Game Data/578.html", logo:"./Assets/Pictures/Non-edited/578.png"},
  {name:"Super Star Car", path:"./Assets/Game Data/579.html", logo:"./Assets/Pictures/Non-edited/579.png"},
  {name:"Traffic Rider", path:"./Assets/Game Data/580.html", logo:"./Assets/Pictures/Non-edited/580.png"},
  {name:"BuildNow.gg", path:"./Assets/Game Data/581.html", logo:"./Assets/Pictures/Non-edited/581.png"},
  {name:"Friday Night Funkin': Mario's Madness", path:"./Assets/Game Data/582.html", logo:"./Assets/Pictures/Non-edited/582.png"},
  {name:"Friday Night Funkin' vs Hypno Lullaby", path:"./Assets/Game Data/583.html", logo:"./Assets/Pictures/Non-edited/583.png"},
  {name:"Stone Grass Mowing Simulator", path:"./Assets/Game Data/584.html", logo:"./Assets/Pictures/Non-edited/584-a.png"},
  {name:"Fallout", path:"./Assets/Game Data/585.html", logo:"./Assets/Pictures/Non-edited/585.png"},
  {name:"The Oregon Trail", path:"./Assets/Game Data/586.html", logo:"./Assets/Pictures/Non-edited/586.png"},
  {name:"Newgrounds Rumble", path:"./Assets/Game Data/587.html", logo:"./Assets/Pictures/Non-edited/587.png"},
  {name:"Super Mario 64", path:"./Assets/Game Data/588.html", logo:"./Assets/Pictures/Non-edited/588.png"},
  {name:"Sonic CD", path:"./Assets/Game Data/589-f.html", logo:"./Assets/Pictures/Non-edited/589.png"},
  {name:"Sonic Mania", path:"./Assets/Game Data/590-f.html", logo:"./Assets/Pictures/Non-edited/590.png"},
  {name:"Slime Rancher", path:"./Assets/Game Data/591-awe.html", logo:"./Assets/Pictures/Non-edited/591.png"},
  {name:"Pac Man World", path:"./Assets/Game Data/592.html", logo:"./Assets/Pictures/Non-edited/592.png"},
  {name:"Pac Man World 2", path:"./Assets/Game Data/593-f.html", logo:"./Assets/Pictures/Non-edited/593.png"},
  {name:"Waterworks!", path:"./Assets/Game Data/594.html", logo:"./Assets/Pictures/Non-edited/594.png"},
  {name:"Shapez.io", path:"./Assets/Game Data/595.html", logo:"./Assets/Pictures/Non-edited/595.png"},
  
  {name:"Plants vs. Zombies 2 Gardenless", path:"./Assets/Game Data/597-a.html", logo:"./Assets/Pictures/Non-edited/597.png"},
  {name:"Sonic.EXE", path:"./Assets/Game Data/598.html", logo:"./Assets/Pictures/Non-edited/598.png"},
  {name:"Metal Gear Solid", path:"./Assets/Game Data/599.html", logo:"./Assets/Pictures/Non-edited/599.png"},
  {name:"FNF Vs. Hypno's Lullaby v2", path:"./Assets/Game Data/600.html", logo:"./Assets/Pictures/Non-edited/600.png"},
  {name:"FNF Vs. Sonic.EXE 3.0/4.0", path:"./Assets/Game Data/601.html", logo:"./Assets/Pictures/Non-edited/601.png"},
  {name:"Doom 2", path:"./Assets/Game Data/602.html", logo:"./Assets/Pictures/Non-edited/602.png"},
  {name:"Growden.io", path:"./Assets/Game Data/603-aa.html", logo:"./Assets/Pictures/Non-edited/603.png"},
  {name:"Minesweeper Plus", path:"./Assets/Game Data/604-a.html", logo:"./Assets/Pictures/Non-edited/604.png"},
  {name:"Sonic.EXE (ORIGINAL)", path:"./Assets/Game Data/606-e.html", logo:"./Assets/Pictures/Non-edited/606.png"},
  {name:"Tattletail", path:"./Assets/Game Data/607-e.html", logo:"./Assets/Pictures/Non-edited/607.png"},
  {name:"Friday Night Funkin VS Impostor v4", path:"./Assets/Game Data/608.html", logo:"./Assets/Pictures/Non-edited/608.png"},
  {name:"Friday Night Funkin vs Sunday Remastered HD", path:"./Assets/Game Data/609-a.html", logo:"./Assets/Pictures/Non-edited/609.png"},
  {name:"Friday Night Funkin vs Carol V2", path:"./Assets/Game Data/610.html", logo:"./Assets/Pictures/Non-edited/610.png"},
  {name:"The Legend of Zelda Ocarina of Time", path:"./Assets/Game Data/611.html", logo:"./Assets/Pictures/Non-edited/611.png"},
  {name:"The Legend of Zelda Majora's Mask", path:"./Assets/Game Data/612.html", logo:"./Assets/Pictures/Non-edited/612.png"},
  {name:"Friday Night Funkin' Drop and Roll, but Playable", path:"./Assets/Game Data/613.html", logo:"./Assets/Pictures/Non-edited/613.png"},
  {name:"Toy Rider", path:"./Assets/Game Data/614.html", logo:"./Assets/Pictures/Non-edited/614.png"},
  {name:"Friday Night Funkin Vs. Dave and Bambi v3", path:"./Assets/Game Data/615-a.html", logo:"./Assets/Pictures/Non-edited/615.png"},
  {name:"Friday Night Funkin’ Wednesday's Infidelity", path:"./Assets/Game Data/616.html", logo:"./Assets/Pictures/Non-edited/616.png"},
  {name:"Postal", path:"./Assets/Game Data/617-a.html", logo:"./Assets/Pictures/Non-edited/617.png"},
  {name:"FNF vs Bob v2.0 (Bob’s Onslaught)", path:"./Assets/Game Data/618.html", logo:"./Assets/Pictures/Non-edited/618.png"},
  {name:"Friday Night Funkin': Rev-Mixed", path:"./Assets/Game Data/619.html", logo:"./Assets/Pictures/Non-edited/619.png"},
  {name:"Three Goblets", path:"./Assets/Game Data/620.html", logo:"./Assets/Pictures/Non-edited/620.png"},
  {name:"Friday Night Funkin': Gumballs", path:"./Assets/Game Data/621.html", logo:"./Assets/Pictures/Non-edited/621.png"},
  {name:"Oneshot (LEGACY)", path:"./Assets/Game Data/622.html", logo:"./Assets/Pictures/Non-edited/622.png"},
  {name:"Celeste", path:"./Assets/Game Data/623-work.html", logo:"./Assets/Pictures/Non-edited/623.png"},
  {name:"Happy Wheels", path:"./Assets/Game Data/624.html", logo:"./Assets/Pictures/Non-edited/624.png"},
  {name:"Get Yoked", path:"./Assets/Game Data/625.html", logo:"./Assets/Pictures/Non-edited/625.png"},
  {name:"Doom 3", path:"./Assets/Game Data/626-f.html", logo:"./Assets/Pictures/Non-edited/626.png"},
  {name:"Tag", path:"./Assets/Game Data/627.html", logo:"./Assets/Pictures/Non-edited/627.png"},
  {name:"Pizza Tower: Scoutdigo", path:"./Assets/Game Data/628-f.html", logo:"./Assets/Pictures/Non-edited/628.png"},
  {name:"Off", path:"./Assets/Game Data/629.html", logo:"./Assets/Pictures/Non-edited/629.png"},
  {name:"Space Funeral", path:"./Assets/Game Data/630.html", logo:"./Assets/Pictures/Non-edited/630.png"},
  {name:"Endroll", path:"./Assets/Game Data/631-a.html", logo:"./Assets/Pictures/Non-edited/631.png"},
  {name:"Cave Story", path:"./Assets/Game Data/632-a.html", logo:"./Assets/Pictures/Non-edited/632.png"},
  {name:"Friday Night Funkin': VS. Impostor: Alternated", path:"./Assets/Game Data/633.html", logo:"./Assets/Pictures/Non-edited/633.png"},
  {name:"Friday Night Funkin': Chaos Nightmare - Sonic Vs. Fleetway", path:"./Assets/Game Data/634.html", logo:"./Assets/Pictures/Non-edited/634.png"},
  {name:"Spelunky Classic HD", path:"./Assets/Game Data/635.html", logo:"./Assets/Pictures/Non-edited/635.png"},
  {name:"Friday Night Funkin' D-Sides", path:"./Assets/Game Data/636.html", logo:"./Assets/Pictures/Non-edited/636.png"},
  
  {name:"BFDIA 5b: 5*30", path:"./Assets/Game Data/638-f.html", logo:"./Assets/Pictures/Non-edited/638.gif"},
  {name:"Friday Night Funkin' VS Impostor B-Sides", path:"./Assets/Game Data/639.html", logo:"./Assets/Pictures/Non-edited/639.png"},
  {name:"Mutilate a Doll 2", path:"./Assets/Game Data/640.html", logo:"./Assets/Pictures/Non-edited/640.png"},
  {name:"Godzilla Daikaiju Battle Royale", path:"./Assets/Game Data/641.html", logo:"./Assets/Pictures/Non-edited/641.png"},
  {name:"Friday Night Funkin' Sunday Night Suicide: Rookies Edition", path:"./Assets/Game Data/642.html", logo:"./Assets/Pictures/Non-edited/642.png"},
  {name:"Rio Rex", path:"./Assets/Game Data/643.html", logo:"./Assets/Pictures/Non-edited/643.png"},
  {name:"Friday Night Funkin vs Nonsense", path:"./Assets/Game Data/644.html", logo:"./Assets/Pictures/Non-edited/644.png"},
 
  {name:"Super Smash Flash", path:"./Assets/Game Data/647.html", logo:"./Assets/Pictures/Non-edited/647.png"},
  {name:"Mindwave", path:"./Assets/Game Data/648-el.html", logo:"./Assets/Pictures/Non-edited/648.png"},
  {name:"Look Outside", path:"./Assets/Game Data/649.html", logo:"./Assets/Pictures/Non-edited/649.png"},
  {name:"Milk Inside a Bag of Milk Inside a Bag of Milk", path:"./Assets/Game Data/650-f.html", logo:"./Assets/Pictures/Non-edited/650.png"},
  {name:"Milk Outside A Bag Of Milk Outside A Bag Of Milk", path:"./Assets/Game Data/651.html", logo:"./Assets/Pictures/Non-edited/651.png"},
  {name:"1 Date Danger", path:"./Assets/Game Data/653-f.html", logo:"./Assets/Pictures/Non-edited/653.png"},
  {name:"Final Fantasy VII", path:"./Assets/Game Data/654.html", logo:"./Assets/Pictures/Non-edited/654.png"},
  {name:"Goblin Goopmaxxing", path:"./Assets/Game Data/655.html", logo:"./Assets/Pictures/Non-edited/655.png"},
  {name:"Rogue Sergeant The Final Operation", path:"./Assets/Game Data/656.html", logo:"./Assets/Pictures/Non-edited/656.png"},
  {name:"Friday Night Funkin vs Undertale", path:"./Assets/Game Data/657.html", logo:"./Assets/Pictures/Non-edited/657.png"},
  {name:"Midnight Shift", path:"./Assets/Game Data/658.html", logo:"./Assets/Pictures/Non-edited/658.png"},
  {name:"Orange Roulette", path:"./Assets/Game Data/659.html", logo:"./Assets/Pictures/Non-edited/659.png"},
  {name:"Please Dont Touch Anything", path:"./Assets/Game Data/660.html", logo:"./Assets/Pictures/Non-edited/660.png"},
  {name:"Royal Towers: Medieval TD", path:"./Assets/Game Data/661.html", logo:"./Assets/Pictures/Non-edited/661.png"},
  {name:"Going Balls", path:"./Assets/Game Data/662.html", logo:"./Assets/Pictures/Non-edited/662.png"},
  
  {name:"Tall.io", path:"./Assets/Game Data/664.html", logo:"./Assets/Pictures/Non-edited/664.png"},
  {name:"Match Triple 3D", path:"./Assets/Game Data/665.html", logo:"./Assets/Pictures/Non-edited/665.png"},
  {name:"Stick War: Legacy", path:"./Assets/Game Data/666.html", logo:"./Assets/Pictures/Non-edited/666.png"},
  {name:"In Stars and Time", path:"./Assets/Game Data/667-fix.html", logo:"./Assets/Pictures/Non-edited/667.png"},
  {name:"Gorilla Tag", path:"./Assets/Game Data/668-fix2.html", logo:"./Assets/Pictures/Non-edited/668.png"},
  {name:"Terraria", path:"./Assets/Game Data/669.html", logo:"./Assets/Pictures/Non-edited/669.png"},
  {name:"Raldi's Crackhouse", path:"./Assets/Game Data/670.html", logo:"./Assets/Pictures/Non-edited/670.png"},
  {name:"We Become What We Behold", path:"./Assets/Game Data/671.html", logo:"./Assets/Pictures/Non-edited/671.png"},
  {name:"A Difficult Game About Climbing", path:"./Assets/Game Data/672-2.html", logo:"./Assets/Pictures/Non-edited/672.png"},
  {name:"Hobo 1", path:"./Assets/Game Data/673.html", logo:"./Assets/Pictures/Non-edited/673.png"},
  {name:"Hobo 2", path:"./Assets/Game Data/674.html", logo:"./Assets/Pictures/Non-edited/674.png"},
  {name:"Hobo 3", path:"./Assets/Game Data/675.html", logo:"./Assets/Pictures/Non-edited/675.png"},
  {name:"Hobo 4", path:"./Assets/Game Data/676.html", logo:"./Assets/Pictures/Non-edited/676.png"},
  {name:"Hobo 5", path:"./Assets/Game Data/677.html", logo:"./Assets/Pictures/Non-edited/677.png"},
  {name:"Hobo 6", path:"./Assets/Game Data/678.html", logo:"./Assets/Pictures/Non-edited/678.png"},
  {name:"Hobo 7", path:"./Assets/Game Data/679.html", logo:"./Assets/Pictures/Non-edited/679.png"},
  {name:"Kirby Super Star Ultra", path:"./Assets/Game Data/680.html", logo:"./Assets/Pictures/Non-edited/680.png"},
  {name:"Cooking Mama", path:"./Assets/Game Data/681.html", logo:"./Assets/Pictures/Non-edited/681.png"},
  {name:"Cooking Mama 2", path:"./Assets/Game Data/682.html", logo:"./Assets/Pictures/Non-edited/682.png"},
  {name:"Cooking Mama 3", path:"./Assets/Game Data/683.html", logo:"./Assets/Pictures/Non-edited/683.png"},
  {name:"Kirby Squeak Squad", path:"./Assets/Game Data/684.html", logo:"./Assets/Pictures/Non-edited/684.png"},
  {name:"FIFA 11", path:"./Assets/Game Data/685.html", logo:"./Assets/Pictures/Non-edited/685.png"},
  {name:"FIFA 10", path:"./Assets/Game Data/686.html", logo:"./Assets/Pictures/Non-edited/686.png"},
  {name:"Pico's School (1999)", path:"./Assets/Game Data/687.html", logo:"./Assets/Pictures/Non-edited/687.png"},
  {name:"Peggle", path:"./Assets/Game Data/688.html", logo:"./Assets/Pictures/Non-edited/688.png"},
  {name:"Meatboy", path:"./Assets/Game Data/689.html", logo:"./Assets/Pictures/Non-edited/689.png"},
  {name:"Friday Night Funkin': AKAGE", path:"./Assets/Game Data/690.html", logo:"./Assets/Pictures/Non-edited/690.png"},
  {name:"Friday Night Funkin': Heartbreak Havoc [Vs. Sky: REDUX]", path:"./Assets/Game Data/691.html", logo:"./Assets/Pictures/Non-edited/691.png"},
  {name:"Kirby ~ Soft & Wet", path:"./Assets/Game Data/692.html", logo:"./Assets/Pictures/Non-edited/692.png"},
  {name:"Half Life: Opposing Force", path:"./Assets/Game Data/693.html", logo:"./Assets/Pictures/Non-edited/693.png"},
  {name:"Pokemon Firered", path:"./Assets/Game Data/694.html", logo:"./Assets/Pictures/Non-edited/694.png"},
  {name:"Duck Life 8", path:"./Assets/Game Data/695.html", logo:"./Assets/Pictures/Non-edited/695.png"},
  {name:"Pokemon HeartGold", path:"./Assets/Game Data/696.html", logo:"./Assets/Pictures/Non-edited/696.png"},
  {name:"Bank Robbery", path:"./Assets/Game Data/697.html", logo:"./Assets/Pictures/Non-edited/697.png"},
  {name:"Bank Robbery 3", path:"./Assets/Game Data/698.html", logo:"./Assets/Pictures/Non-edited/698.png"},
  {name:"Stickman Destruction", path:"./Assets/Game Data/699.html", logo:"./Assets/Pictures/Non-edited/699.png"},
  {name:"FNF vs Pibby Corrupted", path:"./Assets/Game Data/700.html", logo:"./Assets/Pictures/Non-edited/700.png"},
  {name:"Real Flight Simulator", path:"./Assets/Game Data/701.html", logo:"./Assets/Pictures/Non-edited/701.png"},
  {name:"JavascriptPS1", path:"./Assets/Game Data/702.html", logo:"./Assets/Pictures/Non-edited/702.png"},
  {name:"VS Rewrite: ROUND 2", path:"./Assets/Game Data/703.html", logo:"./Assets/Pictures/Non-edited/703.png"},
  {name:"Five Nights at Freddy's: World Refreshed", path:"./Assets/Game Data/704-fix.html", logo:"./Assets/Pictures/Non-edited/704.png"},
  {name:"Iron Lung", path:"./Assets/Game Data/705-fix.html", logo:"./Assets/Pictures/Non-edited/705.png"},
  {name:"Fear & Hunger", path:"./Assets/Game Data/706-fix.html", logo:"./Assets/Pictures/Non-edited/706.png"},
  {name:"Traffic Racer", path:"./Assets/Game Data/707-fix.html", logo:"./Assets/Pictures/Non-edited/707.png"},
  {name:"Needy Streamer Overload", path:"./Assets/Game Data/708-fix.html", logo:"./Assets/Pictures/Non-edited/708.png"},
  {name:"Survivor.io", path:"./Assets/Game Data/709-fixagain.html", logo:"./Assets/Pictures/Non-edited/709.png"},
  
  {name:"Antonblast", path:"./Assets/Game Data/711.html", logo:"./Assets/Pictures/Non-edited/711.png"},
  {name:"Jumbo Mario", path:"./Assets/Game Data/712-f.html", logo:"./Assets/Pictures/Non-edited/712.png"},
  {name:"Silent Hill", path:"./Assets/Game Data/713.html", logo:"./Assets/Pictures/Non-edited/713.png"},
  {name:"Friday Night Funkin vs Tabi", path:"./Assets/Game Data/714.html", logo:"./Assets/Pictures/Non-edited/714.png"},
  {name:"Friday Night Funkin vs Zardy", path:"./Assets/Game Data/715.html", logo:"./Assets/Pictures/Non-edited/715.png"},
  {name:"Clover Pit", path:"./Assets/Game Data/716-fix2.html", logo:"./Assets/Pictures/Non-edited/716.png"},
  {name:"Peaks of Yore", path:"./Assets/Game Data/717-fix2.html", logo:"./Assets/Pictures/Non-edited/717.png"},
  {name:"Untitled Goose Game", path:"./Assets/Game Data/718.html", logo:"./Assets/Pictures/Non-edited/718.png"},
  {name:"A Game About Feeding A Black Hole", path:"./Assets/Game Data/719.html", logo:"./Assets/Pictures/Non-edited/719.png"},
  {name:"Roulette Hero", path:"./Assets/Game Data/720.html", logo:"./Assets/Pictures/Non-edited/720.png"},
  {name:"Shift at Midnight", path:"./Assets/Game Data/721.html", logo:"./Assets/Pictures/Non-edited/721.png"},
  {name:"Fused 240", path:"./Assets/Game Data/722.html", logo:"./Assets/Pictures/Non-edited/722.png"},
  {name:"Brotato", path:"./Assets/Game Data/723.html", logo:"./Assets/Pictures/Non-edited/723.png"},
  {name:"Endoparasitic 2", path:"./Assets/Game Data/724.html", logo:"./Assets/Pictures/Non-edited/724.png"},
  {name:"ShredSauce", path:"./Assets/Game Data/725-ff.html", logo:"./Assets/Pictures/Non-edited/725.png"},
 
  {name:"Dimension Incident", path:"./Assets/Game Data/727.html", logo:"./Assets/Pictures/Non-edited/727.png"},
  {name:"Fear Assessment", path:"./Assets/Game Data/728.html", logo:"./Assets/Pictures/Non-edited/728.png"},
  {name:"game inside a game inside a game inside a game inside a game inside a game", path:"./Assets/Game Data/729.html", logo:"./Assets/Pictures/Non-edited/729.png"},
  {name:"Cell Machine", path:"./Assets/Game Data/730.html", logo:"./Assets/Pictures/Non-edited/730.png"},
  {name:"Undertale: Last Breath", path:"./Assets/Game Data/731.html", logo:"./Assets/Pictures/Non-edited/731.png"},
  {name:"64 in 1 NES", path:"./Assets/Game Data/732.html", logo:"./Assets/Pictures/Non-edited/732.png"},
  {name:"Tetris", path:"./Assets/Game Data/733.html", logo:"./Assets/Pictures/Non-edited/733.png"},
  {name:"Christmas Massacre", path:"./Assets/Game Data/734.html", logo:"./Assets/Pictures/Non-edited/734.png"},
  {name:"Famidash", path:"./Assets/Game Data/735.html", logo:"./Assets/Pictures/Non-edited/735.png"},
  {name:"Super Mario Bros. Remastered", path:"./Assets/Game Data/736.html", logo:"./Assets/Pictures/Non-edited/736.png"},
  {name:"Saihate Station (さいはて駅)", path:"./Assets/Game Data/737.html", logo:"./Assets/Pictures/Non-edited/737.png"},
  {name:"Dumb Ways to Die", path:"./Assets/Game Data/738-u.html", logo:"./Assets/Pictures/Non-edited/738.png"},
  {name:"Bart Blast", path:"./Assets/Game Data/740.html", logo:"./Assets/Pictures/Non-edited/740.png"},
  {name:"Resident Evil", path:"./Assets/Game Data/741.html", logo:"./Assets/Pictures/Non-edited/741.png"},
  {name:"Resident Evil 2", path:"./Assets/Game Data/742.html", logo:"./Assets/Pictures/Non-edited/742.png"},
  {name:"Power Hover", path:"./Assets/Game Data/743.html", logo:"./Assets/Pictures/Non-edited/743.png"},
  {name:"Escape Road City 2", path:"./Assets/Game Data/744-a.html", logo:"./Assets/Pictures/Non-edited/744.png"},
  {name:"Tetris", path:"./Assets/Game Data/745.html", logo:"./Assets/Pictures/Non-edited/745.png"},
  {name:"Fundamental Paper Novel", path:"./Assets/Game Data/746.html", logo:"./Assets/Pictures/Non-edited/746.png"},
  {name:"Worst Time Simulator", path:"./Assets/Game Data/747.html", logo:"./Assets/Pictures/Non-edited/747.png"},
  {name:"Undertale Last Breath PHASE THREE", path:"./Assets/Game Data/748.html", logo:"./Assets/Pictures/Non-edited/748.png"},
  {name:"Super Monkey Ball 1&2", path:"./Assets/Game Data/749.html", logo:"./Assets/Pictures/Non-edited/749.png"},
 
  
  {name:"Bad Piggies", path:"./Assets/Game Data/752.html", logo:"./Assets/Pictures/Non-edited/752.png"},
  {name:"Breaklock", path:"./Assets/Game Data/753.html", logo:"./Assets/Pictures/Non-edited/753.png"},
  {name:"Minecraft Pocket Edition", path:"./Assets/Game Data/754.html", logo:"./Assets/Pictures/Non-edited/754.png"},
 
  {name:"Witch's Heart", path:"./Assets/Game Data/756-f.html", logo:"./Assets/Pictures/Non-edited/756.png"},
  {name:"Ultrapool", path:"./Assets/Game Data/757.html", logo:"./Assets/Pictures/Non-edited/757.png"},
  {name:"CaseOh's Basics in Eating and Fast Food", path:"./Assets/Game Data/758a.html", logo:"./Assets/Pictures/Non-edited/758.png"},
  {name:"Dice a Million", path:"./Assets/Game Data/759.html", logo:"./Assets/Pictures/Non-edited/759.png"},
  {name:"Overburden", path:"./Assets/Game Data/760.html", logo:"./Assets/Pictures/Non-edited/760.png"},
  {name:"FISH", path:"./Assets/Game Data/761.html", logo:"./Assets/Pictures/Non-edited/761.png"},
  {name:"Cheese Rolling", path:"./Assets/Game Data/762.html", logo:"./Assets/Pictures/Non-edited/762.png"},
  {name:"Flying Gorilla 3D", path:"./Assets/Game Data/763.html", logo:"./Assets/Pictures/Non-edited/763.png"},
  {name:"Five Night's at Shrek's Hotel", path:"./Assets/Game Data/764.html", logo:"./Assets/Pictures/Non-edited/764.png"},
  {name:"Scary Shawarma Kiosk: the ANOMALY", path:"./Assets/Game Data/765.html", logo:"./Assets/Pictures/Non-edited/765.png"},
  {name:"Suika Game", path:"./Assets/Game Data/766.html", logo:"./Assets/Pictures/Non-edited/766.png"},
  {name:"Stick Slasher", path:"./Assets/Game Data/767.html", logo:"./Assets/Pictures/Non-edited/767.png"},
  {name:"Stickman Kombat 2D", path:"./Assets/Game Data/768.html", logo:"./Assets/Pictures/Non-edited/768.png"},
  {name:"Stickman Duel", path:"./Assets/Game Data/769.html", logo:"./Assets/Pictures/Non-edited/769.png"},
  {name:"Sonic Robo Blast 2", path:"./Assets/Game Data/770-update.html", logo:"./Assets/Pictures/Non-edited/770.png"},
  {name:"Hollow Knight: Silksong", path:"./Assets/Game Data/771-z.html", logo:"./Assets/Pictures/Non-edited/771.png"},
  {name:"Sam & Max Hit the Road", path:"./Assets/Game Data/772.html", logo:"./Assets/Pictures/Non-edited/772.png"},
  {name:"Command & Conquer", path:"./Assets/Game Data/773.html", logo:"./Assets/Pictures/Non-edited/773.png"},
  {name:"Mountain Bike Racer", path:"./Assets/Game Data/774.html", logo:"./Assets/Pictures/Non-edited/774.png"},
  {name:"Bart Bash", path:"./Assets/Game Data/775.html", logo:"./Assets/Pictures/Non-edited/775.png"},
  {name:"Your Only Move Is HUSTLE", path:"./Assets/Game Data/776.html", logo:"./Assets/Pictures/Non-edited/776.png"},
  {name:"Outhold", path:"./Assets/Game Data/777.html", logo:"./Assets/Pictures/Non-edited/777.png"},
  {name:"Serial Experiments Lain", path:"./Assets/Game Data/778.html", logo:"./Assets/Pictures/Non-edited/778.png"},
  {name:"I Have No Mouth, and I Must Scream", path:"./Assets/Game Data/779.html", logo:"./Assets/Pictures/Non-edited/779.png"},
  {name:"Thing-Thing Arena 3", path:"./Assets/Game Data/780.html", logo:"./Assets/Pictures/Non-edited/780.png"},
  {name:"Scratch Inc", path:"./Assets/Game Data/781.html", logo:"./Assets/Pictures/Non-edited/781.png"},
  {name:"Um Jammer Lammy", path:"./Assets/Game Data/782f.html", logo:"./Assets/Pictures/Non-edited/782.png"},
  {name:"Apes vs Helium", path:"./Assets/Game Data/783.html", logo:"./Assets/Pictures/Non-edited/783.png"},
  {name:"Gabriel's Awesome Schoolhouse (GASH)", path:"./Assets/Game Data/784.html", logo:"./Assets/Pictures/Non-edited/784.png"},
  {name:"Geometry Dash", path:"./Assets/Game Data/785-upd2.html", logo:"./Assets/Pictures/Non-edited/785.png"},
  {name:"Volley Random", path:"./Assets/Game Data/786.html", logo:"./Assets/Pictures/Non-edited/786.png"},
  {name:"BeatBlock", path:"./Assets/Game Data/787.html", logo:"./Assets/Pictures/Non-edited/787.png"},
  {name:"Vib-Ribbon", path:"./Assets/Game Data/788.html", logo:"./Assets/Pictures/Non-edited/788.png"},
  {name:"Stardew Valley", path:"./Assets/Game Data/789-fix.html", logo:"./Assets/Pictures/Non-edited/789.png"},
  {name:"Helltaker", path:"./Assets/Game Data/790.html", logo:"./Assets/Pictures/Non-edited/790.png"},
  {name:"Who's Your Daddy", path:"./Assets/Game Data/791.html", logo:"./Assets/Pictures/Non-edited/791.png"},
  {name:"Escape Road 3", path:"./Assets/Game Data/792.html", logo:"./Assets/Pictures/Non-edited/792.png"},
  {name:"Lethal Ape", path:"./Assets/Game Data/793.html", logo:"./Assets/Pictures/Non-edited/793.png"},
  {name:"Fear & Hunger 2: Termina", path:"./Assets/Game Data/794-fixed.html", logo:"./Assets/Pictures/Non-edited/794.png"},
  {name:"UvuvwevwevweOnyetenvewveUgwemubwemOssas", path:"./Assets/Game Data/795.html", logo:"./Assets/Pictures/Non-edited/795.png"},
  {name:"Slendytubbies 1", path:"./Assets/Game Data/796.html", logo:"./Assets/Pictures/Non-edited/796.png"},
  {name:"Fih", path:"./Assets/Game Data/797.html", logo:"./Assets/Pictures/Non-edited/797.png"},
  {name:"Hungry Lamu", path:"./Assets/Game Data/798.html", logo:"./Assets/Pictures/Non-edited/798.png"},
  {name:"Hungry Lamu 2", path:"./Assets/Game Data/799-fix.html", logo:"./Assets/Pictures/Non-edited/799.png"},
  {name:"Rocket Goal.io", path:"./Assets/Game Data/800-fix.html", logo:"./Assets/Pictures/Non-edited/800.png"},
  {name:"Trees Hate You", path:"./Assets/Game Data/801-fix.html", logo:"./Assets/Pictures/Non-edited/801.png"},
  {name:"Scampton The Great", path:"./Assets/Game Data/802.html", logo:"./Assets/Pictures/Non-edited/802.png"},

  {name:"Vampire Survivors", path:"./Assets/Game Data/804.html", logo:"./Assets/Pictures/Non-edited/804.png"},
  {name:"Plague Inc", path:"./Assets/Game Data/805.html", logo:"./Assets/Pictures/Non-edited/805.png"},
  {name:"Slendytubbies 2", path:"./Assets/Game Data/806.html", logo:"./Assets/Pictures/Non-edited/806.png"},
  {name:"Slendytubbies 2D", path:"./Assets/Game Data/807.html", logo:"./Assets/Pictures/Non-edited/807.png"},
  {name:"Spaceflight Simulator", path:"./Assets/Game Data/808.html", logo:"./Assets/Pictures/Non-edited/808.png"},
  {name:"Rhythm Heaven", path:"./Assets/Game Data/809.html", logo:"./Assets/Pictures/Non-edited/809.png"},
  {name:"Need For Speed: Carbon", path:"./Assets/Game Data/810-fix.html", logo:"./Assets/Pictures/Non-edited/810.png"},
  {name:"Need For Speed: Most Wanted", path:"./Assets/Game Data/811.html", logo:"./Assets/Pictures/Non-edited/811.png"},
  {name:"Need For Speed: Underground 2", path:"./Assets/Game Data/812.html", logo:"./Assets/Pictures/Non-edited/812.png"},
  {name:"Five Nights at Frickbear's 3", path:"./Assets/Game Data/813-f3.html", logo:"./Assets/Pictures/Non-edited/813.png"},
  {name:"MiSide", path:"./Assets/Game Data/814.html", logo:"./Assets/Pictures/Non-edited/814.png"},
  {name:"Baldi's Basics The Ultra Decompile", path:"./Assets/Game Data/815.html", logo:"./Assets/Pictures/Non-edited/815.png"},
  {name:"-3", path:"./Assets/Game Data/816.html", logo:"./Assets/Pictures/Non-edited/816.png"},
  {name:"-b", path:"./Assets/Game Data/817-f.html", logo:"./Assets/Pictures/Non-edited/817.png"},
  {name:"t³ (T cubed)", path:"./Assets/Game Data/818.html", logo:"./Assets/Pictures/Non-edited/818.png"},
  {name:"20 Minutes Till Dawn", path:"./Assets/Game Data/819-fix2.html", logo:"./Assets/Pictures/Non-edited/819.png"},
  {name:"Phoenix Wright - Ace Attorney", path:"./Assets/Game Data/820-fix.html", logo:"./Assets/Pictures/Non-edited/820.png"},
  {name:"Apollo Justice - Ace Attorney", path:"./Assets/Game Data/821-fix.html", logo:"./Assets/Pictures/Non-edited/821.png"},
  {name:"Phoenix Wright - Ace Attorney - Justice for All", path:"./Assets/Game Data/822.html", logo:"./Assets/Pictures/Non-edited/822.png"},
  
  {name:"Phoenix Wright - Ace Attorney - Trials and Tribulations", path:"./Assets/Game Data/824.html", logo:"./Assets/Pictures/Non-edited/824.png"},
  {name:"Cruelty Squad", path:"./Assets/Game Data/825.html", logo:"./Assets/Pictures/Non-edited/825.png"},
  {name:"Just Shapes & Beats", path:"./Assets/Game Data/826-f.html", logo:"./Assets/Pictures/Non-edited/826.png"},
  {name:"Totally Accurate Battle Simulator (TABS)", path:"./Assets/Game Data/827-f.html", logo:"./Assets/Pictures/Non-edited/827.png"},
  {name:"Animal Crossing (GAMECUBE)", path:"./Assets/Game Data/828.html", logo:"./Assets/Pictures/Non-edited/828.png"},
  {name:"Touhou 1 Touhou-Reiiden", path:"./Assets/Game Data/829.html", logo:"./Assets/Pictures/Non-edited/829.png"},
  {name:"Touhou 2 Touhou-Fuumaroku", path:"./Assets/Game Data/830.html", logo:"./Assets/Pictures/Non-edited/830.png"},
  {name:"Touhou 3 Touhou-Yumejikuu", path:"./Assets/Game Data/831.html", logo:"./Assets/Pictures/Non-edited/831.png"},
  {name:"Touhou 4 Touhou-Gensokyou", path:"./Assets/Game Data/832.html", logo:"./Assets/Pictures/Non-edited/832.png"},
  {name:"Touhou 5 Touhou-Kaikidan", path:"./Assets/Game Data/833.html", logo:"./Assets/Pictures/Non-edited/833.png"},
  {name:"I Wanna Be The Guy", path:"./Assets/Game Data/834.html", logo:"./Assets/Pictures/Non-edited/834.png"},
  {name:"Friday Night Funkin vs Shucks v2", path:"./Assets/Game Data/836.html", logo:"./Assets/Pictures/Non-edited/836.png"},
  {name:"Into Space 2", path:"./Assets/Game Data/837.html", logo:"./Assets/Pictures/Non-edited/837.png"},
  {name:"Vena", path:"./Assets/Game Data/838.html", logo:"./Assets/Pictures/Non-edited/838.png"},
  {name:"s.p.l.i.t", path:"./Assets/Game Data/839.html", logo:"./Assets/Pictures/Non-edited/839.png"},
  {name:"My Talking Baby Hippo", path:"./Assets/Game Data/840-fix2.html", logo:"./Assets/Pictures/Non-edited/840.png"},
  {name:"WarioWare: Touched!", path:"./Assets/Game Data/841.html", logo:"./Assets/Pictures/Non-edited/841.png"},
  
];
// ==============================================

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
let customFavicon = localStorage.getItem("mathmaster_favicon") || "Assets/Pictures/Non-edited/Math-n.png";

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
        changeFavicon("Assets/Pictures/Non-edited/canvas-n.png");
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
        const viewerElement = document.getElementById("viewer");
        const gameFrameElement = document.getElementById("gameFrame");
        if (viewerElement && viewerElement.style.display === "flex" && typeof currentSrc !== 'undefined') {
            const mappings = JSON.parse(localStorage.getItem("mathmaster_game_panic_maps") || "{}");
            if (mappings[currentSrc]) {
                gameFrameElement.src = mappings[currentSrc];
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

function resolveGameUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
    if (rawUrl.startsWith("/iframe.html?url=")) return decodeURIComponent(rawUrl.slice(17));
    return rawUrl;
}

async function importGameCollection() {
    try {
        const response = await fetch('collection.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new TypeError("Oops, we didn't get JSON!");
        
        const data = await response.json();
        const formattedGames = data.games.map(game => ({
            title: game.label,
            image: game.imageUrl,
            url: resolveGameUrl(game.url),
            categories: game.categories || []
        }));

        games.push(...formattedGames);
        renderGamesGrid(); 
    } catch (error) { }
}

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
        } catch (err) {}
    });
}

function initCountdown() {
    const timerDisplay = document.getElementById("countdownTimer");
    const timerContainer = document.getElementById("v3Countdown");
    if (!timerDisplay || !timerContainer) return;

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
            setTimeout(() => { triggerV3Intro(); }, 1000);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerDisplay.innerHTML = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
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

        // LAZY LOAD LOGIC ADDED HERE:
        const frame = targetSection.querySelector('.app-frame');
        if (frame && frame.getAttribute('data-src')) {
            if (frame.tagName === 'OBJECT') {
                if (frame.data.includes('about:blank')) frame.data = frame.getAttribute('data-src');
            } else {
                if (frame.src.includes('about:blank')) frame.src = frame.getAttribute('data-src');
            }
        }
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

let isDockCollapsed = localStorage.getItem('mathmaster_dock_collapsed') === 'true';

function initDockState() {
    const dock = document.getElementById('bottomDock');
    const container = document.getElementById('dockContainer');
    if (!dock || !container) return;

    if (isDockCollapsed) dock.classList.add('collapsed');

    const savedLeft = localStorage.getItem('mathmaster_dock_x');
    const savedTop = localStorage.getItem('mathmaster_dock_y');

    if (savedLeft && savedTop) {
        container.classList.add('dragged');
        
        let x = parseFloat(savedLeft);
        let y = parseFloat(savedTop);
        
        const dockWidth = container.offsetWidth || 300;
        const dockHeight = container.offsetHeight || 80;
        
        x = Math.max(0, Math.min(window.innerWidth - dockWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - dockHeight, y));

        container.style.left = x + 'px';
        container.style.top = y + 'px';
        container.style.bottom = 'auto'; 
    }
}

function toggleDock() {
    const dock = document.getElementById('bottomDock');
    if (!dock) return;
    isDockCollapsed = !isDockCollapsed;
    dock.classList.toggle('collapsed', isDockCollapsed);
    localStorage.setItem('mathmaster_dock_collapsed', isDockCollapsed);
}

const dragHandle = document.getElementById('dockDragHandle');
const dockContainer = document.getElementById('dockContainer');

let isDraggingDock = false;
let dockOffsetX = 0;
let dockOffsetY = 0;

function startDrag(e) {
    if (!dockContainer) return;
    isDraggingDock = true;
    dockContainer.style.bottom = 'auto';

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = dockContainer.getBoundingClientRect();
    dockOffsetX = clientX - rect.left;
    dockOffsetY = clientY - rect.top;

    e.preventDefault();
}

function moveDrag(e) {
    if (!isDraggingDock || !dockContainer) return;
    e.preventDefault(); 
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let newX = clientX - dockOffsetX;
    let newY = clientY - dockOffsetY;

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

document.addEventListener('DOMContentLoaded', initDockState);

function launchDropdownVersion() {
    const select = document.getElementById('versionSelect');
    const url = select.value;
    
    if (!url) {
        alert("Please select a version from the dropdown first!");
        return;
    }
    
    const overlay = document.getElementById('versionRunnerOverlay');
    const versionFrame = document.getElementById('versionFrame');
    
    versionFrame.src = url;
    overlay.style.display = 'block';
}

const knownVersions = ["Beta v1.0.html", "Beta v1.1.html","Beta v1.2.html","v1.0.html","v1.1.html", "v1.2.html","Beta v2.0.html","v2.0.html","v2.1.html","v2.2.html","v2.3.html","index_christmas.html","v2.4.html","v2.5.html","v2.6.html","v2.7.html", ];

function initTimeMachine() {
    const dropdown = document.getElementById('versionDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="" disabled selected>Select a version...</option>';

    knownVersions.forEach(file => {
        let displayName = file.replace('.html', '').replace('v', 'Version ');
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        const opt = document.createElement('option');
        opt.value = `${file}`;
        opt.textContent = displayName;
        dropdown.appendChild(opt);
    });
}

function launchSelectedVersion() {
    const url = document.getElementById('versionDropdown').value;
    if (!url) return;

    const overlay = document.getElementById('versionRunnerOverlay');
    const versionFrame = document.getElementById('versionFrame');
    
    versionFrame.src = url;
    overlay.style.display = 'block';
    
    document.body.style.overflow = 'hidden';
}

function exitVersion() {
    const overlay = document.getElementById('versionRunnerOverlay');
    const versionFrame = document.getElementById('versionFrame');
    
    overlay.style.display = 'none';
    versionFrame.src = '';
    
    document.body.style.overflow = 'auto';
}

window.addEventListener('DOMContentLoaded', initTimeMachine);

function triggerV3Intro() {
    if (localStorage.getItem("mathmaster_v3_intro_played") === "true") {
        document.getElementById("v3Countdown").style.display = "none";
        return;
    }

    const timer = document.getElementById("v3Countdown");
    const flash = document.getElementById("introFlash");
    
    const uiElements = document.querySelectorAll('.home-widget, .home-card, .dock-btn, .header h1, .header div');
    
    uiElements.forEach(el => el.classList.add('ui-hidden'));

    timer.classList.add("zoom-out-of-bounds");

    setTimeout(() => {
        flash.style.opacity = "1"; 
        
        setTimeout(() => {
            timer.style.display = "none"; 
        }, 300);

        setTimeout(() => {
            flash.style.opacity = "0"; 
            
            let delay = 0;
            uiElements.forEach((el) => {
                setTimeout(() => {
                    el.classList.remove('ui-hidden');
                    el.classList.add('ui-reveal');
                }, delay);
                delay += 80; 
            });

            localStorage.setItem("mathmaster_v3_intro_played", "true");
            
        }, 600); 
    }, 2200); 
}

async function renderGamesGrid() {
    const gridEl = document.getElementById("gameGrid");
    if (!gridEl) return;
    gridEl.innerHTML = ""; 
    
    const sortDropdown = document.getElementById('sortDropdown');
    const filterDropdown = document.getElementById('filterDropdown');
    const srchInput = document.getElementById('searchInput');

    const unlocked = typeof isSecretUnlocked === 'function' ? isSecretUnlocked() : false;

    const proxyBtn = document.querySelector('.dock-btn[data-app="app-proxy"]');
    const chatbotBtn = document.querySelector('.dock-btn[data-app="app-chatbot"]');
    
    if (proxyBtn) proxyBtn.style.display = unlocked ? 'flex' : 'none';
    if (chatbotBtn) chatbotBtn.style.display = unlocked ? 'flex' : 'none';

    const sortMethod = sortDropdown ? sortDropdown.value : 'default';
    const filterMethod = filterDropdown ? filterDropdown.value : 'all';
    const searchText = srchInput ? srchInput.value.toLowerCase().trim() : '';

    function appendGameCard(g) {
        const c = document.createElement("div");
        c.className = "card";
        if (g.secret) c.style.border = "1px solid var(--accent-color)"; 

        c.innerHTML = `<img src="${g.logo}"><h3>${g.name}</h3>`;
        c.innerHTML += g.external 
            ? `<button class="btn" onclick="window.open('${g.path}','_blank')">Open</button>`
            : g.newtab
                ? `<button class="btn" onclick="window.open('${g.path}','_blank')" title="Opens in a new tab">Open in Tab</button>`
                : `<button class="btn" onclick="loadGame('${g.path}')">Play</button>`;
        gridEl.appendChild(c);
    }
    
    if (typeof getCustomGames === 'function') {
        const customGames = await getCustomGames();
        if (customGames && customGames.length > 0) {
            const controllerIcon = "Assets/Pictures/Non-edited/Placeholder.png";
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

    if (unlocked) {
        let secretGames = games.filter(g => g.secret);
        secretGames.forEach(g => {
            if (searchText && !g.name.toLowerCase().includes(searchText)) return;
            appendGameCard(g);
        });
    }

    let standardGames = games.filter(g => !g.secret);

    if (searchText) {
        standardGames = standardGames.filter(g => g.name.toLowerCase().includes(searchText));
    }

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

    if (sortMethod === 'az') {
        standardGames.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMethod === 'recent') {
        const recent = JSON.parse(localStorage.getItem('mathmaster_recent')) || [];
        standardGames.sort((a, b) => {
            let idxA = recent.indexOf(a.path);
            let idxB = recent.indexOf(b.path);
            if (idxA === -1) idxA = 99999;
            if (idxB === -1) idxB = 99999;
            return idxA - idxB;
        });
    }

    standardGames.forEach(appendGameCard);
}

function initGameFilters() {
    const sortDropdown = document.getElementById('sortDropdown');
    const filterDropdown = document.getElementById('filterDropdown');
    const srchInput = document.getElementById('searchInput');

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
    
    if (srchInput) srchInput.oninput = () => renderGamesGrid();
    
    syncSettingsUI();
}

function syncSettingsUI() {
    const filter = localStorage.getItem('mathmaster_default_filter') || 'all';
    const sort = localStorage.getItem('mathmaster_default_sort') || 'default';
    
    const setFilter = document.getElementById('settingsDefaultFilter');
    const setSort = document.getElementById('settingsDefaultSort');
    
    if (setFilter) setFilter.value = filter;
    if (setSort) setSort.value = sort;
}

function saveDefaultFilters() {
    const setFilter = document.getElementById('settingsDefaultFilter');
    const setSort = document.getElementById('settingsDefaultSort');
    
    if (setFilter) localStorage.setItem('mathmaster_default_filter', setFilter.value);
    if (setSort) localStorage.setItem('mathmaster_default_sort', setSort.value);
    
    const filterDropdown = document.getElementById('filterDropdown');
    const sortDropdown = document.getElementById('sortDropdown');
    if (filterDropdown && setFilter) filterDropdown.value = setFilter.value;
    if (sortDropdown && setSort) sortDropdown.value = setSort.value;
    
    renderGamesGrid();
}

initGameFilters();
document.addEventListener('DOMContentLoaded', initGameFilters);

function switchSettingsTab(event, tabId) {
    const tabContents = document.querySelectorAll('.settings-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// === GLOBAL DEV CONSOLE & OMNISCIENT TRACKER ===
const globalConsole = document.getElementById('global-dev-console');
const consoleOutputInner = document.getElementById('console-output');
const consoleHandle = document.getElementById('console-drag-handle');

function renderGlobalLog(msg, level = 'log', source = 'MAIN') {
    if (!consoleOutputInner) return;
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    div.style.paddingBottom = '4px';
    div.style.wordWrap = 'break-word';
    
    let color = '#0f0'; 
    if(level === 'warn') color = '#ffcc00';
    if(level === 'error') color = '#ff4a4a';
    if(level === 'network') color = '#ff00ff'; 
    
    let cleanSource = source.split('/').pop() || source;
    if(cleanSource.length > 20) cleanSource = cleanSource.substring(0, 17) + '...';

    div.style.color = color;
    div.innerHTML = `<span style="color: #666;">[${cleanSource}]</span> <span style="font-weight:bold; opacity: 0.8;">[${level.toUpperCase()}]</span> ${msg}`;
    consoleOutputInner.appendChild(div);
    consoleOutputInner.scrollTop = consoleOutputInner.scrollHeight;
}

const origLog = console.log, origWarn = console.warn, origError = console.error;
console.log = (...args) => { origLog(...args); renderGlobalLog(args.join(' '), 'log'); };
console.warn = (...args) => { origWarn(...args); renderGlobalLog(args.join(' '), 'warn'); };
console.error = (...args) => { origError(...args); renderGlobalLog(args.join(' '), 'error'); };

window.addEventListener('error', (e) => renderGlobalLog(`${e.message} at ${e.filename}:${e.lineno}`, 'error'));
window.addEventListener('unhandledrejection', (e) => renderGlobalLog(`Unhandled Promise: ${e.reason}`, 'error'));

const iframePayload = function() {
    if (window.__ludusTrackerInjected) return;
    window.__ludusTrackerInjected = true;

    const sourceName = window.location.pathname.split('/').pop() || 'iframe';
    const sendLog = (level, args) => {
        const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        window.parent.postMessage({ type: 'IFRAME_LOG', level, source: sourceName, message: msg }, '*');
    };

    const oLog = console.log, oWarn = console.warn, oErr = console.error;
    console.log = (...args) => { oLog(...args); sendLog('log', args); };
    console.warn = (...args) => { oWarn(...args); sendLog('warn', args); };
    console.error = (...args) => { oErr(...args); sendLog('error', args); };

    window.addEventListener('error', (e) => sendLog('error', [`Global Error: ${e.message} at ${e.filename}:${e.lineno}`]));
    window.addEventListener('unhandledrejection', (e) => sendLog('error', [`Unhandled Promise: ${e.reason}`]));

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
    
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('error', () => sendLog('network', [`XHR BLOCKED: ${url}`]));
        this.addEventListener('load', () => { if(this.status >= 400) sendLog('network', [`XHR Error: ${url} (Status: ${this.status})`]) });
        origOpen.apply(this, arguments);
    };
};

function attachTrackerToIframe(iframe) {
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc) return;
        
        const script = doc.createElement('script');
        script.textContent = `(${iframePayload.toString()})();`;
        doc.head.appendChild(script);
        
        renderGlobalLog(`Tracker attached to: ${iframe.id || 'Unnamed App'}`, 'log', 'SYSTEM');
    } catch (e) { }
}

document.querySelectorAll('iframe, embed[type="text/html"]').forEach(frame => {
    frame.addEventListener('load', () => attachTrackerToIframe(frame));
});

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

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'IFRAME_LOG') {
        renderGlobalLog(data.message, data.level, data.source);
    }
    
    if (data.type === 'BATCHED_IFRAME_LOGS') {
        data.logs.forEach(log => {
            renderGlobalLog(log.message, log.level, data.source);
        });
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

// === Volume Mixer & Independent Media Controller ===

window.changeVolume = function(target, value) {
    let frameId = target === 'music' ? 'musicFrame' : 
                  target === 'movie' ? 'moviesFrame' : null;
                  
    if (!frameId) return;

    let tgtFrame = document.getElementById(frameId);
    if (tgtFrame && tgtFrame.contentWindow) {
        tgtFrame.contentWindow.postMessage({ 
            target: target, 
            action: 'setVolume', 
            volume: parseFloat(value) 
        }, '*');
    }
};

window.mediaAction = function(target, action) {
    let frameId = target === 'music' ? 'musicFrame' : 
                  target === 'movie' ? 'moviesFrame' : null;
                  
    if (!frameId) return;

    let tgtFrame = document.getElementById(frameId);
    if (tgtFrame && tgtFrame.contentWindow) {
        tgtFrame.contentWindow.postMessage({ 
            target: target, 
            action: action 
        }, '*');
    }
};

const playIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="black"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const pauseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.source === 'movie' || data.target === 'movie') {
        const titleEl = document.getElementById('mix-movie-title'); 
        const playBtn = document.getElementById('mix-movie-play');  
        
        if (titleEl && data.title && data.title !== "Playing Movie") {
            titleEl.textContent = data.title;
        }
        
        if (playBtn && typeof data.paused !== 'undefined') {
            playBtn.innerHTML = !data.paused ? pauseIcon : playIcon; 
        }
    }

    if (data.source === 'music' || data.target === 'music') {
        const playBtn = document.getElementById('mix-music-play');
        if (playBtn && typeof data.paused !== 'undefined') {
            playBtn.innerHTML = !data.paused ? pauseIcon : playIcon;
        }
    }
});

document.getElementById('vol-game')?.addEventListener('input', function(e) {
    const gFrame = document.getElementById('gameFrame');
    if (gFrame && gFrame.contentWindow) {
        const vol = parseFloat(e.target.value);
        
        gFrame.contentWindow.postMessage({ action: 'setGameVolume', volume: vol }, '*');
        
        try {
            const mediaEls = gFrame.contentDocument.querySelectorAll('audio, video');
            mediaEls.forEach(media => media.volume = vol);
        } catch(err) { }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('game-menu-container');
    const dragHandle = document.getElementById('game-menu-header');
    const toggleBtn = document.getElementById('menuToggleBtn');
    const dropdown = document.getElementById('dropdownMenu');

    // 1. Dropdown Toggle (null-checked to prevent crash if element is missing)
    if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // 2. Dragging Logic
    let isDragging = false;
    let offsetX, offsetY;

if (dragHandle) {
    dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return; 
        isDragging = true;
        offsetX = e.clientX - menuContainer.offsetLeft;
        offsetY = e.clientY - menuContainer.offsetTop;
    });
}

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        menuContainer.style.left = (e.clientX - offsetX) + 'px';
        menuContainer.style.top = (e.clientY - offsetY) + 'px';
        menuContainer.style.right = 'auto'; // Disable 'right: 20px' once moved
    });

    document.addEventListener('mouseup', () => isDragging = false);

    // 3. Audio Logic (Re-hooking your sliders)
    const gameSlider = document.getElementById('vol-game');
    const musicSlider = document.getElementById('vol-music');
    const sysSlider = document.getElementById('vol-system');

    gameSlider?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        const gameFrame = document.getElementById('game-frame');
        gameFrame?.contentWindow.postMessage({ action: 'setGameVolume', volume: volume }, '*');
    });

    musicSlider?.addEventListener('input', (e) => {
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) bgMusic.volume = e.target.value;
    });
    
    // Add logic for dashboard, refresh, etc. here...
});
// === LAG RECOVERY SYSTEM ===
(function () {
    const LAG_THRESHOLD_MS = 80;  // a frame taking longer than this counts as slow
    const LAG_FRAMES_NEEDED = 8;  // how many slow frames in a row before acting
    const COOLDOWN_MS = 30000;    // wait 30s before triggering again

    let slowFrames = 0;
    let lastFrame = performance.now();
    let lastCleanup = 0;

    function isMusicLoaded() {
        const mf = document.getElementById('musicFrame');
        if (!mf) return false;
        const src = mf.data || mf.src || '';
        return src !== '' && !src.includes('about:blank');
    }

    function unloadInactiveFrames() {
        const active = document.querySelector('.app-section.active-section');

        document.querySelectorAll('.app-section').forEach(section => {
            if (section === active) return;
            if (section.id === 'app-music' && isMusicLoaded()) return; // keep music alive

            section.querySelectorAll('iframe, embed').forEach(el => {
                if (el.src && !el.src.includes('about:blank')) el.src = 'about:blank';
            });
            section.querySelectorAll('object').forEach(el => {
                if (el.data && !el.data.includes('about:blank')) el.data = 'about:blank';
            });
        });
    }

    function showLagToast() {
        const toast = document.createElement('div');
        toast.textContent = '⚡ Freed up background apps to improve performance.';
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: rgba(20,20,20,0.92); color: white; padding: 10px 20px;
            border-radius: 12px; font-size: 13px; z-index: 99999;
            border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(10px);
            pointer-events: none;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function checkFrame(now) {
        const delta = now - lastFrame;
        lastFrame = now;

        if (delta > LAG_THRESHOLD_MS) {
            slowFrames++;
            if (slowFrames >= LAG_FRAMES_NEEDED && (now - lastCleanup) > COOLDOWN_MS) {
                lastCleanup = now;
                slowFrames = 0;
                unloadInactiveFrames();
                showLagToast();
            }
        } else {
            slowFrames = Math.max(0, slowFrames - 1); // decay on good frames
        }

        requestAnimationFrame(checkFrame);
    }

    requestAnimationFrame(checkFrame);
})();

// =====================================================================
// === CINEMA MODE — triggered when movie.html opens/closes its player ===
// =====================================================================
(function () {
    let _active = false;
    let _preMixerVisible = false;
    let _preDockCollapsed = false;
    let _preDockLeft = null;
    let _preDockTop = null;
    let _preDockHadDragged = false;

    function enterCinemaMode() {
        if (_active) return;
        _active = true;

        // 1. Pause music ------------------------------------------------
        try {
            const mf = document.getElementById('musicFrame');
            if (mf) {
                const doc = mf.contentDocument || (mf.contentWindow && mf.contentWindow.document);
                if (doc) {
                    const media = doc.querySelector('audio, video');
                    if (media && !media.paused) media.pause();
                } else { throw new Error('cross-origin'); }
            }
        } catch (e) {
            const mf = document.getElementById('musicFrame');
            if (mf && mf.contentWindow)
                mf.contentWindow.postMessage({ target: 'music', action: 'togglePlay' }, '*');
        }

        // 2. Slide mixer dock away --------------------------------------
        const mixer = document.getElementById('mixer-dock');
        if (mixer) {
            _preMixerVisible = (mixer.style.display !== 'none' && mixer.style.display !== '');
            if (_preMixerVisible) {
                mixer.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                mixer.style.opacity = '0';
                mixer.style.transform = (mixer.style.transform || '') + ' translateX(130%)';
                setTimeout(() => {
                    mixer.style.display = 'none';
                    mixer.style.opacity = '';
                    mixer.style.transform = '';
                    mixer.style.transition = '';
                }, 360);
            }
        }

        // 3. Collapse + move dock to top-center -------------------------
        const dock      = document.getElementById('bottomDock');
        const container = document.getElementById('dockContainer');
        if (dock && container) {
            _preDockCollapsed   = dock.classList.contains('collapsed');
            _preDockHadDragged  = container.classList.contains('dragged');
            _preDockLeft        = container.style.left;
            _preDockTop         = container.style.top;

            // Collapse it
            if (!_preDockCollapsed) dock.classList.add('collapsed');

            // Animate to top-center
            container.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            container.style.bottom    = 'auto';
            container.style.top       = '16px';
            container.style.left      = '50%';
            container.style.transform = 'translateX(-50%)';
            container.classList.add('dragged');  // prevent auto-snap on resize
            setTimeout(() => { container.style.transition = ''; }, 420);
        }
    }

    function exitCinemaMode() {
        if (!_active) return;
        _active = false;

        // 1. Restore mixer dock -----------------------------------------
        const mixer = document.getElementById('mixer-dock');
        if (mixer && _preMixerVisible) {
            mixer.style.display    = 'block';
            mixer.style.opacity    = '0';
            mixer.style.transform  = 'translateX(130%)';
            mixer.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            // Let the DOM paint the hidden state first, then animate in
            requestAnimationFrame(() => requestAnimationFrame(() => {
                mixer.style.opacity   = '1';
                mixer.style.transform = '';
                setTimeout(() => { mixer.style.transition = ''; }, 360);
            }));
        }

        // 2. Restore dock position + collapse state ---------------------
        const dock      = document.getElementById('bottomDock');
        const container = document.getElementById('dockContainer');
        if (dock && container) {
            // Restore collapse state
            if (!_preDockCollapsed) dock.classList.remove('collapsed');

            container.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            if (_preDockHadDragged && _preDockLeft && _preDockTop) {
                // Was previously dragged to a custom spot — go back there
                container.style.left      = _preDockLeft;
                container.style.top       = _preDockTop;
                container.style.bottom    = 'auto';
                container.style.transform = '';
            } else {
                // Default: bottom center
                container.classList.remove('dragged');
                container.style.left      = '50%';
                container.style.top       = 'auto';
                container.style.bottom    = '20px';
                container.style.transform = 'translateX(-50%)';
            }

            setTimeout(() => { container.style.transition = ''; }, 420);
        }
    }

    // Listen for movie player events
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'ludus-movie') return;
        if (data.action === 'playerOpened') enterCinemaMode();
        else if (data.action === 'playerClosed') exitCinemaMode();
    });
})();
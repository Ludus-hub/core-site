// 1. Import Firebase from the web (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getDatabase, ref as databaseRef, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 2. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKmiGa1lOO6opvUp9yqdEKl3QMpinFt8c",
  authDomain: "sign-in-62bfc.firebaseapp.com",
  databaseURL: "https://sign-in-62bfc-default-rtdb.firebaseio.com",
  projectId: "sign-in-62bfc",
  storageBucket: "sign-in-62bfc.firebasestorage.app",
  messagingSenderId: "406057857767",
  appId: "1:406057857767:web:4af4d2b67c50540c966842"
};

// 3. Initialize Firebase, Auth, Firestore & Realtime Database
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

// A browser profile keeps the same identifier across tabs, while a different
// browser or browser profile gets a different one. Firestore stores the lock,
// which keeps this feature on Firebase's no-cost plan.
const PREMIUM_BROWSER_ID_KEY = "ludus_premium_browser_id";
const PREMIUM_HEARTBEAT_MS = 30000;
const PREMIUM_SESSION_LEASE_MS = 90 * 1000;
let premiumHeartbeatTimer = null;
let premiumSessionUid = null;
let premiumHeartbeatFailures = 0;

const getPremiumBrowserId = () => {
    let browserId = localStorage.getItem(PREMIUM_BROWSER_ID_KEY);
    if (!browserId) {
        browserId = crypto.randomUUID();
        localStorage.setItem(PREMIUM_BROWSER_ID_KEY, browserId);
    }
    return browserId;
};

const stopPremiumHeartbeat = () => {
    if (premiumHeartbeatTimer) clearInterval(premiumHeartbeatTimer);
    premiumHeartbeatTimer = null;
};

const clearPremiumAccess = () => {
    sessionStorage.removeItem("mathmaster_session_unlocked");
    localStorage.setItem("mathmaster_premium", "false");
};

const premiumSessionRef = (uid) => doc(db, "premiumSessions", uid);

const releasePremiumSession = async () => {
    stopPremiumHeartbeat();
    const user = auth.currentUser;
    if (!user || premiumSessionUid !== user.uid) {
        premiumSessionUid = null;
        return;
    }

    premiumSessionUid = null;
    try {
        const browserId = getPremiumBrowserId();
        await runTransaction(db, async (transaction) => {
            const sessionRef = premiumSessionRef(user.uid);
            const current = (await transaction.get(sessionRef)).data();
            if (current?.browserId === browserId) transaction.delete(sessionRef);
        });
    } catch (error) {
        // The Firestore lease expires quickly even if the browser closes
        // before this request can finish.
        console.warn("Could not release the premium session immediately:", error.code || error.message);
    }
};

const denyPremiumSignIn = async (message) => {
    stopPremiumHeartbeat();
    premiumSessionUid = null;
    clearPremiumAccess();
    await signOut(auth);
    alert(message || "This Premium account is already active in another browser. Sign out there before using it here.");
};

const sendPremiumHeartbeat = async () => {
    const user = auth.currentUser;
    if (!user || premiumSessionUid !== user.uid) return;

    try {
        const browserId = getPremiumBrowserId();
        const result = await runTransaction(db, async (transaction) => {
            const sessionRef = premiumSessionRef(user.uid);
            const current = (await transaction.get(sessionRef)).data();
            if (!current || current.browserId !== browserId) {
                return { allowed: false, message: "This Premium session is now active in another browser." };
            }
            const expiresAtMs = Date.now() + PREMIUM_SESSION_LEASE_MS;
            transaction.update(sessionRef, { lastSeenAt: serverTimestamp(), expiresAtMs });
            return { allowed: true, expiresAtMs };
        });
        premiumHeartbeatFailures = 0;
        if (result.allowed !== true) await denyPremiumSignIn(result.message);
    } catch (error) {
        // A brief network drop or Firestore hiccup should not sign someone out. Only give up on a real
        // rejection (rules/permissions) or after several failed checks in a row; the 90 second lease keeps going.
        const transient = ["unavailable", "deadline-exceeded", "aborted", "resource-exhausted", "cancelled"].includes(error?.code)
            || navigator.onLine === false;
        premiumHeartbeatFailures += 1;
        console.warn("Premium heartbeat failed:", error?.code || error?.message);
        if (transient && premiumHeartbeatFailures < 3) return;
        await denyPremiumSignIn("We could not verify your Premium session. Please sign in again.");
    }
};

const startPremiumHeartbeat = (uid) => {
    premiumSessionUid = uid;
    stopPremiumHeartbeat();
    premiumHeartbeatTimer = setInterval(sendPremiumHeartbeat, PREMIUM_HEARTBEAT_MS);
};

const claimPremiumSession = async (user) => {
    const browserId = getPremiumBrowserId();
    const result = await runTransaction(db, async (transaction) => {
        const sessionRef = premiumSessionRef(user.uid);
        const current = (await transaction.get(sessionRef)).data();
        const now = Date.now();
        const isHeldByAnotherBrowser = current
            && current.browserId !== browserId
            && Number(current.expiresAtMs) > now;

        if (isHeldByAnotherBrowser) {
            return {
                allowed: false,
                message: "This Premium account is already active in another browser. Sign out there before using it here."
            };
        }

        const expiresAtMs = now + PREMIUM_SESSION_LEASE_MS;
        transaction.set(sessionRef, {
            browserId,
            createdAt: current?.createdAt || serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            expiresAtMs
        }, { merge: true });
        return { allowed: true, expiresAtMs };
    });
    if (result.allowed !== true) return result;

    startPremiumHeartbeat(user.uid);
    return result;
};
// 4. UI Elements
let isLoginMode = true;
const authTitle = document.getElementById('authTitle');
const authActionBtn = document.getElementById('authActionBtn');
const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
const authTogglePrompt = document.getElementById('authTogglePrompt');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authError = document.getElementById('authError');

// 5. Toggle between Login and Sign Up
if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authTitle.innerText = isLoginMode ? "Log In" : "Create Account";
        authActionBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
        authTogglePrompt.innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthModeBtn.innerText = isLoginMode ? "Sign Up" : "Log In";
        authError.style.display = 'none';
    });
}

// 6. Handle the Submit Button
if (authActionBtn) {
    authActionBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        authError.style.display = 'none';

        sessionStorage.setItem("explicit_login", "true");

        if (isLoginMode) {
            signInWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    await window.LudusDialog.alert("Successfully logged in!", { title: 'Signed in' });
                    document.getElementById('authModal').style.display = 'none';
                })
                .catch((error) => {
                    sessionStorage.removeItem("explicit_login");
                    authError.innerText = error.message.replace("Firebase: ", "");
                    authError.style.display = 'block';
                });
        } else {
            createUserWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    await window.LudusDialog.alert("Account created successfully!", { title: 'Account created' });
                    document.getElementById('authModal').style.display = 'none';
                })
                .catch((error) => {
                    sessionStorage.removeItem("explicit_login");
                    authError.innerText = error.message.replace("Firebase: ", "");
                    authError.style.display = 'block';
                });
        }
    });
}

window.signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        sessionStorage.setItem("explicit_login", "true");
        await signInWithPopup(auth, provider);
        document.getElementById('authModal').style.display = 'none';
    } catch (error) {
        sessionStorage.removeItem("explicit_login");
        const authError = document.getElementById('authError');
        authError.innerText = error.message.replace("Firebase: ", "");
        authError.style.display = 'block';
    }
};

// --- COMPLETE BROWSER SAVE BACKUP ---
// Games use different IndexedDB database names.  Saving only MonochromeDB meant
// their progress (and custom games in GlassExplorerDB) never reached the cloud.
const CLOUD_OVERWRITE_KEY = "ludus_cloud_overwrite_enabled";
const CLOUD_FORMAT_VERSION = 2;
const CLOUD_DB_EXCLUSIONS = ["firebase", "firestore"];
// Realtime Database allows SDK writes below 16 MiB. The check leaves room for
// the metadata and JSON envelope around the base64-encoded compressed backup.
const RTDB_MAX_BACKUP_BASE64_BYTES = 15 * 1024 * 1024;
const RTDB_BASE64_CHUNK_SIZE = 500000;
const CLOUD_LOAD_MARKER_PREFIX = "ludus_cloud_loaded_";

// These identify the current browser or hold short-lived account permissions.
// They must never travel inside a cloud save to another browser.
const CLOUD_LOCAL_EXCLUDED_KEYS = new Set([
    PREMIUM_BROWSER_ID_KEY,
    "mathmaster_premium",
    "mathmaster_dev",
    "mathmaster_device_id",
    "mathmaster_registered_devices",
    // Per-browser bookkeeping for the linked local save folder, not progress.
    "ludus_local_save_synced_at",
    // The music server address is kept in the app's code, not in saves.
    "ludus_music_resolver_url",
    // Which server a browser is using (and any personal servers added in Music) is a per-browser runtime choice.
    // Restoring another browser's value could point this one at a dead tunnel, so it never travels in a save.
    "ludus_active_resolver",
    "ludus_music_custom_resolver"
]);

// Download bookkeeping (which songs are saved offline, their lyrics) must match the blobs on this
// device, so it is never backed up or restored either.
const CLOUD_LOCAL_EXCLUDED_PREFIXES = ["ludus_music_offline_"];
const isDeviceOnlyKey = (key) => CLOUD_LOCAL_EXCLUDED_KEYS.has(key)
    || CLOUD_LOCAL_EXCLUDED_PREFIXES.some(prefix => key.startsWith(prefix));
const captureDeviceOnlyState = () => {
    const state = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null && isDeviceOnlyKey(key)) state[key] = localStorage.getItem(key);
    }
    return state;
};

const shouldSyncLocalKey = (key) => key
    && !isDeviceOnlyKey(key)
    && !key.startsWith(CLOUD_LOAD_MARKER_PREFIX)
    && !key.startsWith("firebase:");
// This is deliberately a new key: many game wrappers were changing the old
// mathmaster_cloud_overwrite key inside their iframe. New accounts now start on.
if (localStorage.getItem(CLOUD_OVERWRITE_KEY) === null) {
    localStorage.setItem(CLOUD_OVERWRITE_KEY, "true");
}
window.isCloudOverwriteEnabled = () => localStorage.getItem(CLOUD_OVERWRITE_KEY) !== "false";

const storageToObject = (storage) => {
    const output = {};
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null) output[key] = storage.getItem(key);
    }
    return output;
};

const restoreCookies = (cookies, replaceExisting = false) => {
    if (replaceExisting) {
        document.cookie.split(";").forEach((cookie) => {
            const name = cookie.split("=")[0]?.trim();
            if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
    }
    if (!cookies) return;
    cookies.split(";").forEach((cookie) => {
        const value = cookie.trim();
        if (value) document.cookie = `${value}; path=/; max-age=31536000; SameSite=Lax`;
    });
};

const bytesToBase64 = (bytes) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
};

const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

// IndexedDB can contain values JSON cannot represent (Blobs, keys, typed arrays,
// undefined, etc.). Encode them before writing a JSON backup to Firebase Storage.
async function encodeSaveValue(value, seen = new WeakSet()) {
    if (value === undefined) return { __ludusType: "undefined" };
    if (typeof value === "bigint") return { __ludusType: "bigint", value: value.toString() };
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Date) return { __ludusType: "date", value: value.toISOString() };
    if (value instanceof Blob) {
        return { __ludusType: "blob", type: value.type, data: bytesToBase64(new Uint8Array(await value.arrayBuffer())) };
    }
    if (value instanceof ArrayBuffer) return { __ludusType: "arrayBuffer", data: bytesToBase64(new Uint8Array(value)) };
    if (ArrayBuffer.isView(value)) {
        return { __ludusType: "typedArray", type: value.constructor.name, data: bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
    }
    if (seen.has(value)) throw new Error("Circular IndexedDB value cannot be backed up");
    seen.add(value);
    try {
        if (value instanceof Map) {
            const entries = [];
            for (const [key, item] of value) entries.push([await encodeSaveValue(key, seen), await encodeSaveValue(item, seen)]);
            return { __ludusType: "map", entries };
        }
        if (value instanceof Set) {
            const values = [];
            for (const item of value) values.push(await encodeSaveValue(item, seen));
            return { __ludusType: "set", values };
        }
        if (value instanceof RegExp) return { __ludusType: "regexp", source: value.source, flags: value.flags };
        if (Array.isArray(value)) {
            const output = [];
            for (const item of value) output.push(await encodeSaveValue(item, seen));
            return output;
        }
        const output = {};
        for (const [key, item] of Object.entries(value)) output[key] = await encodeSaveValue(item, seen);
        return output;
    } finally {
        // Repeated references are valid IndexedDB values; only a reference
        // encountered on the current branch is actually circular.
        seen.delete(value);
    }
}

function decodeSaveValue(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(decodeSaveValue);
    if (value.__ludusType === "undefined") return undefined;
    if (value.__ludusType === "bigint") return BigInt(value.value);
    if (value.__ludusType === "date") return new Date(value.value);
    if (value.__ludusType === "blob") return new Blob([base64ToBytes(value.data)], { type: value.type || "" });
    if (value.__ludusType === "arrayBuffer") return base64ToBytes(value.data).buffer;
    if (value.__ludusType === "map") return new Map(value.entries.map(([key, item]) => [decodeSaveValue(key), decodeSaveValue(item)]));
    if (value.__ludusType === "set") return new Set(value.values.map(decodeSaveValue));
    if (value.__ludusType === "regexp") return new RegExp(value.source, value.flags || "");
    if (value.__ludusType === "typedArray") {
        const bytes = base64ToBytes(value.data);
        const View = globalThis[value.type];
        return typeof View === "function" ? new View(bytes.buffer) : bytes;
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = decodeSaveValue(item);
    return output;
}

const requestResult = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const transactionDone = (transaction) => new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
});

const INDEXED_DB_READ_TIMEOUT_MS = 30000;
async function exportAllIndexedDB() {
    if (!indexedDB.databases) return { databases: {}, note: "IndexedDB enumeration is not supported by this browser." };
    const result = { databases: {} };
    const databases = await indexedDB.databases();

    for (const info of databases) {
        if (!info.name || CLOUD_DB_EXCLUSIONS.some(prefix => info.name.toLowerCase().startsWith(prefix))) continue;
        try {
            const db = await requestResult(indexedDB.open(info.name));
            const backup = { version: db.version, stores: {} };
            for (const storeName of Array.from(db.objectStoreNames)) {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                // Attach the completion listener before awaiting the reads.
                // A small store can finish between getAll() resolving and a
                // later transactionDone(tx) call, leaving an export stuck
                // waiting for an event that has already happened.
                const done = transactionDone(tx);
                // If a timed-out read aborts this transaction, its rejection is
                // already handled by the database-level recovery path below.
                done.catch(() => {});
                // Read schema details while the transaction is still active.
                // Accessing store.index() after awaiting transaction completion
                // caused every IndexedDB backup to fail with InvalidStateError.
                const storeBackup = {
                    keyPath: store.keyPath,
                    autoIncrement: store.autoIncrement,
                    indexes: Array.from(store.indexNames).map(name => {
                        const index = store.index(name);
                        return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
                    }),
                    entries: []
                };
                const [keys, values] = await Promise.all([requestResult(store.getAllKeys()), requestResult(store.getAll())]);
                await transactionDone(tx);
                const entries = [];
                for (let i = 0; i < values.length; i++) {
                    try {
                        entries.push({ key: await encodeSaveValue(keys[i]), value: await encodeSaveValue(values[i]) });
                    } catch (error) {
                        console.warn(`Skipping an unserializable record in ${info.name}/${storeName}:`, error);
                    }
                }
                storeBackup.entries = entries;
                backup.stores[storeName] = storeBackup;
            }
            db.close();
            result.databases[info.name] = backup;
        } catch (error) {
            console.warn(`Could not back up IndexedDB database ${info.name}:`, error);
        } finally {
            db?.close();
        }
    }
    return result;
}

async function openDatabaseForRestore(name, backup) {
    const knownDatabases = indexedDB.databases ? await indexedDB.databases() : [];
    if (knownDatabases.some(info => info.name === name)) return requestResult(indexedDB.open(name));

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, Math.max(backup.version || 1, 1));
        request.onupgradeneeded = () => {
            const db = request.result;
            for (const [storeName, storeInfo] of Object.entries(backup.stores || {})) {
                if (db.objectStoreNames.contains(storeName)) continue;
                const store = db.createObjectStore(storeName, { keyPath: storeInfo.keyPath ?? null, autoIncrement: !!storeInfo.autoIncrement });
                for (const index of storeInfo.indexes || []) {
                    store.createIndex(index.name, index.keyPath, { unique: !!index.unique, multiEntry: !!index.multiEntry });
                }
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function importAllIndexedDB(idbData) {
    for (const [name, backup] of Object.entries(idbData?.databases || {})) {
        if (isExcludedDb(name)) continue; // never let an old cloud save wipe local downloads
        try {
            const db = await openDatabaseForRestore(name, backup);
            for (const [storeName, storeInfo] of Object.entries(backup.stores || {})) {
                if (!db.objectStoreNames.contains(storeName)) continue;
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                store.clear();
                for (const entry of storeInfo.entries || []) {
                    const value = decodeSaveValue(entry.value);
                    store.keyPath === null ? store.put(value, decodeSaveValue(entry.key)) : store.put(value);
                }
                await transactionDone(tx);
            }
            db.close();
        } catch (error) {
            console.warn(`Could not restore IndexedDB database ${name}:`, error);
        }
    }
}

window.createLudusBackup = async (includeSession = true) => ({
    meta: {
        format: "ludus-browser-backup",
        date: new Date().toISOString(),
        version: CLOUD_FORMAT_VERSION
    },
    storage: {
        local: storageToObject(localStorage),
        // A few older games keep progress in first-party cookies rather than
        // Web Storage. Include them so they follow the user too.
        cookies: document.cookie,
        ...(includeSession ? { session: storageToObject(sessionStorage) } : {})
    },
    indexedDB: await exportAllIndexedDB()
});

window.restoreLudusBackup = async (backup, includeSession = true, replaceExisting = false) => {
    if (!backup?.storage?.local) throw new Error("Invalid backup format");
    const currentBrowserState = captureDeviceOnlyState();
    if (replaceExisting) {
        localStorage.clear();
        if (includeSession) sessionStorage.clear();
    }
    Object.entries(backup.storage.local).forEach(([key, value]) => localStorage.setItem(key, value));
    restoreCookies(backup.storage.cookies, replaceExisting);
    if (includeSession && backup.storage.session) {
        Object.entries(backup.storage.session).forEach(([key, value]) => sessionStorage.setItem(key, value));
    }
    await importAllIndexedDB(backup.indexedDB);
};

// script.js may have a backup waiting in sessionStorage after a Google Sites
// reload. Let it finish the IndexedDB portion now that these helpers exist.
window.dispatchEvent(new Event('ludus:backup-tools-ready'));

async function makeCloudBackupFile(backup) {
    const json = JSON.stringify(backup);
    if (typeof CompressionStream !== "function") {
        return { blob: new Blob([json], { type: "application/json" }), compression: "none", extension: "json" };
    }

    const stream = new Blob([json], { type: "application/json" })
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
    const blob = await new Response(stream).blob();
    return { blob, compression: "gzip", extension: "json.gz" };
}

async function readCloudBackupFile(blob, compression) {
    if (compression !== "gzip") return blob.text();
    if (typeof DecompressionStream !== "function") throw new Error("This browser cannot read compressed cloud saves.");
    return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

function splitBackupIntoChunks(base64) {
    const chunks = {};
    for (let offset = 0, index = 0; offset < base64.length; offset += RTDB_BASE64_CHUNK_SIZE, index++) {
        chunks[String(index).padStart(6, "0")] = base64.slice(offset, offset + RTDB_BASE64_CHUNK_SIZE);
    }
    return chunks;
}

function joinBackupChunks(chunks) {
    if (!chunks || typeof chunks !== "object") throw new Error("Cloud backup is missing its data chunks");
    return Object.keys(chunks).sort().map(key => chunks[key]).join("");
}

async function makeRealtimeDatabaseBackup(backup) {
    const file = await makeCloudBackupFile(backup);
    const base64 = bytesToBase64(new Uint8Array(await file.blob.arrayBuffer()));
    if (base64.length > RTDB_MAX_BACKUP_BASE64_BYTES) {
        throw new Error("This backup is too large for Realtime Database. Remove large custom-game files before saving.");
    }
    return {
        format: "ludus-browser-backup",
        version: CLOUD_FORMAT_VERSION,
        savedAt: new Date().toISOString(),
        compression: file.compression,
        byteLength: file.blob.size,
        chunks: splitBackupIntoChunks(base64)
    };
}

async function readRealtimeDatabaseBackup(record) {
    if (!record || record.format !== "ludus-browser-backup") throw new Error("No compatible Realtime Database backup was found");
    const bytes = base64ToBytes(joinBackupChunks(record.chunks));
    return readCloudBackupFile(new Blob([bytes], { type: "application/octet-stream" }), record.compression);
}

// --- AUTOSAVE POLICY ---
// A cloud save reads every IndexedDB store, JSON-encodes, gzips and base64-encodes it, all on the page's main
// thread. Doing that every minute and on every tab switch, whether or not anything changed, competes with the
// music/video iframes for memory. Automatic saves therefore only run when something actually changed:
//   - a synced localStorage key changed (ludus_music_playback ticks every few seconds, so it is ignored),
//   - a game is open (games write to IndexedDB), or
//   - 10 minutes passed since the last full save (safety net for other IndexedDB changes).
// Manual saves and the save made when leaving a game always run. A backup that was too large is not retried
// automatically for 30 minutes, and periodic saves wait while the heap is under pressure.
const AUTOSAVE_VOLATILE_KEYS = new Set(["ludus_music_playback"]);
const AUTOSAVE_SAFETY_MS = 10 * 60 * 1000;
const AUTOSAVE_TOO_LARGE_PAUSE_MS = 30 * 60 * 1000;
const autoSaveState = { fingerprint: "", fullAt: 0, pausedUntil: 0, running: false };
const localSaveFingerprint = () => {
    let hash = 5381, count = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!shouldSyncLocalKey(key) || AUTOSAVE_VOLATILE_KEYS.has(key)) continue;
        const value = localStorage.getItem(key) || "";
        count++;
        for (let c = 0; c < key.length; c++) hash = ((hash << 5) + hash + key.charCodeAt(c)) | 0;
        for (let c = 0; c < value.length; c++) hash = ((hash << 5) + hash + value.charCodeAt(c)) | 0;
    }
    return `${count}:${hash}`;
};
const gameIsOpen = () => {
    const src = document.getElementById("gameFrame")?.getAttribute("src") || "";
    return Boolean(src) && !src.includes("about:blank");
};
const autoSaveWorthRunning = (fingerprint, periodic) => {
    const now = Date.now();
    if (autoSaveState.running || now < autoSaveState.pausedUntil) return false;
    if (periodic && window.LudusCore?.memory.high()) return false;
    return fingerprint !== autoSaveState.fingerprint || gameIsOpen() || now - autoSaveState.fullAt > AUTOSAVE_SAFETY_MS;
};
// --- CLOUD SYNC FUNCTIONS ---
window.saveDataToCloud = async (silent = false) => {
    const user = auth.currentUser;
    if (!user) return;

    const allowOverwrite = window.isCloudOverwriteEnabled();

    if (!allowOverwrite) {
        if (!silent) await window.LudusDialog.alert("Cloud saves are paused. Enable 'Allow Cloud Overwrite' in Settings.", { title: 'Cloud saves paused' });
        else console.log("Autosave skipped: Cloud Overwrite is disabled in settings.");
        return;
    }

    const fingerprint = localSaveFingerprint();
    if (auto && !autoSaveWorthRunning(fingerprint, periodic)) return;
    autoSaveState.running = true;
    try {
        const backup = await window.createLudusBackup(false);
        const cloudBackup = await makeRealtimeDatabaseBackup(backup);
        // Store the compressed JSON below the authenticated user's own UID.
        // Unlike Firestore, Realtime Database supports SDK write requests up
        // to 16 MiB, so this avoids Firestore's 1 MiB document limit.
        await set(databaseRef(realtimeDb, `users/${user.uid}/backup`), cloudBackup);
        if (!silent) await window.LudusDialog.alert("Progress saved to cloud!", { title: 'Cloud save complete' });
        console.log(`Cloud save successful (Realtime Database, ${cloudBackup.compression} backup).`);
    } catch (error) {
        console.error("Error saving to cloud:", error);
        if (!silent) await window.LudusDialog.error(`Cloud save failed: ${error.message || "check Realtime Database rules and try again."}`, { title: 'Cloud save failed' });
    }
};

const triggerAutoSave = () => {
    if (auth.currentUser) window.saveDataToCloud(true);
};

window.addEventListener("beforeunload", triggerAutoSave);
window.addEventListener("pagehide", triggerAutoSave);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') triggerAutoSave();
});

setInterval(() => {
    if (auth.currentUser) {
        console.log("Autosaving progress...");
        window.saveDataToCloud(true);
    }
}, 1 * 60 * 1000);

window.loadDataFromCloud = async (uid, fullLoad = false) => {
    if (!fullLoad) return false;

    try {
        const snapshot = await get(databaseRef(realtimeDb, `users/${uid}/backup`));
        if (!snapshot.exists()) throw new Error("No Realtime Database backup found");
        const backupText = await readRealtimeDatabaseBackup(snapshot.val());
        await window.restoreLudusBackup(JSON.parse(backupText), false, true);
        if (typeof window.renderGamesGrid === "function") window.renderGamesGrid();
        // Tell Ludus Music (which may already be open in an iframe, or open later this session) that account data
        // just arrived, so it can offer to load downloads from the backup folder saved with the account.
        sessionStorage.setItem("ludus_cloud_restored_at", String(Date.now()));
        try {
            const channel = new BroadcastChannel("ludus-cloud");
            channel.postMessage({ type: "restored" });
            channel.close();
        } catch (_) { /* BroadcastChannel unavailable: Music checks the session flag when it opens */ }
        console.log("All localStorage and IndexedDB game saves restored from Realtime Database.");
        return true;
    } catch (error) {
        console.warn("No readable Realtime Database backup found:", error);
    }

    // One-time fallback for a save made by the original Firestore-only code.
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        const legacyLocal = docSnap.data()?.storage?.local;
        if (legacyLocal) {
            const currentBrowserState = captureDeviceOnlyState();
            localStorage.clear();
            Object.entries(legacyLocal).forEach(([key, value]) => localStorage.setItem(key, value));
            if (typeof window.renderGamesGrid === "function") window.renderGamesGrid();
            console.log("Legacy Firestore cloud data restored.");
            return true;
        }
    } catch (error) {
        console.warn("Legacy Firestore backup could not be read:", error);
    }
    return false;
};

window.manualCloudLoad = async () => {
    const user = auth.currentUser;
    if (!user) {
        await window.LudusDialog.alert("You must be signed in to load cloud data.", { title: 'Sign-in required' });
        return;
    }

    const approved = await window.LudusDialog.confirm("This will overwrite your current local saves with your cloud data. Continue?", {
        title: 'Load cloud save', confirmLabel: 'Load'
    });
    if (approved) {
        const loaded = await window.loadDataFromCloud(user.uid, true);
        if (loaded && typeof window.refreshLoadedContentAfterSaveImport === 'function') {
            await window.refreshLoadedContentAfterSaveImport();
        }
        await window.LudusDialog.alert(loaded ? "Save data successfully loaded from the cloud!" : "No cloud save was found.", { title: 'Cloud save' });
    }
};

window.logoutUser = async () => {
    await releasePremiumSession();
    try {
        await signOut(auth);
        sessionStorage.removeItem("mathmaster_session_unlocked");
        sessionStorage.removeItem("mathmaster_dev_unlocked");
        sessionStorage.removeItem("ludus_cloud_restored_at");
        sessionStorage.removeItem("ludus_music_folder_prompt_declined");
        localStorage.removeItem("mathmaster_premium");
        localStorage.removeItem("mathmaster_dev");
        // Auth state listener updates the profile and gated UI. Reloading the
        // outer document here would reload Google Sites rather than this app.
        if (typeof window.renderGamesGrid === 'function') window.renderGamesGrid();
        await window.LudusDialog.alert("Logged out successfully.", { title: 'Signed out' });
    } catch (error) {
        console.error('Could not sign out:', error);
        await window.LudusDialog.error('Could not sign out. Please try again.', { title: 'Sign-out failed' });
    }
};

// 4. Watch for User Login/Logout
let liveSyncListener = null;

onAuthStateChanged(auth, (user) => {
    const profileName = document.getElementById('profileName');
    const profileAction = document.getElementById('profileAction');
    const cloudSaveBtn = document.getElementById('cloudSaveBtn');

    if (user) {
        console.log("User logged in:", user.email);

        // Developer access is granted only after the signed-in user's profile is
        // checked below. Clear any previous tab's value while that check runs.
        sessionStorage.removeItem("mathmaster_dev_unlocked");
        localStorage.setItem("mathmaster_dev", "false");

        clearPremiumAccess();
        const isExplicitLogin = sessionStorage.getItem("explicit_login") === "true";
        const cloudLoadMarker = `${CLOUD_LOAD_MARKER_PREFIX}${user.uid}`;
        // Auth persistence can sign a user into a second approved domain
        // without a fresh, explicit login. Restore once per browser session
        // there as well, so account data follows the user between domains.
        // A manually imported save must win over the remote backup. It will be
        // restored after this module loads, then the page can resume normally.
        const hasPendingLocalRestore = sessionStorage.getItem('ludus_pending_restore') !== null;
        const shouldLoadCloud = !hasPendingLocalRestore && (isExplicitLogin || sessionStorage.getItem(cloudLoadMarker) !== "true");
        if (shouldLoadCloud) {
            window.loadDataFromCloud(user.uid, true).then((loaded) => {
                if (loaded) sessionStorage.setItem(cloudLoadMarker, "true");
            });
        }

        if (isExplicitLogin) {
            sessionStorage.removeItem("explicit_login");
        }

        if (liveSyncListener) liveSyncListener();

        liveSyncListener = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Set Premium Status for Secret Games & Apps
                if (data.isPremium === true) {
                    sessionStorage.setItem("mathmaster_session_unlocked", "true");
                    localStorage.setItem("mathmaster_premium", "true");
                } else {
                    sessionStorage.removeItem("mathmaster_session_unlocked");
                    localStorage.setItem("mathmaster_premium", "false");
                }

                // Keep every developer surface on the same, auth-derived flag.
                // The code app reads the session flag; the dock uses the local
                // flag for its existing UI state.
                const isDeveloper = data.isDev === true;
                if (isDeveloper) {
                    localStorage.setItem("mathmaster_dev", "true");
                    sessionStorage.setItem("mathmaster_dev_unlocked", "true");
                } else {
                    localStorage.setItem("mathmaster_dev", "false");
                    sessionStorage.removeItem("mathmaster_dev_unlocked");
                }

                // Set Premium Status for Secret Games & Apps
                if (data.isPremium === true && isDeveloper) {
                    stopPremiumHeartbeat();
                    premiumSessionUid = null;
                    sessionStorage.setItem("mathmaster_session_unlocked", "true");
                    localStorage.setItem("mathmaster_premium", "true");
                } else if (data.isPremium === true) {
                    try {
                        const session = await claimPremiumSession(user);
                        // A sign-out or account change could have happened while
                        // the server checked the one-browser lock.
                        if (auth.currentUser?.uid !== user.uid) return;

                        if (session.allowed === true) {
                            sessionStorage.setItem("mathmaster_session_unlocked", "true");
                            localStorage.setItem("mathmaster_premium", "true");
                        } else {
                            await denyPremiumSignIn(session.message);
                            return;
                        }
                    } catch (error) {
                        console.warn("Premium session verification failed:", error.code || error.message);
                        await denyPremiumSignIn("We could not start your Premium session. Please try again.");
                        return;
                    }
                } else {
                    await releasePremiumSession();
                    clearPremiumAccess();
                }
                // Immediately refresh UI components to reflect changes
                if (typeof window.checkDevAndPremiumUI === "function") window.checkDevAndPremiumUI();
                if (typeof window.renderGamesGrid === "function") window.renderGamesGrid();
            } else {
                // A signed-in account without a profile has no developer role.
                localStorage.setItem("mathmaster_dev", "false");
                sessionStorage.removeItem("mathmaster_dev_unlocked");
                clearPremiumAccess();
                if (typeof window.checkDevAndPremiumUI === "function") window.checkDevAndPremiumUI();
            }
        }, (error) => console.warn("Firestore profile sync is unavailable:", error.code));

        if(profileName) profileName.innerText = user.email.split('@')[0];
        if(profileAction) {
            profileAction.innerText = "Sign Out";
            profileAction.onclick = window.logoutUser;
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "block";

    } else {
        console.log("No user is logged in.");

        stopPremiumHeartbeat();
        premiumSessionUid = null;
        if (liveSyncListener) {
            liveSyncListener();
            liveSyncListener = null;
        }

        // Clear permissions on sign out
        localStorage.setItem("mathmaster_premium", "false");
        localStorage.setItem("mathmaster_dev", "false");
        sessionStorage.removeItem("mathmaster_dev_unlocked");
        if (typeof window.checkDevAndPremiumUI === "function") window.checkDevAndPremiumUI();

        if(profileName) profileName.innerText = "Guest User";
        if(profileAction) {
            profileAction.innerText = "Sign In →";
            profileAction.onclick = () => document.getElementById('authModal').style.display='flex';
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "none";
    }
});

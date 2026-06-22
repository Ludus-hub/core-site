// 1. Import Firebase from the web (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKmiGa1lOO6opvUp9yqdEKl3QMpinFt8c",
  authDomain: "sign-in-62bfc.firebaseapp.com",
  projectId: "sign-in-62bfc",
  storageBucket: "sign-in-62bfc.firebasestorage.app",
  messagingSenderId: "406057857767",
  appId: "1:406057857767:web:4af4d2b67c50540c966842"
};

// 3. Initialize Firebase, Auth & Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
                .then((userCredential) => {
                    alert("Successfully logged in!");
                    document.getElementById('authModal').style.display = 'none';
                })
                .catch((error) => {
                    sessionStorage.removeItem("explicit_login");
                    authError.innerText = error.message.replace("Firebase: ", "");
                    authError.style.display = 'block';
                });
        } else {
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    alert("Account created successfully!");
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

// --- INDEXEDDB HELPERS ---
const IDB_NAME = "MonochromeDB";
const IDB_VERSION = 11;

const IDB_STORES = [
    "user_playlists", "user_folders", "favorites_tracks", "favorites_albums",
    "favorites_artists", "favorites_playlists", "favorites_mixes",
    "favorites_videos", "history_tracks", "pinned_items", "settings",
];

async function exportIndexedDB() {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(IDB_NAME, IDB_VERSION);
            req.onerror = () => resolve(null);
            req.onsuccess = (e) => {
                const idb = e.target.result;
                const result = {};
                let pending = 0;

                const stores = IDB_STORES.filter(s => idb.objectStoreNames.contains(s));
                if (stores.length === 0) { idb.close(); resolve({}); return; }

                stores.forEach(storeName => {
                    pending++;
                    try {
                        const tx = idb.transaction(storeName, "readonly");
                        const store = tx.objectStore(storeName);
                        const getAllReq = store.getAll();
                        getAllReq.onsuccess = () => {
                            result[storeName] = getAllReq.result || [];
                            if (--pending === 0) { idb.close(); resolve(result); }
                        };
                        getAllReq.onerror = () => {
                            result[storeName] = [];
                            if (--pending === 0) { idb.close(); resolve(result); }
                        };
                    } catch {
                        result[storeName] = [];
                        if (--pending === 0) { idb.close(); resolve(result); }
                    }
                });
            };
            req.onupgradeneeded = (e) => {
                e.target.transaction.abort();
                resolve(null);
            };
        } catch {
            resolve(null);
        }
    });
}

async function importIndexedDB(idbData) {
    if (!idbData || typeof idbData !== "object") return;
    const storeNames = Object.keys(idbData).filter(s => IDB_STORES.includes(s));
    if (storeNames.length === 0) return;

    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(IDB_NAME, IDB_VERSION);
            req.onerror = () => resolve();
            req.onsuccess = (e) => {
                const idb = e.target.result;
                let pending = storeNames.length;
                if (pending === 0) { idb.close(); resolve(); return; }

                storeNames.forEach(storeName => {
                    if (!idb.objectStoreNames.contains(storeName)) {
                        if (--pending === 0) { idb.close(); resolve(); }
                        return;
                    }
                    try {
                        const tx = idb.transaction(storeName, "readwrite");
                        const store = tx.objectStore(storeName);
                        const clearReq = store.clear();
                        clearReq.onsuccess = () => {
                            const items = idbData[storeName] || [];
                            let itemPending = items.length;
                            if (itemPending === 0) {
                                if (--pending === 0) { idb.close(); resolve(); }
                                return;
                            }
                            items.forEach(item => {
                                const putReq = store.put(item);
                                putReq.onsuccess = putReq.onerror = () => {
                                    if (--itemPending === 0) {
                                        if (--pending === 0) { idb.close(); resolve(); }
                                    }
                                };
                            });
                        };
                        clearReq.onerror = () => {
                            if (--pending === 0) { idb.close(); resolve(); }
                        };
                    } catch {
                        if (--pending === 0) { idb.close(); resolve(); }
                    }
                });
            };
        } catch {
            resolve();
        }
    });
}

// --- CLOUD SYNC FUNCTIONS ---
window.saveDataToCloud = async (silent = false) => {
    const user = auth.currentUser;
    if (!user) return; 

    const allowOverwrite = localStorage.getItem("mathmaster_cloud_overwrite") !== "false"; 
    
    if (!allowOverwrite) {
        if (!silent) alert("Cloud saves are paused. Enable 'Allow Cloud Overwrite' in Settings.");
        else console.log("Autosave skipped: Cloud Overwrite is disabled in settings.");
        return;
    }

    try {
        const localData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (val && val.length < 40000) {
                localData[key] = val;
            }
        }

        const idbData = await exportIndexedDB();

        const saveData = {
            storage: {
                local: localData,
                ...(idbData ? { indexeddb: idbData } : {}),
            },
            lastSaved: new Date().toISOString()
        };

        await setDoc(doc(db, "users", user.uid), saveData, { merge: true });
        
        if (!silent) alert("Progress forcibly saved to cloud!");
        console.log("Cloud save successful (localStorage + IndexedDB).");
    } catch (error) {
        console.error("Error saving to cloud:", error);
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
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();

            if (fullLoad && data.storage) {
                if (data.storage.local) {
                    Object.entries(data.storage.local).forEach(([k, v]) => {
                        localStorage.setItem(k, v);
                    });
                    console.log("localStorage successfully overwritten with cloud data.");
                }

                if (data.storage.indexeddb) {
                    await importIndexedDB(data.storage.indexeddb);
                    console.log("IndexedDB successfully overwritten with cloud data.");
                }
                
                if (typeof window.renderGamesGrid === "function") {
                    window.renderGamesGrid();
                }
            }
        }
    } catch (error) {
        console.error("Error loading cloud data:", error);
    }
};

window.manualCloudLoad = () => {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be signed in to load cloud data.");
        return;
    }
    
    if (confirm("This will overwrite your current local saves with your cloud data. Continue?")) {
        window.loadDataFromCloud(user.uid, true).then(() => {
            alert("Save data successfully loaded from the cloud!");
        });
    }
};

window.logoutUser = () => {
    signOut(auth).then(() => {
        sessionStorage.removeItem("mathmaster_session_unlocked");
        localStorage.removeItem("mathmaster_premium");
        localStorage.removeItem("mathmaster_dev");
        alert("Logged out successfully.");
        window.location.reload(); 
    });
};

// 4. Watch for User Login/Logout 
let liveSyncListener = null;

onAuthStateChanged(auth, (user) => {
    const profileName = document.getElementById('profileName');
    const profileAction = document.getElementById('profileAction');
    const cloudSaveBtn = document.getElementById('cloudSaveBtn');

    if (user) {
        console.log("User logged in:", user.email);
        
        const isExplicitLogin = sessionStorage.getItem("explicit_login") === "true";
        window.loadDataFromCloud(user.uid, isExplicitLogin);
        
        if (isExplicitLogin) {
            sessionStorage.removeItem("explicit_login");
        }
        
        if (liveSyncListener) liveSyncListener();
        
        liveSyncListener = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
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

                // Set Dev Status for Dev Controls App
                if (data.isDev === true) {
                    localStorage.setItem("mathmaster_dev", "true");
                } else {
                    localStorage.setItem("mathmaster_dev", "false");
                }
                
                // Immediately refresh UI components to reflect changes
                if (typeof window.checkDevAndPremiumUI === "function") window.checkDevAndPremiumUI();
                if (typeof window.renderGamesGrid === "function") window.renderGamesGrid();
            }
        });

        if(profileName) profileName.innerText = user.email.split('@')[0];
        if(profileAction) {
            profileAction.innerText = "Sign Out";
            profileAction.onclick = window.logoutUser;
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "block";

    } else {
        console.log("No user is logged in.");
        
        if (liveSyncListener) {
            liveSyncListener();
            liveSyncListener = null;
        }

        // Clear permissions on sign out
        localStorage.setItem("mathmaster_premium", "false");
        localStorage.setItem("mathmaster_dev", "false");
        if (typeof window.checkDevAndPremiumUI === "function") window.checkDevAndPremiumUI();
        
        if(profileName) profileName.innerText = "Guest User";
        if(profileAction) {
            profileAction.innerText = "Sign In →";
            profileAction.onclick = () => document.getElementById('authModal').style.display='flex';
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "none";
    }
});
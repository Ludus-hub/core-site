// 1. Import Firebase from the web (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Your exact Firebase configuration
const firebaseConfig = {
  apiKey: "Your_Firebase_Data",
  authDomain: "Your_Firebase_Data",
  projectId: "Your_Firebase_Data",
  storageBucket: "Your_Firebase_Data",
  messagingSenderId: "Your_Firebase_Data",
  appId: "Your_Firebase_Data"
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

        if (isLoginMode) {
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    sessionStorage.setItem("explicit_login", "true"); // Flag for first-time load
                    alert("Successfully logged in!");
                    document.getElementById('authModal').style.display = 'none';
                })
                .catch((error) => {
                    authError.innerText = error.message.replace("Firebase: ", "");
                    authError.style.display = 'block';
                });
        } else {
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    sessionStorage.setItem("explicit_login", "true"); // Flag for first-time load
                    alert("Account created successfully!");
                    document.getElementById('authModal').style.display = 'none';
                })
                .catch((error) => {
                    authError.innerText = error.message.replace("Firebase: ", "");
                    authError.style.display = 'block';
                });
        }
    });
}

// --- CLOUD SYNC FUNCTIONS ---

// 1. Force Overwrite Function (Local -> Cloud)
window.saveDataToCloud = async (silent = false) => {
    const user = auth.currentUser;
    if (!user) return; 

    try {
        const saveData = {
            storage: { local: { ...localStorage } },
            lastSaved: new Date().toISOString()
        };

        // Forcibly overwrite the cloud with EXACTLY what is in local right now
        await setDoc(doc(db, "users", user.uid), saveData, { merge: true });
        
        if (!silent) alert("Progress forcibly saved to cloud!");
        console.log("Cloud save successful.");
    } catch (error) {
        console.error("Error saving to cloud:", error);
    }
};

// 2. The "Tab Close / Reload / Switch Tab" Triggers
// This combination ensures we catch the user leaving or reloading on almost all browsers/devices
const triggerAutoSave = () => {
    if (auth.currentUser) {
        window.saveDataToCloud(true);
    }
};

// Fires when the tab is closed or reloaded
window.addEventListener("beforeunload", triggerAutoSave);
window.addEventListener("unload", triggerAutoSave);

// Fires when navigating away or closing on mobile devices
window.addEventListener("pagehide", triggerAutoSave);

// Fires when switching tabs or minimizing the browser
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') {
        triggerAutoSave();
    }
});

// Keep the 5-minute autosave as a safety net for long, uninterrupted sessions
setInterval(() => {
    if (auth.currentUser) {
        console.log("Autosaving progress...");
        window.saveDataToCloud(true); 
    }
}, 5 * 60 * 1000); 

// 3. Pull Data (Conditional Loading)
window.loadDataFromCloud = async (uid, fullLoad = false) => {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // ALWAYS CHECK FOR PERMISSIONS (Loads 24/7)
            if (data.isPremium === true) {
                sessionStorage.setItem("mathmaster_session_unlocked", "true"); 
            } else {
                sessionStorage.removeItem("mathmaster_session_unlocked");
            }

            if (data.isDev === true) {
                sessionStorage.setItem("mathmaster_dev_unlocked", "true");
            } else {
                sessionStorage.removeItem("mathmaster_dev_unlocked");
            }

            // ONLY push cloud saves into LocalStorage if it's an explicit login or manual button press
            if (fullLoad && data.storage && data.storage.local) {
                Object.entries(data.storage.local).forEach(([k, v]) => {
                    localStorage.setItem(k, v);
                });
                console.log("Local storage successfully overwritten with Cloud Data.");
                
                // Force the grid to redraw
                if (typeof window.renderGamesGrid === "function") {
                    window.renderGamesGrid();
                }
            }
        }
    } catch (error) {
        console.error("Error loading cloud data:", error);
    }
};

// Global function for the new settings button
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
        alert("Logged out successfully.");
        window.location.reload(); 
    });
};

// 4. Watch for User Login/Logout 
onAuthStateChanged(auth, (user) => {
    const profileName = document.getElementById('profileName');
    const profileAction = document.getElementById('profileAction');
    const cloudSaveBtn = document.getElementById('cloudSaveBtn');

    if (user) {
        console.log("User logged in:", user.email);
        
        // Check if the user just clicked the login button, or if the page just refreshed
        const isExplicitLogin = sessionStorage.getItem("explicit_login") === "true";
        
        // Pass the flag to determine if we overwrite local storage
        window.loadDataFromCloud(user.uid, isExplicitLogin);
        
        // Clear the flag so a page refresh doesn't trigger a full download again
        if (isExplicitLogin) {
            sessionStorage.removeItem("explicit_login");
        }
        
        if(profileName) profileName.innerText = user.email.split('@')[0];
        if(profileAction) {
            profileAction.innerText = "Sign Out";
            profileAction.onclick = window.logoutUser;
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "block";

    } else {
        console.log("No user is logged in.");
        if(profileName) profileName.innerText = "Guest User";
        if(profileAction) {
            profileAction.innerText = "Sign In →";
            profileAction.onclick = () => document.getElementById('authModal').style.display='flex';
        }
        if(cloudSaveBtn) cloudSaveBtn.style.display = "none";
    }
});
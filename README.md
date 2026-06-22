Math Master is an open source enterniamnet site. Our services include local games, a music and music streamer, calculator, and file explorer. Our goal is to allow our users acsess to as many things as possible unrestricted. Site works almost fully without any setup. Cannot run fully locally. Will need to setup with Firebase for sign in and cloud capabilities.

Warning! 97% of app was made using generative ai!

Features

* **Stealth & Disguise:** * **Canvas Mode:** Disguise the site as an educational tool ("Quizzes 2").
  * **Custom Tab Identity:** Change the tab title and favicon on the fly.
  * **About:Blank Cloaking:** Launch the site in a hidden `about:blank` tab to bypass browser history tracking.
* **Security & Panic Protocols:**
  * **Global Panic Key:** Instantly redirects the user to a safe URL (e.g., Google) at the press of a button (default: `` ` ``).
  * **In-Game Panic Key:** Swaps the current game for an alternative educational iframe without closing the viewer (default: `]`).
  * **Tab Close Blocker:** Triggers a browser warning if the user attempts to close or reload the page accidentally.
* **Cloud & Local Sync (Powered by Firebase):**
  * Sign up / Log in system to save game progress across devices.
  * Automatic, background cloud syncing triggers on tab close, reload, or page hide.
  * Manual force-sync capabilities.
  * Export/Import local save data as `.json` backups.
* **Extensive Game Library:** Sorted, filterable grid with favorites, recently played, and custom imported HTML games via IndexedDB.
* **Time Machine:** Launch archived, older versions of the MathMaster site via the built-in version runner.

---

Setup & Installation

To host your own instance of MathMaster, you will need to set up a basic web server and link it to your own Google Firebase project for the cloud save features.

Step 1: Clone the Repository
```markdown
git clone [https://github.com/MathMaster-global/MathMaster-Global-v2.0.git](https://github.com/MathMaster-global/MathMaster-Global-v2.0.git)
cd MathMaster-Global-v2.0
```
Step 2: Set up Firebase
Step 2: Firebase Setup (Required for Cloud Saves)
To enable user accounts and cloud syncing, you must configure Firebase:

Go to the Firebase Console and create a new project.

Enable Authentication:

Go to Build > Authentication.

Click Get Started and enable the Email/Password sign-in provider.

Enable Firestore Database:

Go to Build > Firestore Database and click Create database.

Start in Production Mode.

Update your Firestore Security Rules to ensure users can only read/write their own data. Go to the Rules tab and paste this:
```markdown
JavaScript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Only allow users to read and write their own documents
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Get Your Config Keys:

Go to Project Overview > Project Settings (the gear icon).

Scroll down to "Your apps" and add a new Web App (the </> icon).

Register the app (you don't need Firebase Hosting checked).

Copy the firebaseConfig object provided in the script block.

Step 3: Link Firebase to the Code
Open the auth.js file in your cloned repository.

Locate the // 2. Your exact Firebase configuration section (around line 6).

Replace the placeholder firebaseConfig object with the one you copied from your Firebase console:
```markdown
JavaScript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```
Step 4: Run the Site
Because the site uses ES6 Modules (import/export in auth.js) and fetches local JSON files, it cannot be run simply by double-clicking index.html. It must be served over HTTP/HTTPS.
// Change this:
    pipeLogToParent('error', source, message);

    // To this:
    if (window.parent && window.parent.pipeLogToParent) {
        window.parent.pipeLogToParent('error', source, message);
    }
    ```

### **3. The `collection.json` Syntax Error**
*   **The Logs:** `script.js:2063 Failed to load collection.json: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
*   **The Issue:** Your `fetch` call on line 2063 of `script.js` is trying to parse JSON, but the server is returning an HTML document (likely your server's default 404 page, which starts with `<!DOCTYPE html>`). Check the path to `collection.json` to ensure the file actually exists at that route. 

### **4. IndexedDB Schema Mismatch**
*   **The Logs:** `[file.html] [ERROR] Unhandled Promise: NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`
*   **The Issue:** Your local file manager script is attempting a read/write transaction on a database table ("object store") that does not exist. If you recently added a new storage requirement to `file.html`, you need to bump the IndexedDB version number and explicitly create the store inside the `onupgradThe new custom console script is working exactly as intended. It is successfully intercepting the native 404 network events, the unhandled IndexedDB promises, and the JSON syntax errors that were previously vanishing before they could reach your master output. 

Now that the blind spots are gone, here is a breakdown of the specific bugs your master console has exposed and how to patch them.

### **1. The Parenthesis Pathing Bug**
*   **The Logs:** `[http://127.0.0.1:5500/Versions/Assets/Pictures(Non-edited(Placeholder.png](http://127.0.0.1:5500/Versions/Assets/Pictures(Non-edited(Placeholder.png)`
*   **The Issue:** Notice the parentheses `(` in the URL instead of forward slashes `/`. You have a string manipulation function, a regex replacement, or a typo somewhere in your asset-loading logic that is replacing directory separators with open parentheses. This is why `Placeholder.png` is failing to load.

### **2. The Lingering `pipeLogToParent` Error**
*   **The Logs:** `[index-m.html] [ERROR] Uncaught ReferenceError: pipeLogToParent is not defined`
*   **The Issue:** The parent `script.js` has the function, but `index-m.html` is executing within its own isolated window context. It cannot see the parent's `window` object by default.
*   **The Fix:** Inside `index-m.html` (and any other child apps sending logs), you must explicitly target the parent window when calling the function:
    ```javascript
    // Change this:
    pipeLogToParent('error', source, message);

    // To this:
    if (window.parent && window.parent.pipeLogToParent) {
        window.parent.pipeLogToParent('error', source, message);
    }
    ```

### **3. The `collection.json` Syntax Error**
*   **The Logs:** `script.js:2063 Failed to load collection.json: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
*   **The Issue:** Your `fetch` call on line 2063 of `script.js` is trying to parse JSON, but the server is returning an HTML document (likely your server's default 404 page, which starts with `<!DOCTYPE html>`). Check the path to `collection.json` to ensure the file actually exists at that route. 

### **4. IndexedDB Schema Mismatch**
*   **The Logs:** `[file.html] [ERROR] Unhandled Promise: NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`
*   **The Issue:** Your local file manager script is attempting a read/write transaction on a database table ("object store") that does not exist. If you recently added a new storage requirement to `file.html`, you need to bump the IndexedDB version number and explicitly create the store inside the `onupgradeneeded` event listener.

### **5. Missing Butterchurn Presets**
*   **The Logs:** `[index-m.html] [ERROR] ERR_ABORTED 404: [http://127.0.0.1:5500/lib/butterchurnPresets.minThe](http://127.0.0.1:5500/lib/butterchurnPresets.minThe) new custom console script is working exactly as intended. It is successfully intercepting the native 404 network events, the unhandled IndexedDB promises, and the JSON syntax errors that were previously vanishing before they could reach your master output. 

Now that the blind spots are gone, here is a breakdown of the specific bugs your master console has exposed and how to patch them.

### **1. The Parenthesis Pathing Bug**
*   **The Logs:** `[http://127.0.0.1:5500/Versions/Assets/Pictures(Non-edited(Placeholder.png](http://127.0.0.1:5500/Versions/Assets/Pictures(Non-edited(Placeholder.png)`
*   **The Issue:** Notice the parentheses `(` in the URL instead of forward slashes `/`. You have a string manipulation function, a regex replacement, or a typo somewhere in your asset-loading logic that is replacing directory separators with open parentheses. This is why `Placeholder.png` is failing to load.

### **2. The Lingering `pipeLogToParent` Error**
*   **The Logs:** `[index-m.html] [ERROR] Uncaught ReferenceError: pipeLogToParent is not defined`
*   **The Issue:** The parent `script.js` has the function, but `index-m.html` is executing within its own isolated window context. It cannot see the parent's `window` object by default.
*   **The Fix:** Inside `index-m.html` (and any other child apps sending logs), you must explicitly target the parent window when calling the function:
    ```javascript
    // Change this:
    pipeLogToParent('error', source, message);

    // To this:
    if (window.parent && window.parent.pipeLogToParent) {
        window.parent.pipeLogToParent('error', source, message);
    }
    ```

### **3. The `collection.json` Syntax Error**
*   **The Logs:** `script.js:2063 Failed to load collection.json: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
*   **The Issue:** Your `fetch` call on line 2063 of `script.js` is trying to parse JSON, but the server is returning an HTML document (likely your server's default 404 page, which starts with `<!DOCTYPE html>`). Check the path to `collection.json` to ensure the file actually exists at that route. 

### **4. IndexedDB Schema Mismatch**
*   **The Logs:** `[file.html] [ERROR] Unhandled Promise: NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`
*   **The Issue:** Your local file manager script is attempting a read/write transaction on a database table ("object store") that does not exist. If you recently added a new storage requirement to `file.html`, you need to bump the IndexedDB version number and explicitly create the store inside the `onupgradeneeded` event listener.

### **5. Missing Butterchurn Presets**
*   **The Logs:** `[index-m.html] [ERROR] ERR_ABORTED 404: [http://127.0.0.1:5500/lib/butterchurnPresets.min.js](http://127.0.0.1:5500/lib/butterchurnPresets.min.js)`
*   **The Issue:** The music app is looking for the Winamp visualizer library at the absolute root directory (`/lib/`) instead of inside your `Versions/Assets/Apps/music/` folder. Adjust the script `src` tag in `index-m.html` to use a relative path.

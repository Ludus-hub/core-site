Math Master is an open source enterniamnet site. Our services include local games, a music and music streamer, calculator, and file explorer. Our goal is to allow our users acsess to as many things as possible unrestricted.

Setup Details:
Site works almost fully without any setup. Cannot run fully locally. Will need to setup with Firebase for sign in and cloud capabilities.
Your Markdown file is ready
[file-tag: code-generated-file-0-1777011849698275563]

Here is the GitHub README file explaining the site, its limitations, and the necessary Firebase setup. 


MathMaster 

Welcome to the **MathMaster Global v2.0** repository! 

MathMaster is a stealthy, feature-rich web game portal cleverly disguised as a math and educational quiz website. It comes packed with features to ensure uninterrupted, stealthy gameplay, including panic keys, tab cloaking, local/cloud save synchronization, and a massive library of classic web games.

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

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, serverTimestamp } from "firebase-admin/firestore";

initializeApp();

const firestore = getFirestore();
const SESSION_LEASE_MS = 90 * 1000;

function requireBrowserId(request) {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in is required.");
    }

    const browserId = request.data?.browserId;
    if (typeof browserId !== "string" || browserId.length < 20 || browserId.length > 200) {
        throw new HttpsError("invalid-argument", "A valid browser identifier is required.");
    }
    return browserId;
}

async function requirePremium(uid) {
    const profile = await firestore.doc(`users/${uid}`).get();
    if (profile.data()?.isPremium !== true) {
        throw new HttpsError("permission-denied", "This account does not have Premium access.");
    }
    return profile.data();
}

function sessionRef(uid) {
    return firestore.doc(`premiumSessions/${uid}`);
}

// Claims the one active browser for a Premium account. Firestore transactions
// serialize simultaneous claims, so two browsers cannot both win the lock.
export const claimPremiumSession = onCall({ cors: true }, async (request) => {
    const browserId = requireBrowserId(request);
    const uid = request.auth.uid;
    const profile = await requirePremium(uid);

    // Developers retain Premium access but do not take part in the one-browser
    // lease, so they can test the site from multiple browser profiles.
    if (profile.isDev === true) return { allowed: true, developerBypass: true };

    const now = Date.now();
    return firestore.runTransaction(async (transaction) => {
        const ref = sessionRef(uid);
        const current = (await transaction.get(ref)).data();
        const isHeldByAnotherBrowser = current
            && current.browserId !== browserId
            && Number(current.expiresAtMs) > now;

        if (isHeldByAnotherBrowser) {
            return {
                allowed: false,
                message: "This Premium account is already active in another browser. Sign out there before using it here."
            };
        }

        transaction.set(ref, {
            browserId,
            createdAt: current?.createdAt || serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            expiresAtMs: now + SESSION_LEASE_MS
        }, { merge: true });

        return { allowed: true, expiresAtMs: now + SESSION_LEASE_MS };
    });
});

// Keeps the lease alive only for the browser that originally claimed it.
export const heartbeatPremiumSession = onCall({ cors: true }, async (request) => {
    const browserId = requireBrowserId(request);
    const uid = request.auth.uid;
    const profile = await requirePremium(uid);
    if (profile.isDev === true) return { allowed: true, developerBypass: true };

    const now = Date.now();
    return firestore.runTransaction(async (transaction) => {
        const ref = sessionRef(uid);
        const current = (await transaction.get(ref)).data();
        if (!current || current.browserId !== browserId) {
            return {
                allowed: false,
                message: "This Premium session is now active in another browser."
            };
        }

        transaction.update(ref, {
            lastSeenAt: serverTimestamp(),
            expiresAtMs: now + SESSION_LEASE_MS
        });
        return { allowed: true, expiresAtMs: now + SESSION_LEASE_MS };
    });
});

// A normal sign-out releases the lock immediately. If this call is interrupted,
// the 90-second lease expiry still makes the account available again shortly.
export const releasePremiumSession = onCall({ cors: true }, async (request) => {
    const browserId = requireBrowserId(request);
    const uid = request.auth.uid;

    return firestore.runTransaction(async (transaction) => {
        const ref = sessionRef(uid);
        const current = (await transaction.get(ref)).data();
        if (!current || current.browserId !== browserId) return { released: false };

        transaction.delete(ref);
        return { released: true };
    });
});

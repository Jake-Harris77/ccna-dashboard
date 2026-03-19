// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Firebase Sync
//  Syncs localStorage game state ↔ Firestore
//  Offline-first: localStorage is primary, Firestore is sync layer
// ─────────────────────────────────────────────────────────────────────────────

var FirebaseSync = (function () {
  'use strict';

  const db   = FirebaseApp.db;
  const ANKI_KEY = 'ccna_anki_game';
  const QUIZ_KEY = 'ccna_quiz_stats';

  let currentUser = null;
  let syncEnabled = false;

  // Debounce timer for batching rapid saves
  let saveTimer = null;
  const SAVE_DELAY = 2000; // 2s debounce

  // ── DOM refs ──────────────────────────────────────────────
  const syncIndicator = document.getElementById('syncIndicator');
  const syncText      = document.getElementById('syncText');

  function setSyncStatus (status, text) {
    if (!syncIndicator) return;
    syncIndicator.className = 'sync-indicator active ' + status;
    if (syncText) syncText.textContent = text;

    // Auto-hide after 3s for "synced"
    if (status === 'synced') {
      setTimeout(function () {
        syncIndicator.classList.remove('active');
      }, 3000);
    }
  }

  // ── User doc reference helpers ────────────────────────────
  function userDoc ()      { return db.collection('users').doc(currentUser.uid); }
  function ankiDoc ()      { return userDoc().collection('gameState').doc('anki'); }
  function quizDoc ()      { return userDoc().collection('gameState').doc('quiz'); }

  // ── On sign in: pull cloud data ───────────────────────────
  async function onSignIn (user) {
    currentUser = user;
    syncEnabled = true;

    setSyncStatus('syncing', 'Syncing…');

    try {
      // Ensure profile doc exists with expanded data
      var anki = loadLocal(ANKI_KEY) || {};
      var conquered = 0;
      if (anki.sections) {
        for (var sid in anki.sections) {
          if (anki.sections[sid].defeated) conquered++;
        }
      }
      await userDoc().set({
        displayName:      user.displayName || user.email.split('@')[0],
        photoURL:         user.photoURL || null,
        email:            user.email,
        xp:               anki.xp || 0,
        level:            levelFromXP(anki.xp || 0),
        totalCorrect:     anki.totalCorrect || 0,
        bestStreak:       anki.bestStreak || 0,
        sectionsConquered: conquered,
        lastSeen:         firebase.firestore.FieldValue.serverTimestamp(),
        joinedAt:         firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Pull cloud game state
      await pullFromCloud();

      setSyncStatus('synced', 'Synced');
    } catch (err) {
      console.error('Sync error on sign-in:', err);
      setSyncStatus('error', 'Sync failed');
    }
  }

  function onSignOut () {
    currentUser = null;
    syncEnabled = false;
    if (syncIndicator) syncIndicator.classList.remove('active');
  }

  // ── Pull cloud state into localStorage ────────────────────
  async function pullFromCloud () {
    const [ankiSnap, quizSnap] = await Promise.all([
      ankiDoc().get(),
      quizDoc().get(),
    ]);

    // ANKI merge
    const localAnki = loadLocal(ANKI_KEY);
    const cloudAnki = ankiSnap.exists ? ankiSnap.data().state : null;

    if (cloudAnki && localAnki) {
      // Keep whichever has more XP
      if ((cloudAnki.xp || 0) > (localAnki.xp || 0)) {
        saveLocal(ANKI_KEY, cloudAnki);
      } else if ((localAnki.xp || 0) > (cloudAnki.xp || 0)) {
        // Local wins — push it to cloud
        await ankiDoc().set({ state: localAnki, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
      // If equal XP, keep local (no-op)
    } else if (cloudAnki && !localAnki) {
      saveLocal(ANKI_KEY, cloudAnki);
    } else if (localAnki && !cloudAnki) {
      await ankiDoc().set({ state: localAnki, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    // Quiz merge — cloud has more entries = use cloud, else push local
    const localQuiz = loadLocal(QUIZ_KEY);
    const cloudQuiz = quizSnap.exists ? quizSnap.data().state : null;

    if (cloudQuiz && localQuiz) {
      const cloudSize = Object.keys(cloudQuiz).length;
      const localSize = Object.keys(localQuiz).length;
      if (cloudSize > localSize) {
        saveLocal(QUIZ_KEY, cloudQuiz);
      } else {
        await quizDoc().set({ state: localQuiz, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    } else if (cloudQuiz && !localQuiz) {
      saveLocal(QUIZ_KEY, cloudQuiz);
    } else if (localQuiz && !cloudQuiz) {
      await quizDoc().set({ state: localQuiz, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    // Update profile with current level/XP
    const finalAnki = loadLocal(ANKI_KEY);
    if (finalAnki) {
      await userDoc().set({
        xp:    finalAnki.xp || 0,
        level: levelFromXP(finalAnki.xp || 0),
      }, { merge: true });
    }
  }

  // ── Push to cloud (debounced) ─────────────────────────────
  function saveAnki () {
    if (!syncEnabled) return;
    debouncedSave();
  }

  function saveQuiz () {
    if (!syncEnabled) return;
    debouncedSave();
  }

  function debouncedSave () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(pushToCloud, SAVE_DELAY);
  }

  async function pushToCloud () {
    if (!syncEnabled || !currentUser) return;

    setSyncStatus('syncing', 'Saving…');

    try {
      const anki = loadLocal(ANKI_KEY);
      const quiz = loadLocal(QUIZ_KEY);
      const batch = db.batch();

      if (anki) {
        batch.set(ankiDoc(), { state: anki, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        // Update profile with expanded stats
        var conquered = 0;
        if (anki.sections) {
          for (var sid in anki.sections) {
            if (anki.sections[sid].defeated) conquered++;
          }
        }
        batch.set(userDoc(), {
          xp:                anki.xp || 0,
          level:             levelFromXP(anki.xp || 0),
          totalCorrect:      anki.totalCorrect || 0,
          bestStreak:        anki.bestStreak || 0,
          sectionsConquered: conquered,
          lastSeen:          firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      if (quiz) {
        batch.set(quizDoc(), { state: quiz, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }

      await batch.commit();
      setSyncStatus('synced', 'Saved');
    } catch (err) {
      console.error('Sync push error:', err);
      setSyncStatus('error', 'Save failed');
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function loadLocal (key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch (_) { return null; }
  }

  function saveLocal (key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (_) {}
  }

  function levelFromXP (xp) {
    let lvl = 1;
    while (lvl * (lvl - 1) * 50 <= xp) lvl++;
    return lvl - 1;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    onSignIn:       onSignIn,
    onSignOut:      onSignOut,
    saveAnki:       saveAnki,
    saveQuiz:       saveQuiz,
    getCurrentUser: function () { return currentUser; },
    getDb:          function () { return db; },
    isSignedIn:     function () { return syncEnabled && currentUser !== null; },
  };

})();

// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Firebase Authentication
//  Google + Email/Password sign-in, topbar UI, auth state management
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const auth = FirebaseApp.auth;

  // ── DOM refs ──────────────────────────────────────────────
  const signInBtn       = document.getElementById('authSignInBtn');
  const userInfo        = document.getElementById('authUserInfo');
  const avatar          = document.getElementById('authAvatar');
  const avatarPlc       = document.getElementById('authAvatarPlaceholder');
  const userName        = document.getElementById('authUserName');
  const signOutBtn      = document.getElementById('authSignOutBtn');
  const loginOverlay    = document.getElementById('loginOverlay');
  const loginClose      = document.getElementById('loginClose');
  const loginGoogleBtn  = document.getElementById('loginGoogleBtn');
  const loginEmailForm  = document.getElementById('loginEmailForm');
  const loginEmail      = document.getElementById('loginEmail');
  const loginPassword   = document.getElementById('loginPassword');
  const loginSubmitBtn  = document.getElementById('loginSubmitBtn');
  const loginToggleText = document.getElementById('loginToggleText');
  const loginToggleLink = document.getElementById('loginToggleLink');
  const loginError      = document.getElementById('loginError');

  let isSignUp = false;

  // ── Show / hide login modal ───────────────────────────────
  function openLogin () {
    loginOverlay.classList.add('active');
    loginError.classList.remove('active');
    loginEmail.value = '';
    loginPassword.value = '';
  }

  function closeLogin () {
    loginOverlay.classList.remove('active');
  }

  signInBtn.addEventListener('click', openLogin);
  loginClose.addEventListener('click', closeLogin);
  loginOverlay.addEventListener('click', function (e) {
    if (e.target === loginOverlay) closeLogin();
  });

  // ── Toggle sign-in / sign-up ──────────────────────────────
  loginToggleLink.addEventListener('click', function () {
    isSignUp = !isSignUp;
    loginSubmitBtn.textContent  = isSignUp ? 'Create Account' : 'Sign In';
    loginToggleText.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
    loginToggleLink.textContent = isSignUp ? 'Sign in' : 'Create one';
    loginError.classList.remove('active');
  });

  // ── Google sign-in ────────────────────────────────────────
  loginGoogleBtn.addEventListener('click', function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function () {
      closeLogin();
    }).catch(showError);
  });

  // ── Email sign-in / sign-up ───────────────────────────────
  loginEmailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const pass  = loginPassword.value;

    if (!email || !pass) return;

    const action = isSignUp
      ? auth.createUserWithEmailAndPassword(email, pass)
      : auth.signInWithEmailAndPassword(email, pass);

    action.then(function () {
      closeLogin();
    }).catch(showError);
  });

  // ── Sign out ──────────────────────────────────────────────
  signOutBtn.addEventListener('click', function () {
    auth.signOut();
  });

  // ── Error display ─────────────────────────────────────────
  function showError (err) {
    let msg = err.message || 'Something went wrong';
    // Friendlier messages
    if (err.code === 'auth/user-not-found')          msg = 'No account found with that email.';
    if (err.code === 'auth/wrong-password')           msg = 'Incorrect password.';
    if (err.code === 'auth/invalid-credential')       msg = 'Invalid email or password.';
    if (err.code === 'auth/email-already-in-use')     msg = 'An account with that email already exists.';
    if (err.code === 'auth/weak-password')            msg = 'Password must be at least 6 characters.';
    if (err.code === 'auth/popup-closed-by-user')     return; // user closed popup, ignore
    if (err.code === 'auth/cancelled-popup-request')  return;

    loginError.textContent = msg;
    loginError.classList.add('active');
  }

  // ── Topbar avatar (game avatar + border) ─────────────────
  function updateTopbarAvatar () {
    if (typeof Profile === 'undefined') return;
    var prof = Profile.loadProfile();
    avatar.style.display = 'none';
    avatarPlc.style.display = 'none';
    var wrap = avatar.parentElement;
    var existing = wrap.querySelector('.topbar-game-avatar');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'topbar-game-avatar';
    div.innerHTML = Profile.getAvatarWithBorder(prof.avatar, prof.border, 32);
    wrap.insertBefore(div, avatar);
  }

  // Expose globally so profile page can refresh topbar on avatar change
  window.updateTopbarAvatar = updateTopbarAvatar;

  // ── Auth state listener ───────────────────────────────────
  auth.onAuthStateChanged(function (user) {
    if (user) {
      // Signed in
      signInBtn.style.display = 'none';
      userInfo.classList.add('active');

      // Avatar — use game avatar + border if available
      updateTopbarAvatar();
      if (avatar.parentElement.querySelector('.topbar-game-avatar')) {
        // Game avatar inserted — hide photo & placeholder
        avatar.style.display = 'none';
        avatarPlc.style.display = 'none';
      } else if (user.photoURL) {
        avatar.src = user.photoURL;
        avatar.style.display = 'block';
        avatarPlc.style.display = 'none';
      } else {
        avatar.style.display = 'none';
        avatarPlc.style.display = 'flex';
        avatarPlc.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
      }

      // Name
      userName.textContent = user.displayName || user.email.split('@')[0];

      // Sync from cloud on sign-in
      if (typeof FirebaseSync !== 'undefined') {
        FirebaseSync.onSignIn(user);
      }

    } else {
      // Signed out
      signInBtn.style.display = '';
      userInfo.classList.remove('active');
      avatar.style.display = 'none';
      avatarPlc.style.display = 'none';
      userName.textContent = '';

      if (typeof FirebaseSync !== 'undefined') {
        FirebaseSync.onSignOut();
      }
    }
  });

})();

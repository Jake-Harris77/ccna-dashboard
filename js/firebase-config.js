// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Firebase Configuration (Compat SDK)
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyCU0OG3lQMKpINfJazrtHJ56FC1kelMkp4",
  authDomain: "ccna-study-helper.firebaseapp.com",
  projectId: "ccna-study-helper",
  storageBucket: "ccna-study-helper.firebasestorage.app",
  messagingSenderId: "908882342637",
  appId: "1:908882342637:web:2ffc8b4fd5f0297e3a92e4"
};

firebase.initializeApp(firebaseConfig);

const FirebaseApp = {
  auth: firebase.auth(),
  db:   firebase.firestore(),
};

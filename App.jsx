// ── FIREBASE ──────────────────────────────────────────────────────────────────
const FB = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "YOUR_FIREBASE_API_KEY",

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "YOUR_PROJECT.firebaseapp.com",

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    "YOUR_PROJECT_ID",

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "YOUR_PROJECT.appspot.com",

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "000000000000",

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "YOUR_APP_ID",
};

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let gProvider = null;

try {
  fbApp = initializeApp(FB);

  fbAuth = getAuth(fbApp);

  fbDb = getFirestore(fbApp);

  gProvider = new GoogleAuthProvider();

  gProvider.setCustomParameters({
    prompt: "select_account",
  });

} catch (e) {
  console.error("❌ Firebase Initialization Error:", e);
}

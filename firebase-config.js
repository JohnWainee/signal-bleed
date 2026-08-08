/* SIGNAL BLEED — Firebase configuration
 * Until you fill this in, the table runs in single-device mode (localStorage).
 *
 * To go multiplayer:
 * 1. console.firebase.google.com → Add project (analytics off)
 * 2. Build → Realtime Database → Create (locked mode) → paste rules from firebase.rules.json
 * 3. Build → Authentication → enable Anonymous provider
 * 4. Project settings → Your apps → Web → copy the config object below
 * These values are safe to publish; the database rules are the security layer.
 */
window.SB_FIREBASE_CONFIG = {
  // apiKey: "...",
  // authDomain: "signal-bleed-xxxxx.firebaseapp.com",
  // databaseURL: "https://signal-bleed-xxxxx-default-rtdb.firebaseio.com",
  // projectId: "signal-bleed-xxxxx",
  // appId: "..."
};

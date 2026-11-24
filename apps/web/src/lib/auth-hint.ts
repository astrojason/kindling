// Firebase Auth restores a session asynchronously, so on first paint `user` is
// null even for a returning visitor. We remember (per browser) that a session
// existed and expose it as `<html data-auth-hint>` before first paint, so the
// UI can show a spinner instead of flashing the landing page. The server HTML
// and first-time visitors (including crawlers) carry no hint and see the
// landing page. The hint only affects presentation; auth is still decided by
// Firebase.
export const AUTH_HINT_KEY = "kindling:signed-in";
export const AUTH_HINT_ATTRIBUTE = "data-auth-hint";

export const AUTH_HINT_SCRIPT = `try{if(localStorage.getItem("${AUTH_HINT_KEY}")==="1")document.documentElement.setAttribute("${AUTH_HINT_ATTRIBUTE}","")}catch(e){console.error("Could not read the sign-in hint",e)}`;

export function writeAuthHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(AUTH_HINT_KEY, "1");
    else localStorage.removeItem(AUTH_HINT_KEY);
    document.documentElement.toggleAttribute(AUTH_HINT_ATTRIBUTE, signedIn);
  } catch (err) {
    console.error("Could not store the sign-in hint", err);
  }
}

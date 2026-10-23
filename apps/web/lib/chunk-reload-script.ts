/**
 * Hotfix 23/10: after a deploy, a phone still holding the old page asks for JS chunks that no longer exist and the app freezes until
 * the person refreshes by hand. This script runs in the root layout's <head>, before the app, and reloads the page once.
 *
 * It catches a <script> under /_next/static/ that fails to load (capture phase: a resource error does not bubble) and an
 * unhandledrejection whose reason is a chunk error (webpack's ChunkLoadError / "Loading chunk … failed", Chrome's "Failed to fetch
 * dynamically imported module", Safari's "Importing a module script failed", Firefox's "error loading dynamically imported module").
 * A bare "Failed to fetch" is an API call, not a chunk, and is left alone.
 *
 * What it does, once per page (the script error and the rejection of one failure are one event):
 *  - offline: nothing, a reload cannot bring the chunk;
 *  - something is typed in a form or sheet (window.h1tUnsaved, set by components/unsaved-work-watch): "toast", the page offers the
 *    update and the person reloads when ready (components/pwa/chunk-stale.tsx); the diary needs no check, its writes sit in the outbox;
 *  - sessionStorage h1t_chunk_reload is under 60 s old, or sessionStorage does not work: "error", components/pwa/chunk-stale.tsx raises
 *    the error screen with Tải lại, so a page that cannot recover never loops. Only for a failed <script> of the build; a bare rejection
 *    (a background import such as lib/vitals) says "toast" instead, it is not worth taking the whole app away;
 *  - otherwise stamp the time and reload ("reload"). The stamp is cleared once the page has run fine for 10 s.
 * The error screens (app/error.tsx, app/global-error.tsx) ask the same code through window.h1tChunk(error) for an error React caught;
 * those answers are not announced to the page (window.h1tChunkState, the "h1t:chunk" event), the error screen is already there.
 * Plain ES5 string: lib/__tests__/chunk-reload.test.ts runs this exact text in a fake window.
 */
export const CHUNK_RELOAD_SCRIPT = `(function(w){var K="h1t_chunk_reload",s="",R=/ChunkLoadError|Loading (?:CSS )?chunk \\S+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
function is(e){return!!e&&R.test((e.name||"")+" "+(e.message||e))}
function stamp(){w.sessionStorage.setItem(K,""+Date.now())}
function go(by){if(s)return s;if(w.navigator.onLine===false)return"";var o;
if(w.h1tUnsaved&&w.h1tUnsaved())o="toast";
else try{if(Date.now()-(+w.sessionStorage.getItem(K)||0)<6e4)o="error";else{stamp();o="reload"}}catch(e){o="error"}
if(o=="error"&&by==2)o="toast";
s=o;if(by)w.h1tChunkState=o;if(o=="reload")w.location.reload();else if(by)w.dispatchEvent(new w.Event("h1t:chunk"));return o}
w.addEventListener("error",function(e){var t=e.target;if(t&&t.tagName=="SCRIPT"&&(t.src||"").indexOf("/_next/static/")>0)go(1)},true);
w.addEventListener("unhandledrejection",function(e){if(is(e.reason))go(2)});
w.h1tChunk=function(e){return is(e)?go(0):""};
w.h1tChunkReload=function(){try{stamp()}catch(e){}w.location.reload()};
try{if(w.sessionStorage.getItem(K))w.setTimeout(function(){if(!s)w.sessionStorage.removeItem(K)},1e4)}catch(e){}
})(window);`;

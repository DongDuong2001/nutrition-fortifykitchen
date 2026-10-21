import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { WEB } from "./probe-covers.mjs";

// lint:design (DESIGN.md "Enforcement"): the design floor's lint rules over app/ and components/ (.tsx and .ts).
//   D-TYPE-06  no font weight under 400 (font-thin, font-extralight, font-light, font-weight 100–300)
//   D-COL-07   no raw hex colour outside app/globals.css (comments excepted; brand marks listed in ALLOW_HEX)
//   D-WRT-04   no "nhấp" or "click" in Vietnamese UI copy (say "chạm")
//   D-A11Y-02  no onClick on a div or a span (use a button or a link)
// Prints "RULE file:line: text" for each hit and exits 1 when there is any.

const ROOTS = ["app", "components"];
// Brand assets keep their own colours (OPEN_QUESTIONS cc-01, 12/10: the Google logo's four fills)
const ALLOW_HEX = new Set(["components/onboarding/google-sign-in-button.tsx"]);

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === "node_modules" || name === "__tests__") continue;
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(full);
  }
  return out;
}

/** The text with comments blanked (same length, newlines kept), so line numbers stay right. */
function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|(^|[^:"'`])\/\/[^\n]*/g, (m, lead = "") => lead + m.slice(lead.length).replace(/[^\n]/g, " "));
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const hits = [];
let rawLines = [];
// A line that says "lint-design-allow <RULE>: <why>" in a comment is exempt from that rule (say why, e.g. "nhấp" = sip)
const hit = (rule, file, text, index, snippet) => {
  const line = lineOf(text, index);
  if ((rawLines[line - 1] ?? "").includes(`lint-design-allow ${rule}`)) return;
  hits.push(`${rule} ${file}:${line}: ${snippet.trim().replace(/\s+/g, " ").slice(0, 90)}`);
};

for (const root of ROOTS) {
  for (const full of files(join(WEB, root))) {
    const file = relative(WEB, full);
    const raw = readFileSync(full, "utf8");
    const text = withoutComments(raw);
    rawLines = raw.split("\n");

    for (const m of text.matchAll(/\bfont-(thin|extralight|light)\b|font-?[wW]eight:\s*["']?[1-3]00\b|fontWeight:\s*["']?[1-3]00\b/g)) hit("D-TYPE-06", file, text, m.index, m[0]);

    if (!ALLOW_HEX.has(file)) {
      for (const m of text.matchAll(/(?<![\w&/-])#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?(?:[0-9A-Fa-f]{2})?\b/g)) {
        // an anchor link ("#main") or an id selector is not a colour: a colour is 3, 6 or 8 hex digits and nothing else
        if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(m[0])) continue;
        hit("D-COL-07", file, text, m.index, text.slice(Math.max(0, m.index - 30), m.index + 20));
      }
    }

    // UI copy: string literals and JSX text that hold Vietnamese words
    for (const m of text.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1|>([^<>{}\n]+)</g)) {
      const copy = m[2] ?? m[3] ?? "";
      if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(copy)) continue;
      if (/\bnhấp\b|\bclick\b/i.test(copy)) hit("D-WRT-04", file, text, m.index, copy);
    }

    // D-A11Y-02: an opening <div …> or <span …> tag (across lines, braces balanced) with onClick
    for (const m of text.matchAll(/<(div|span)\b/g)) {
      let depth = 0;
      let i = m.index + m[0].length;
      for (; i < text.length; i++) {
        const c = text[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) break;
      }
      const tag = text.slice(m.index, i);
      // A scrim or backdrop that closes on a tap is not a control (aria-hidden; Esc and the Close button do the same)
      // A handler that only stops a tap from reaching the backdrop behind is not an action either
      const onlyStops = /\sonClick=\{\(\w+\)\s*=>\s*\w+\.stopPropagation\(\)\}/.test(tag);
      if (/\sonClick=/.test(tag) && !onlyStops && !/aria-hidden=(?:"true"|\{true\})/.test(tag) && !/\sdata-backdrop\b/.test(tag)) hit("D-A11Y-02", file, text, m.index, text.slice(m.index, Math.min(i, m.index + 80)));
    }
  }
}

for (const h of hits) console.log(h);
console.log(hits.length ? `lint:design: ${hits.length} problem(s)` : "lint:design: clean");
process.exit(hits.length ? 1 : 0);

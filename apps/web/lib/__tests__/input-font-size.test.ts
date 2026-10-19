import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// iOS Safari zooms the page when focus lands on a field under 16 px and does not zoom back. Every <input> and
// <textarea> in the app carries a text size of 16 px (text-base) or more (cc-63, N1).
const ROOT = path.resolve(__dirname, "../..");
const SKIP_TYPES = /\btype=["'](?:checkbox|radio|hidden|range|file|color|submit|button)["']/;
const SIZE_REM = { xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25 } as const;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** The text of an opening <input or <textarea tag, to its closing ">" outside {}, strings and templates. */
function tagAt(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0 && src[i - 1] !== "=") return src.slice(start, i + 1);
  }
  return src.slice(start);
}

/** The text of every const and function of the file that `expr` names, and of those they name in turn. */
function withDefinitions(expr: string, src: string, depth = 3): string {
  let text = expr;
  if (depth === 0) return text;
  for (const id of new Set(expr.match(/\b[A-Za-z_]\w*\b/g) ?? [])) {
    const def = new RegExp(`(?:const|let)\\s+${id}\\b[^=]*=\\s*([\\s\\S]*?);\\n`).exec(src);
    if (def) text += ` ${withDefinitions(def[1], src, depth - 1)}`;
    const fn = new RegExp(`function\\s+${id}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(src);
    if (fn) text += ` ${withDefinitions(fn[1], src, depth - 1)}`;
  }
  return text;
}

/** The class text of a tag, with the string constants of the file its className names written in. */
function classText(tag: string, src: string): string {
  const m = /className=(?:"([^"]*)"|\{([\s\S]*?)\}(?=\s+[\w-]+=|\s*\/?>|\s*$))/.exec(tag);
  if (!m) return "";
  return withDefinitions(m[1] ?? m[2] ?? "", src);
}

/** The file with its block comments blanked (same length, so line numbers hold). */
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));

/** The text-size tokens of some class text, in px: text-sm 14, text-base 16, text-[13px] 13. */
export function textSizesPx(classes: string): number[] {
  const sizes: number[] = [];
  for (const raw of classes.split(/[\s"'`{}()?:,;]+/)) {
    const token = raw.replace(/^(?:sm|md|lg|xl)\\?:/, "");
    const named = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/.exec(token);
    if (named) {
      const key = named[1] as string;
      sizes.push((key in SIZE_REM ? SIZE_REM[key as keyof typeof SIZE_REM] : 1.5) * 16);
      continue;
    }
    const arbitrary = /^text-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(token);
    if (arbitrary) sizes.push(Number(arbitrary[1]) * (arbitrary[2] === "rem" ? 16 : 1));
  }
  return sizes;
}

describe("textSizesPx", () => {
  it("reads named and arbitrary text sizes", () => {
    expect(textSizesPx("h-11 text-sm font-bold")).toEqual([14]);
    expect(textSizesPx("text-base")).toEqual([16]);
    expect(textSizesPx("text-[13px] text-xs")).toEqual([13, 12]);
    expect(textSizesPx("text-[0.8rem]")).toEqual([12.8]);
    expect(textSizesPx("text-text text-secondary text-on-dark")).toEqual([]);
    expect(textSizesPx(`\${panel ? "text-[34px]" : "text-2xl"}`)).toEqual([34, 24]);
  });
});

describe("every input and textarea is 16 px or larger", () => {
  const offenders: string[] = [];
  let checked = 0;
  for (const dir of ["app", "components"]) {
    for (const file of sourceFiles(path.join(ROOT, dir))) {
      const src = withoutComments(readFileSync(file, "utf8"));
      for (const m of src.matchAll(/<(?:input|textarea)(?=[\s/>])/g)) {
        const tag = tagAt(src, m.index ?? 0);
        if (SKIP_TYPES.test(tag)) continue;
        checked++;
        const sizes = textSizesPx(classText(tag, src));
        const line = src.slice(0, m.index).split("\n").length;
        const where = `${path.relative(ROOT, file)}:${line}`;
        if (sizes.length === 0) offenders.push(`${where} has no text size (it inherits its parent's)`);
        else if (Math.min(...sizes) < 16) offenders.push(`${where} has a text size under 16 px (${Math.min(...sizes)} px)`);
      }
    }
  }

  it("found the fields", () => {
    expect(checked).toBeGreaterThan(30);
  });

  it("has no field under 16 px", () => {
    expect(offenders).toEqual([]);
  });
});

/**
 * The markdown of a written lesson, as far as a coach uses it: headings (#, ##, ###), bullet lists (- or *), paragraphs and **bold**.
 * It returns plain data for React to draw, so nothing is ever injected as HTML; anything else is shown as typed.
 */
export interface Span {
  text: string;
  bold?: true;
}
export type Block = { type: "heading"; text: string } | { type: "paragraph"; spans: Span[] } | { type: "list"; items: Span[][] };

function spans(line: string): Span[] {
  const out: Span[] = [];
  let rest = line;
  for (;;) {
    const open = rest.indexOf("**");
    const close = open < 0 ? -1 : rest.indexOf("**", open + 2);
    if (open < 0 || close < 0) break;
    if (open > 0) out.push({ text: rest.slice(0, open) });
    out.push({ text: rest.slice(open + 2, close), bold: true });
    rest = rest.slice(close + 2);
  }
  if (rest) out.push({ text: rest });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of source.split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    let i = 0;
    let para: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ type: "paragraph", spans: spans(para.join(" ")) });
      para = [];
    };
    while (i < lines.length) {
      const line = lines[i];
      const heading = /^#{1,3}\s+(.+)$/.exec(line);
      if (heading) {
        flush();
        blocks.push({ type: "heading", text: heading[1] });
        i++;
      } else if (/^[-*]\s+/.test(line)) {
        flush();
        const items: Span[][] = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(spans(lines[i++].replace(/^[-*]\s+/, "")));
        blocks.push({ type: "list", items });
      } else {
        para.push(line);
        i++;
      }
    }
    flush();
  }
  return blocks;
}

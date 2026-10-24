"""Renders a design board (design/courses/*.dc.html) without the design tool's runtime, for a side-by-side with the app.

A board is a static template (<x-dc>) with <sc-for>, <sc-if>, {{path}} holes and a Component class in a <script type="text/x-dc">.
This evaluates the class's renderVals() in the page, expands the template against it and draws the result; a <dc-import> becomes an
iframe of the other board with its props in the query. It reads only the board files, never writes them. Not a probe (underscore name).
"""
import os
from pathlib import Path

BOARDS = Path(os.environ.get("DESIGN_COURSES", str(Path.home() / "Documents" / "HITMicro" / "design" / "courses")))

EXPAND = """
() => {
  const q = new URLSearchParams(location.search);
  const props = Object.fromEntries(q.entries());
  class DCLogic { constructor() { this.props = props; this.state = {}; } }
  const src = document.querySelector('script[type="text/x-dc"]').textContent;
  const Component = new Function('DCLogic', src + '; return Component;')(DCLogic);
  const vals = new Component().renderVals();
  const get = (path, scope) => {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), path.split('.')[0] in scope ? scope : vals);
  };
  const fill = (s, scope) => s.replace(/\\{\\{([^}]+)\\}\\}/g, (_, p) => { const v = get(p, scope); return v == null ? '' : String(v); });
  const expand = (node, scope) => {
    if (node.nodeType === 3) { node.textContent = fill(node.textContent, scope); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = get(node.getAttribute('list').replace(/[{}]/g, ''), scope) || [];
      const as = node.getAttribute('as');
      const frag = document.createDocumentFragment();
      list.forEach((item, i) => {
        for (const child of node.childNodes) {
          const c = child.cloneNode(true);
          frag.appendChild(c);
          expand(c, { ...scope, [as]: item, index: i });
        }
      });
      node.replaceWith(frag);
      return;
    }
    if (tag === 'sc-if') {
      const v = get(node.getAttribute('value').replace(/[{}]/g, ''), scope);
      if (!v) { node.remove(); return; }
      const kids = [...node.childNodes];
      kids.forEach((k) => expand(k, scope));
      node.replaceWith(...kids);
      return;
    }
    if (tag === 'dc-import') {
      const f = document.createElement('iframe');
      const attrs = Object.fromEntries([...node.attributes].map((a) => [a.name, a.value]));
      const qs = new URLSearchParams(Object.entries(attrs).filter(([k]) => !['name', 'hint-size'].includes(k)));
      f.src = attrs.name + '.dc.html?' + qs.toString();
      f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
      node.replaceWith(f);
      return;
    }
    for (const a of [...node.attributes]) if (a.value.includes('{{')) node.setAttribute(a.name, fill(a.value, scope));
    [...node.childNodes].forEach((k) => expand(k, scope));
  };
  const root = document.querySelector('x-dc');
  document.querySelectorAll('helmet').forEach((h) => { [...h.children].forEach((c) => document.head.appendChild(c)); h.remove(); });
  expand(root, {});
  document.body.style.margin = '0';
}
"""


def render_board(browser, name, query="", width=390, height=844):
    """PNG bytes of design/courses/<name>.dc.html (query = props such as 'state=error&view=top')."""
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(f"file://{BOARDS}/{name}.dc.html" + (f"?{query}" if query else ""))
    pg.evaluate(EXPAND)
    pg.wait_for_timeout(1500)  # the fonts come from Google Fonts; offline they fall back, which is noted in the PR
    png = pg.screenshot()
    ctx.close()
    return png

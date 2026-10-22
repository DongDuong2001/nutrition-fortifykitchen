import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { IconShare, SHARE_ICON_PATH } from "../icons";

describe("IconShare", () => {
  it("is V3's iOS share glyph: the path, a 24 box, stroke 1.8 with round caps and joins", () => {
    expect(SHARE_ICON_PATH).toBe("M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7");
    const html = renderToStaticMarkup(<IconShare />);
    expect(html).toContain(`d="${SHARE_ICON_PATH}"`);
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('stroke-width="1.8"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
    expect(html).toContain('stroke="currentColor"');
  });

  it("stays decorative until it is unhidden with a label", () => {
    expect(renderToStaticMarkup(<IconShare />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<IconShare aria-hidden={false} aria-label="Chia sẻ" />)).toContain('role="img"');
  });
});

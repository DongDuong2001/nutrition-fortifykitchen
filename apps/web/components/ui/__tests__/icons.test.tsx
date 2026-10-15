import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  IconEye,
  IconEyeOff,
  IconCheck,
  IconHome,
  IconTarget,
  IconSparkles,
} from "../icons";

describe("MynaUI Icon Adapter", () => {
  it("renders IconEye with default attributes", () => {
    const html = renderToString(<IconEye />);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width="22"');
    expect(html).toContain('height="22"');
    expect(html).toContain('stroke-width="1.8"');
    expect(html).toContain('stroke="currentColor"');
  });

  it("renders IconEyeOff for password visibility toggle", () => {
    const html = renderToString(<IconEyeOff size={20} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="20"');
  });

  it("renders navigation and domain icons", () => {
    const homeHtml = renderToString(<IconHome size={24} />);
    const targetHtml = renderToString(<IconTarget />);
    const sparklesHtml = renderToString(<IconSparkles />);

    expect(homeHtml).toContain("<svg");
    expect(targetHtml).toContain("<svg");
    expect(sparklesHtml).toContain("<svg");
  });

  it("supports custom aria-label for accessible icon-only controls", () => {
    const html = renderToString(<IconCheck aria-hidden="false" aria-label="Đã hoàn tất" />);
    expect(html).toContain('aria-label="Đã hoàn tất"');
    expect(html).toContain('role="img"');
    expect(html).not.toContain('aria-hidden="true"><svg');
  });

  it("stays decorative (hidden from assistive technology) without a label", () => {
    const html = renderToString(<IconCheck />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("role=");
  });

  it("is the same size and stroke as the navigation icons: 22 px, 1,8", () => {
    for (const Icon of [IconHome, IconTarget, IconSparkles, IconCheck]) {
      const html = renderToString(<Icon />);
      expect(html).toContain('width="22"');
      expect(html).toContain('stroke-width="1.8"');
    }
  });
});

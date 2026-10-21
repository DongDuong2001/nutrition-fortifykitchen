import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PillButton } from "../pill-button";
import { IconButton } from "../icon-button";
import { Notice } from "../notice";
import { EmptyState } from "../empty-state";
import { SectionTitle } from "../section-title";
import { ChipGroup } from "../chip-group";
import { Card } from "../card";

const cls = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);

describe("PillButton sizes and tertiary (cc-66 D6)", () => {
  it("lg is the 52 px full-width call to action with the skew motif; md and sm are 44 px pills that do not stretch or skew", () => {
    const lg = cls(renderToStaticMarkup(<PillButton>Thêm</PillButton>));
    expect(lg).toEqual(expect.arrayContaining(["h-[52px]", "px-6", "text-base", "w-full", "active:-skew-x-[14deg]", "font-bold"]));
    const md = cls(renderToStaticMarkup(<PillButton size="md">Thêm</PillButton>));
    expect(md).toEqual(expect.arrayContaining(["min-h-11", "px-5", "text-sm", "w-auto", "font-bold"]));
    expect(md).not.toContain("active:-skew-x-[14deg]");
    expect(cls(renderToStaticMarkup(<PillButton size="sm">Thêm</PillButton>))).toEqual(expect.arrayContaining(["min-h-11", "px-4", "text-cap"]));
  });

  it("tertiary is the grey pill: surface fill, no edge, semibold", () => {
    const t = cls(renderToStaticMarkup(<PillButton variant="tertiary" size="md">Bỏ lọc</PillButton>));
    expect(t).toEqual(expect.arrayContaining(["bg-surface", "text-text", "border-0", "font-semibold"]));
    expect(t).not.toContain("font-bold");
  });

  it("danger is the bordered pill with destructive text (Bỏ món này)", () => {
    const d = cls(renderToStaticMarkup(<PillButton variant="danger" size="sm">Bỏ món này</PillButton>));
    expect(d).toEqual(expect.arrayContaining(["bg-card", "border-card-border", "text-destructive-text", "font-bold"]));
    expect(d).not.toContain("text-text");
  });
});

describe("IconButton (cc-66 D6)", () => {
  it("is a 44 px round control named by its label", () => {
    const html = renderToStaticMarkup(<IconButton label="Đóng">×</IconButton>);
    expect(html).toContain('aria-label="Đóng"');
    expect(html).toContain('type="button"');
    expect(cls(html)).toEqual(expect.arrayContaining(["h-11", "w-11", "rounded-full", "bg-transparent", "active:scale-[0.97]"]));
  });

  it("a tone sets the fill and edge; with href it is a link", () => {
    expect(cls(renderToStaticMarkup(<IconButton label="x" tone="card">×</IconButton>))).toEqual(expect.arrayContaining(["border", "border-card-border", "bg-card"]));
    expect(renderToStaticMarkup(<IconButton label="Về" href="/app">‹</IconButton>)).toMatch(/^<a [^>]*href="\/app"/);
  });
});

describe("Notice, EmptyState, SectionTitle, ChipGroup scroll, Card padding (cc-66 D7, D3)", () => {
  it("Notice info has an action and a named ✕; promo has the cobalt bar", () => {
    const info = renderToStaticMarkup(<Notice action={{ label: "Xem", onClick: () => {} }} onClose={() => {}}>Lên Level 2</Notice>);
    expect(info).toContain("Lên Level 2");
    expect(info).toContain(">Xem</button>");
    expect(info).toContain('aria-label="Đóng thông báo"');
    expect(renderToStaticMarkup(<Notice tone="promo">Mẹo</Notice>)).toContain("bg-cobalt");
  });

  it("EmptyState: title, line and actions in a centred column (gap 2, or 3)", () => {
    const html = renderToStaticMarkup(<EmptyState title="Chưa có món" actions={<button>Bỏ lọc</button>}>Thử lại</EmptyState>);
    expect(html).toContain("Chưa có món");
    expect(html).toContain("Thử lại");
    expect(cls(html)).toEqual(expect.arrayContaining(["items-center", "text-center", "py-6", "gap-2"]));
    expect(cls(renderToStaticMarkup(<EmptyState gap={3} title="x" />))).toContain("gap-3");
  });

  it("SectionTitle sizes: md and lg the V3 section header (Saira italic 17 px uppercase), sm 13 px", () => {
    for (const html of [renderToStaticMarkup(<SectionTitle>a</SectionTitle>), renderToStaticMarkup(<SectionTitle size="lg">a</SectionTitle>)]) {
      expect(cls(html)).toEqual(expect.arrayContaining(["font-display", "italic", "text-body-lg", "uppercase"]));
    }
    expect(cls(renderToStaticMarkup(<SectionTitle size="sm">a</SectionTitle>))).toContain("text-cap");
  });

  it("ChipGroup scroll is the one sideways row (the old ChipRow), named for screen readers", () => {
    const html = renderToStaticMarkup(<ChipGroup scroll ariaLabel="Lọc món" items={[{ id: "all", label: "Tất cả", active: true, onClick: () => {} }]} />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Lọc món"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("overflow-x-auto");
  });

  it("Card pads by default and not with padding={false}", () => {
    expect(cls(renderToStaticMarkup(<Card>a</Card>))).toContain("p-4");
    expect(cls(renderToStaticMarkup(<Card as="li" padding={false}>a</Card>))).not.toContain("p-4");
    expect(renderToStaticMarkup(<Card as="li">a</Card>)).toMatch(/^<li /);
  });
});

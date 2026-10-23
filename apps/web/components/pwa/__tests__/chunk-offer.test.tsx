import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChunkOfferToast, chunkOfferPhase } from "../chunk-offer";

// The page asked for chunks a deploy removed and the person has something typed: the toast offers the update
describe("chunkOfferPhase", () => {
  it("asks until the person taps", () => {
    expect(chunkOfferPhase({ tapped: false, editing: false })).toBe("ask");
    expect(chunkOfferPhase({ tapped: false, editing: true })).toBe("ask");
  });

  it("a tap reloads at once when nothing is in hand", () => {
    expect(chunkOfferPhase({ tapped: true, editing: false })).toBe("reload");
  });

  it("a tap waits while something is still typed or open, and reloads when that is gone", () => {
    expect(chunkOfferPhase({ tapped: true, editing: true })).toBe("waiting");
    expect(chunkOfferPhase({ tapped: true, editing: false })).toBe("reload");
  });
});

describe("ChunkOfferToast", () => {
  it("ask: the message and a Tải lại button", () => {
    const html = renderToString(<ChunkOfferToast phase="ask" onTap={() => {}} />);
    expect(html).toContain("Có bản cập nhật");
    expect(html).toContain("Tải lại");
    expect(html).toContain("<button");
  });

  it("waiting: says it reloads when they are done, and offers no button to tap again", () => {
    const html = renderToString(<ChunkOfferToast phase="waiting" onTap={() => {}} />);
    expect(html).toContain("bạn xong việc đang làm là tải lại");
    expect(html).not.toContain("<button");
  });
});

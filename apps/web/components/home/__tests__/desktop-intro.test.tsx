import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DesktopIntroBanner } from "../desktop-intro";

describe("DesktopIntroBanner", () => {
  it("renders null on initial server render (client mounted)", () => {
    const html = renderToString(<DesktopIntroBanner />);
    expect(html).toBe("");
  });
});

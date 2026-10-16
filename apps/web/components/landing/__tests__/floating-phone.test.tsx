import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { FloatingPhone } from "../floating-phone";

describe("FloatingPhone", () => {
  it("renders the phone frame with authentic H1T MICRO interface elements", () => {
    const html = renderToString(<FloatingPhone />);
    expect(html).toContain("H1T");
    expect(html).toContain("MICRO");
    expect(html).toContain("1.041");
    expect(html).toContain("2.050 kcal");
    expect(html).toContain("Vi chất đạt 18/22");
    expect(html).toContain("Phở bò tái nạm");
    expect(html).toContain("Hôm nay");
  });
});

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DesktopIntroBanner } from "../desktop-intro";

describe("DesktopIntroBanner", () => {
  it("renders the headline and 3 pillars on initial server render", () => {
    const html = renderToString(<DesktopIntroBanner />);
    expect(html).toContain("Kiểm soát năng lượng và cân bằng 22 vi chất thiết yếu");
    expect(html).toContain("1. Ghi nhận khẩu phần chính xác");
    expect(html).toContain("2. Phân tích 22 vi chất tức thì");
    expect(html).toContain("3. Điều chỉnh theo vận động");
  });
});

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import LandingPage from "../page";

describe("LandingPage", () => {
  it("renders the primary headline and trust points", () => {
    const html = renderToString(<LandingPage />);
    expect(html).toContain("CÂN BẰNG 22 VI CHẤT &amp; KIỂM SOÁT NĂNG LƯỢNG");
    expect(html).toContain("KHOA HỌC DINH DƯỠNG");
    expect(html).toContain("22 vi chất thiết yếu");
  });

  it("renders the 3 customer audience segments", () => {
    const html = renderToString(<LandingPage />);
    expect(html).toContain("Người tập gym &amp; Vận động viên");
    expect(html).toContain("Người chú trọng vi chất &amp; Chuyển hóa");
    expect(html).toContain("Huấn luyện viên &amp; Chuyên gia dinh dưỡng");
  });

  it("renders CTA buttons to sign up and sign in", () => {
    const html = renderToString(<LandingPage />);
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Tạo tài khoản miễn phí");
    expect(html).toContain('href="/signin"');
    expect(html).toContain("Đăng nhập tài khoản");
  });
});

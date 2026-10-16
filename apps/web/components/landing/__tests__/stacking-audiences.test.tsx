import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StackingAudiences } from "../stacking-audiences";

describe("StackingAudiences", () => {
  it("renders the 3 audience segments with points and stats", () => {
    const html = renderToString(<StackingAudiences />);
    expect(html).toContain("TẬP LUYỆN &amp; THỂ HÌNH");
    expect(html).toContain("Người tập gym &amp; Vận động viên");
    expect(html).toContain("SỨC KHỎE BỀN VỮNG");
    expect(html).toContain("Người chú trọng vi chất &amp; Chuyển hóa");
    expect(html).toContain("CHUYÊN NGHIỆP &amp; HUẤN LUYỆN");
    expect(html).toContain("Huấn luyện viên &amp; Chuyên gia dinh dưỡng");
    expect(html).toContain("Chỉ số định lượng cốt lõi");
  });
});

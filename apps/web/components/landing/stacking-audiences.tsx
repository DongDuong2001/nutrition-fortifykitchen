"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface AudienceCardData {
  tag: string;
  title: string;
  subtitle: string;
  desc: string;
  points: string[];
  ctaText: string;
  ctaHref: string;
  theme: "dark" | "light" | "cobalt";
  stats: { label: string; value: string; hint: string }[];
}

const AUDIENCES_DATA: AudienceCardData[] = [
  {
    tag: "TẬP LUYỆN & THỂ HÌNH",
    title: "Người tập gym & Vận động viên",
    subtitle: "Tối ưu hóa năng lượng thâm hụt / thặng dư và bù khoáng",
    desc: "Kiểm soát chính xác lượng calo và 4 đại lượng macronutrients (Đạm, Carb, Béo, Xơ). Khuyến nghị muối được tính lại theo số phút tập luyện bạn ghi mỗi ngày.",
    points: [
      "Khuyến nghị muối tăng theo số phút tập mỗi ngày",
      "Theo dõi 4 thành phần đại lượng: Tinh bột, Đạm, Béo, Chất xơ",
      "Hỗ trợ ghi nhận nhanh nhiều món liên tiếp vào từng bữa ăn",
    ],
    ctaText: "Đăng ký trải nghiệm",
    ctaHref: "/signup",
    theme: "dark",
    stats: [
      { label: "Mục tiêu đạm", value: "120–160 g", hint: "2.0 g/kg thể trọng" },
      { label: "Natri tăng thêm", value: "+1.180–1.770 mg", hint: "Ngày tập 60 phút" },
      { label: "Kiểm soát Calo", value: "1.950–2.275", hint: "Thâm hụt chuẩn xác" },
    ],
  },
  {
    tag: "SỨC KHỎE BỀN VỮNG",
    title: "Người chú trọng vi chất & Chuyển hóa",
    subtitle: "Phát hiện sớm tình trạng thiếu hụt 10 khoáng chất & 12 vitamin",
    desc: "Vượt qua giới hạn của việc chỉ đếm calo thông thường. Hệ thống đối chiếu dữ liệu từng món ăn với mục tiêu tính theo hồ sơ của bạn.",
    points: [
      "Đối chiếu với mục tiêu tính theo hồ sơ của bạn",
      "Biểu đồ 10 mức trực quan hiển thị mức độ đáp ứng từng vi chất",
      "Bốn mức Thiếu, Trung bình, Gần đủ, Đạt cho từng vi chất",
    ],
    ctaText: "Tạo tài khoản theo dõi vi chất",
    ctaHref: "/signup",
    theme: "light",
    stats: [
      { label: "Khoáng chất", value: "10 / 10", hint: "Canxi, Sắt, Kẽm, Magie..." },
      { label: "Vitamin", value: "12 / 12", hint: "A, C, D, E, Nhóm B..." },
      { label: "Thang đo", value: "10 mức", hint: "Trực quan" },
    ],
  },
  {
    tag: "CHUYÊN NGHIỆP & HUẤN LUYỆN",
    title: "Huấn luyện viên & Chuyên gia dinh dưỡng",
    subtitle: "Dữ liệu dinh dưỡng rõ nguồn để tham chiếu khi tư vấn",
    desc: "Tra cứu thành phần từng món với nhãn nguồn rõ ràng, so sánh 2 đến 3 món cạnh nhau và đối chiếu 22 vi chất với mục tiêu tính theo hồ sơ.",
    points: [
      "Nhãn nguồn trên từng món: USDA, bảng thành phần Việt Nam, nhãn bao bì",
      "Điều chỉnh khuyến nghị muối theo số phút tập mỗi ngày",
      "So sánh 2 hoặc 3 món cạnh nhau trên cùng một bảng",
    ],
    ctaText: "Bắt đầu cùng H1T MICRO",
    ctaHref: "/signup",
    theme: "cobalt",
    stats: [
      { label: "So sánh món", value: "2–3 món", hint: "Cạnh nhau" },
      { label: "Dữ liệu nguồn", value: "USDA", hint: "FoodData Central" },
      { label: "Vi chất", value: "22", hint: "10 khoáng chất, 12 vitamin" },
    ],
  },
];

export function StackingAudiences() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState<number[]>([1, 1, 1]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      if (typeof window === "undefined" || window.innerWidth < 1024) return;

      const cardEls = containerRef.current.querySelectorAll<HTMLElement>("[data-stack-card]");
      const newScales: number[] = [];

      cardEls.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        // Top sticky trigger threshold
        const stickyTop = 100 + idx * 28;
        if (rect.top <= stickyTop + 20) {
          const depth = Math.max(0, stickyTop - rect.top);
          // Scale down slightly as subsequent cards stack over it
          const scale = Math.max(0.92, 1 - (depth / 600) * 0.08);
          newScales.push(scale);
        } else {
          newScales.push(1);
        }
      });

      if (newScales.length === 3) {
        setScales(newScales);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-8 lg:gap-12 pb-8">
      {AUDIENCES_DATA.map((aud, i) => {
        const scale = scales[i] ?? 1;

        const themeClasses =
          aud.theme === "dark"
            ? "bg-surface-dark border-card-border/60 text-on-dark"
            : aud.theme === "cobalt"
              ? "bg-ink border-blue/50 text-on-dark"
              : "bg-card border-card-border text-text";

        const badgeClasses =
          aud.theme === "light"
            ? "bg-blue/10 text-blue border-blue/20"
            : "bg-card/15 text-sky border-card/25";

        const statBoxClasses =
          aud.theme === "light"
            ? "bg-page/80 border-card-border/70 text-text"
            : "bg-card/10 border-card/15 text-on-dark";

        return (
          <div
            key={aud.title}
            data-stack-card
            className={`sticky rounded-2xl lg:rounded-3xl border p-6 sm:p-8 lg:p-10 shadow-xl origin-top transition-shadow transition-transform duration-100 ease-out ${themeClasses}`}
            style={{
              top: `calc(5.5rem + ${i * 24}px)`,
              ...(scale !== 1 ? { transform: `scale(${scale})` } : {}),
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Info & Points */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-block text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border ${badgeClasses}`}
                    >
                      {aud.tag}
                    </span>
                    <span className="text-xs font-semibold opacity-70">Phân khúc {i + 1}/3</span>
                  </div>

                  <h4 className="m-0 text-2xl sm:text-3xl font-black font-display tracking-tight leading-tight mb-2">
                    {aud.title}
                  </h4>
                  <p className="m-0 text-sm font-semibold opacity-90 mb-4 text-blue dark:text-sky">
                    {aud.subtitle}
                  </p>
                  <p className="m-0 text-sm opacity-80 leading-relaxed mb-6 font-normal">
                    {aud.desc}
                  </p>

                  <ul className="m-0 list-none p-0 flex flex-col gap-2.5 mb-8">
                    {aud.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-xs sm:text-sm leading-snug">
                        <span className="font-bold text-blue shrink-0 mt-0.5" aria-hidden="true">
                          ✓
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Link
                    href={aud.ctaHref}
                    className="min-h-[44px] px-6 rounded-full bg-blue text-on-accent text-xs sm:text-sm font-bold inline-flex items-center gap-2 no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-all shadow-sm"
                  >
                    <span>{aud.ctaText}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Data Highlights */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-70 mb-1">
                  Chỉ số định lượng cốt lõi
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {aud.stats.map((st) => (
                    <div
                      key={st.label}
                      className={`p-4 rounded-xl border flex flex-col justify-between ${statBoxClasses}`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold opacity-80">{st.label}</span>
                        <span className="text-base sm:text-lg font-black font-display italic">
                          {st.value}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-70 mt-1">{st.hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StackingAudiences;

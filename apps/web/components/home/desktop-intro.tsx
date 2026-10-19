"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "h1t_desktop_intro_collapsed";

/**
 * Desktop Homepage Introduction (hidden on mobile, visible from 1024 px).
 * Introduces what H1T MICRO is and how it works using neutral, scientific marketing terms.
 */
export function DesktopIntroBanner() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") {
        setCollapsed(true);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage unavailable
    }
  };

  return (
    <section
      aria-label="Giới thiệu về H1T MICRO"
      className="hidden lg:block mx-3 mt-2 mb-1 rounded-card border border-card-border bg-card p-5 text-text shadow-xs"
    >
      {collapsed ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-display italic font-black text-cobalt">H1T MICRO</span>
            <span className="text-secondary font-medium">
              Theo dõi 22 vi chất và năng lượng mỗi ngày.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded="false"
            className="min-h-11 px-3 inline-flex items-center text-xs font-bold text-cobalt hover:underline bg-transparent border-0 cursor-pointer active:scale-[0.97] transition-press motion-reduce:active:scale-100"
          >
            Xem giới thiệu
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2">
                <span className="text-micro font-extrabold uppercase tracking-wider text-cobalt">
                  Khoa học dinh dưỡng &amp; Vi chất
                </span>
                <span className="text-xs text-secondary">·</span>
                <span className="text-xs text-secondary font-medium">Dữ liệu từ USDA FoodData Central</span>
              </div>
              <h2 className="m-0 text-xl font-bold text-text">
                Kiểm soát năng lượng và cân bằng 22 vi chất thiết yếu
              </h2>
              <p className="m-0 text-sm text-secondary leading-relaxed max-w-[850px]">
                Nền tảng định lượng minh bạch: theo dõi chi tiết 10 khoáng chất và 12 vitamin mỗi ngày,
                tự động đối chiếu với mục tiêu tính theo hồ sơ của bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded="true"
              className="min-h-11 px-3 shrink-0 inline-flex items-center text-xs font-semibold text-secondary hover:text-text bg-transparent border-0 cursor-pointer active:scale-[0.97] transition-press motion-reduce:active:scale-100"
            >
              Thu gọn
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-card-border">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-card-border/60">
              <div className="text-xs font-bold text-text">1. Ghi nhận khẩu phần chính xác</div>
              <p className="m-0 text-xs text-secondary leading-relaxed">
                Tra cứu dữ liệu thực phẩm chuẩn hóa, hỗ trợ thêm nhiều món liên tục vào từng bữa ăn với khối lượng tùy chỉnh.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-card-border/60">
              <div className="text-xs font-bold text-text">2. Phân tích 22 vi chất tức thì</div>
              <p className="m-0 text-xs text-secondary leading-relaxed">
                Biểu đồ 10 mức hiển thị trực quan tỷ lệ đạt chuẩn của từng vitamin và khoáng chất, cho thấy vi chất nào còn thiếu.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-card-border/60">
              <div className="text-xs font-bold text-text">3. Điều chỉnh theo vận động</div>
              <p className="m-0 text-xs text-secondary leading-relaxed">
                Khuyến nghị muối được tính lại theo số phút tập luyện bạn ghi mỗi ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <Link
                href="/add"
                className="min-h-11 px-5 rounded-full bg-cobalt text-on-accent font-bold text-xs inline-flex items-center justify-center no-underline hover:bg-cobalt/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-press shadow-xs"
              >
                Thêm món vào bữa ăn
              </Link>
              <Link
                href="/micros"
                className="min-h-11 px-4 rounded-full bg-card border border-card-border text-text font-bold text-xs inline-flex items-center justify-center no-underline hover:bg-surface active:scale-[0.97] motion-reduce:active:scale-100 transition-press"
              >
                Khám phá 22 vi chất
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/landing"
                className="min-h-11 px-2 text-xs font-semibold text-cobalt hover:underline inline-flex items-center"
              >
                Trang giới thiệu đầy đủ →
              </Link>
              <Link
                href="/settings/targets"
                className="min-h-11 px-2 text-xs font-semibold text-secondary hover:text-text inline-flex items-center"
              >
                Mục tiêu dinh dưỡng cá nhân →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

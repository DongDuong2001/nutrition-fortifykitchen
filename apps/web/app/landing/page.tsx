import React from "react";
import Link from "next/link";
import { IconCheck } from "@/components/ui/icons";
import { StackingAudiences } from "@/components/landing/stacking-audiences";
import { KilnWordmarkFooter } from "@/components/landing/kiln-wordmark-footer";
import { FloatingPhone } from "@/components/landing/floating-phone";

export const metadata = {
  title: "H1T MICRO — Hệ thống theo dõi 22 vi chất và năng lượng",
  description:
    "Theo dõi 22 vi chất và năng lượng mỗi ngày. Mục tiêu tính theo hồ sơ của bạn, dữ liệu món ăn từ USDA FoodData Central.",
};

const STEPS = [
  {
    num: "01",
    stepLabel: "BƯỚC 1",
    title: "Ghi nhận khẩu phần chính xác",
    desc: "Tra cứu từ dữ liệu USDA FoodData Central. Ghi nhanh nhiều món liên tiếp vào từng bữa ăn với khối lượng gam thực tế.",
    microUi: (
      <div className="p-3.5 rounded-2xl bg-page/80 border border-card-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue/10 text-blue font-bold flex items-center justify-center shrink-0 text-xs">
            +
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-text truncate">Ức gà áp chảo</div>
            <div className="text-[11px] text-secondary">Bữa trưa · 150g</div>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-extrabold text-blue bg-card px-2.5 py-1 rounded-lg border border-card-border/80 shadow-2xs">
          247 kcal
        </span>
      </div>
    ),
  },
  {
    num: "02",
    stepLabel: "BƯỚC 2",
    title: "Phân tích 22 vi chất thời gian thực",
    desc: "Tự động đối chiếu từng vitamin và khoáng chất với mục tiêu tính theo hồ sơ của bạn qua biểu đồ 10 mức phân đoạn trực quan.",
    microUi: (
      <div className="p-3.5 rounded-2xl bg-page/80 border border-card-border/70 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-secondary">Canxi (Ca)</span>
          <span className="font-extrabold text-success">85% mục tiêu</span>
        </div>
        <div className="h-1.5 w-full bg-card-border/50 rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full" style={{ width: "85%" }} />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-secondary">Kẽm (Zn)</span>
          <span className="font-extrabold text-blue">100% Đạt</span>
        </div>
        <div className="h-1.5 w-full bg-card-border/50 rounded-full overflow-hidden">
          <div className="h-full bg-blue rounded-full" style={{ width: "100%" }} />
        </div>
      </div>
    ),
  },
  {
    num: "03",
    stepLabel: "BƯỚC 3",
    title: "Điều chỉnh theo số phút tập",
    desc: "Khuyến nghị muối được tính lại theo số phút tập luyện bạn ghi mỗi ngày.",
    microUi: (
      <div className="p-3.5 rounded-2xl bg-page/80 border border-card-border/70 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-text">Tập gym 60 phút</div>
          <div className="text-[11px] text-secondary">Ngày có tập luyện</div>
        </div>
        <span className="shrink-0 text-[11px] font-extrabold text-warning-text bg-warning-bg px-2.5 py-1 rounded-full border border-amber/30 flex items-center gap-1">
          +1.180–1.770 mg natri
        </span>
      </div>
    ),
  },
];

const TRANSPARENCY_PRINCIPLES = [
  {
    tag: "ĐỘ CHÍNH XÁC KHOA HỌC",
    title: "Không làm tròn số sai lệch",
    desc: "Dữ liệu vi chất được tính toán theo tỷ lệ khối lượng thực tế từng gam, định dạng chuẩn mực Việt Nam (1.041 kcal và 2,1 mg sắt), bảo đảm tính chuẩn xác khoa học.",
    badge: "Chuẩn xác đến từng gam",
    icon: (
      <svg className="w-5 h-5 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3v18M3 12h18M6 8l6-5 6 5M6 16l6 5 6-5" />
      </svg>
    ),
  },
  {
    tag: "TRUNG THỰC DỮ LIỆU",
    title: "Không quy đổi giá trị thiếu thành 0",
    desc: "Nếu một thực phẩm chưa có dữ liệu phân tích của vi chất nhất định, hệ thống thể hiện dấu gạch ngang (—), tuyệt đối không tự ý gán bằng 0 gây hiểu lầm thiếu hụt.",
    badge: "Chuẩn minh bạch: — (chưa rõ)",
    icon: (
      <svg className="w-5 h-5 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    tag: "NGUỒN GỐC MINH BẠCH",
    title: "Gắn nhãn rõ ràng nguồn thực phẩm",
    desc: "Mỗi món có nhãn nguồn: USDA, bảng thành phần Việt Nam, nhãn bao bì, món ước tính hoặc món do bạn tự tạo.",
    badge: "Mỗi món có nhãn nguồn",
    icon: (
      <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },
  {
    tag: "BẢO MẬT & QUYỀN RIÊNG TƯ",
    title: "Dữ liệu gắn với tài khoản của bạn",
    desc: "Nhật ký và hồ sơ của bạn gắn với tài khoản của bạn. Chính sách quyền riêng tư nêu rõ dữ liệu nào được lưu và lưu ở đâu.",
    badge: "Có chính sách quyền riêng tư",
    icon: (
      <svg className="w-5 h-5 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-page text-text font-sans antialiased selection:bg-blue selection:text-on-accent">
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR                                                 */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-card-border/80 bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/landing" className="flex items-center gap-2 no-underline text-text">
            <span className="font-display italic font-black text-2xl tracking-wide text-ink">
              H1T <span className="text-blue">MICRO</span>
            </span>
          </Link>

          <nav aria-label="Điều hướng trang giới thiệu" className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-secondary hover:text-text no-underline transition-colors">
              Tính năng
            </a>
            <a href="#audiences" className="text-sm font-semibold text-secondary hover:text-text no-underline transition-colors">
              Đối tượng
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-secondary hover:text-text no-underline transition-colors">
              Cách hoạt động
            </a>
            <a href="#transparency" className="text-sm font-semibold text-secondary hover:text-text no-underline transition-colors">
              Minh bạch dữ liệu
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="min-h-[44px] px-4 inline-flex items-center text-sm font-bold text-text hover:text-blue no-underline transition-press"
            >
              Đăng nhập
            </Link>
            <Link
              href="/signup"
              className="min-h-[44px] px-5 rounded-full bg-blue text-on-accent text-sm font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-press shadow-sm"
            >
              Bắt đầu ngay
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION                                               */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Value proposition, headline and CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-card-border text-xs font-bold text-blue mb-6 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
                KHOA HỌC DINH DƯỠNG &amp; 22 VI CHẤT THIẾT YẾU
              </div>

              <h1 className="m-0 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black font-display italic tracking-tight text-ink leading-[1.08]">
                CÂN BẰNG 22 VI CHẤT &amp; KIỂM SOÁT NĂNG LƯỢNG
              </h1>

              <p className="mt-6 text-base sm:text-lg text-secondary leading-relaxed max-w-2xl font-normal">
                Không chỉ dừng lại ở calories. H1T MICRO cung cấp hệ thống theo dõi 10 khoáng chất
                và 12 vitamin, với mục tiêu tính theo hồ sơ của bạn và dữ liệu từ USDA FoodData Central.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="min-h-[50px] px-8 rounded-full bg-blue text-on-accent text-base font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-press shadow-md"
                >
                  Tạo tài khoản miễn phí
                </Link>
                <Link
                  href="/signin"
                  className="min-h-[50px] px-7 rounded-full bg-card border border-card-border text-text text-base font-bold inline-flex items-center justify-center no-underline hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100 transition-press"
                >
                  Đăng nhập tài khoản
                </Link>
              </div>

              {/* Trust points */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-blue font-bold">✓</span>
                  <span>22 vi chất thiết yếu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue font-bold">✓</span>
                  <span>Bảng thành phần thực phẩm minh bạch</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue font-bold">✓</span>
                  <span>Khuyến nghị muối theo số phút tập</span>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Phone displaying H1T MICRO mobile dashboard */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <FloatingPhone />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. AUDIENCES SECTION                                          */}
      {/* ============================================================== */}
      <section id="audiences" className="py-20 border-t border-card-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue mb-2">
              ĐỐI TƯỢNG PHÙ HỢP
            </h2>
            <h3 className="m-0 text-3xl sm:text-4xl font-extrabold text-ink">
              Giải pháp cho từng nhu cầu dinh dưỡng
            </h3>
            <p className="mt-3 text-secondary text-sm sm:text-base leading-relaxed">
              Thiết kế dành cho những người tìm kiếm sự chính xác, minh bạch và khoa học trong chế độ ăn uống mỗi ngày.
            </p>
          </div>

          <StackingAudiences />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HOW IT WORKS (3 STEPS)                                     */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-24 border-t border-card-border bg-card/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue">
              QUY TRÌNH HOẠT ĐỘNG
            </span>
            <h3 className="m-0 text-3xl sm:text-4xl font-extrabold text-ink mt-2">
              3 bước kiểm soát dinh dưỡng toàn diện
            </h3>
            <p className="mt-3 text-secondary text-sm sm:text-base leading-relaxed">
              Quy trình khép kín giúp bạn dễ dàng chuyển hoá thói quen ăn uống thành dữ liệu định lượng khoa học.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-card-border/90 bg-card shadow-sm hover:shadow-lg hover:border-blue/50 transition-press duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display font-black text-3xl sm:text-4xl text-blue tracking-tight">
                      {step.num}
                    </span>
                    <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue/10 text-blue border border-blue/20">
                      {step.stepLabel}
                    </span>
                  </div>

                  <h4 className="m-0 text-lg sm:text-xl font-bold text-ink group-hover:text-blue transition-colors mb-2">
                    {step.title}
                  </h4>
                  <p className="m-0 text-sm text-secondary leading-relaxed mb-6">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-card-border/60">
                  {step.microUi}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. TRANSPARENCY & SCIENTIFIC PRINCIPLES                       */}
      {/* ============================================================== */}
      <section id="transparency" className="py-24 border-t border-card-border bg-page">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue">
              CAM KẾT CHUẨN MỰC
            </span>
            <h3 className="m-0 text-3xl sm:text-4xl font-extrabold text-ink mt-2">
              Minh bạch số liệu là ưu tiên hàng đầu
            </h3>
            <p className="mt-3 text-secondary text-sm sm:text-base leading-relaxed">
              Số liệu hiển thị rõ nguồn, và chỗ chưa có dữ liệu thì để trống thay vì tự điền.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {TRANSPARENCY_PRINCIPLES.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-card-border/85 bg-card p-7 sm:p-8 shadow-sm hover:shadow-md hover:border-blue/40 transition-press duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-page border border-card-border/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-blue/5 text-blue border border-blue/15">
                      {item.tag}
                    </span>
                  </div>

                  <h4 className="m-0 text-xl font-bold text-ink group-hover:text-blue transition-colors">
                    {item.title}
                  </h4>
                  <p className="mt-2.5 mb-0 text-sm text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-card-border/50 flex items-center justify-between text-xs font-semibold text-secondary">
                  <span className="text-blue font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                    {item.badge}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-secondary/80">Tiêu chuẩn chuẩn hoá</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Trust Verification Strip */}
          <div className="mt-12 rounded-2xl border border-card-border/80 bg-card/60 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-secondary">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>Mục tiêu tính theo hồ sơ của bạn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue" />
              <span>Định danh thực phẩm USDA FoodData Central</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ink" />
              <span>Chính sách quyền riêng tư công khai</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. CALL TO ACTION BANNER                                      */}
      {/* ============================================================== */}
      <section className="py-20 border-t border-card-border bg-ink text-on-dark text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <h2 className="m-0 font-display italic font-black text-3xl sm:text-5xl tracking-tight leading-tight">
            SẴN SÀNG KIỂM SOÁT VI CHẤT CỦA BẠN?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-subtitle max-w-xl">
            Tạo tài khoản ngay hôm nay để bắt đầu theo dõi dinh dưỡng và vi chất chuẩn khoa học.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/signup"
              className="min-h-[50px] px-8 rounded-full bg-blue text-on-accent text-base font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-press shadow-md"
            >
              Đăng ký miễn phí
            </Link>
            <Link
              href="/signin"
              className="min-h-[50px] px-7 rounded-full bg-card/20 border border-card-border/40 text-on-dark text-base font-bold inline-flex items-center justify-center no-underline hover:bg-card/30 active:scale-[0.97] motion-reduce:active:scale-100 transition-press"
            >
              Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. FOOTER (KILN WORDMARK FOOTER)                               */}
      {/* ============================================================== */}
      <KilnWordmarkFooter />
    </div>
  );
}

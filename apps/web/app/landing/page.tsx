import React from "react";
import Link from "next/link";
import { IconCheck } from "@/components/ui/icons";

export const metadata = {
  title: "H1T MICRO — Hệ thống theo dõi 22 vi chất và năng lượng chuẩn khoa học",
  description:
    "Nền tảng kiểm soát dinh dưỡng toàn diện: định lượng chính xác 22 vi chất thiết yếu và cân bằng năng lượng theo tiêu chuẩn khuyến nghị RNI/RDA của Viện Dinh Dưỡng Quốc Gia và USDA.",
};

const AUDIENCES = [
  {
    tag: "TẬP LUYỆN & THỂ HÌNH",
    title: "Người tập gym & Vận động viên",
    desc: "Kiểm soát chính xác năng lượng thâm hụt hoặc thặng dư, tối ưu lượng đạm và tự động điều chỉnh nhu cầu muối khoáng theo thời lượng tập luyện thực tế.",
    points: [
      "Tính toán muối khoáng bù đắp cho ngày tập luyện 60–90 phút",
      "Theo dõi 4 thành phần dinh dưỡng đa lượng: Tinh bột, Đạm, Béo, Chất xơ",
      "Hỗ trợ ghi nhận nhanh nhiều món liên tiếp vào từng bữa ăn",
    ],
  },
  {
    tag: "SỨC KHỎE BỀN VỮNG",
    title: "Người chú trọng vi chất & Chuyển hóa",
    desc: "Phát hiện sớm tình trạng thiếu hụt 10 khoáng chất và 12 vitamin thiết yếu mà các ứng dụng đếm calo thông thường bỏ qua.",
    points: [
      "Đối chiếu trực tiếp với ngưỡng nhu cầu khuyến nghị (RNI) của Viện Dinh Dưỡng",
      "Biểu đồ 10 mức trực quan hiển thị mức độ đáp ứng từng vi chất",
      "Cảnh báo ngưỡng an toàn để phòng tránh dư thừa hoặc mất cân bằng",
    ],
  },
  {
    tag: "CHUYÊN NGHIỆP",
    title: "Huấn luyện viên & Chuyên gia dinh dưỡng",
    desc: "Thiết lập mục tiêu dinh dưỡng chuyên sâu cho từng học viên, kiểm soát mức độ tuân thủ thực tế một cách minh bạch và khoa học.",
    points: [
      "Theo dõi nhật ký và tỷ lệ đạt mục tiêu của học viên theo thời gian thực",
      "Điều chỉnh khuyến nghị điện giải linh hoạt theo giáo án vận động",
      "Dữ liệu dinh dưỡng chuẩn mực, không phụ thuộc vào bảng tính thủ công",
    ],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Ghi nhận khẩu phần chính xác",
    desc: "Tra cứu từ cơ sở dữ liệu thực phẩm chuẩn hóa (Viện Dinh Dưỡng Việt Nam và USDA). Hỗ trợ thêm nhiều món cùng lúc vào một bữa với khối lượng gam linh hoạt.",
  },
  {
    num: "02",
    title: "Phân tích 22 vi chất thời gian thực",
    desc: "Hệ thống tự động tính toán tỷ lệ đạt chuẩn của từng vitamin và khoáng chất, hiển thị trực quan qua biểu đồ 10 phân đoạn chuẩn mực.",
  },
  {
    num: "03",
    title: "Tối ưu hóa theo cường độ vận động",
    desc: "Tự động điều chỉnh nhu cầu muối khoáng và nước dựa trên thời lượng tập luyện thực tế, đồng bộ cùng mục tiêu của huấn luyện viên.",
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
          <Link href="/" className="flex items-center gap-2 no-underline text-text">
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
              className="min-h-[44px] px-4 inline-flex items-center text-sm font-bold text-text hover:text-blue no-underline transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/signup"
              className="min-h-[44px] px-5 rounded-full bg-blue text-on-accent text-sm font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-all shadow-sm"
            >
              Bắt đầu ngay
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION                                               */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-card-border text-xs font-bold text-blue mb-6 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
              KHOA HỌC DINH DƯỠNG &amp; 22 VI CHẤT THIẾT YẾU
            </div>

            <h1 className="m-0 text-4xl sm:text-5xl lg:text-6xl font-black font-display italic tracking-tight text-ink leading-[1.08]">
              CÂN BẰNG 22 VI CHẤT &amp; KIỂM SOÁT NĂNG LƯỢNG
            </h1>

            <p className="mt-6 text-base sm:text-lg text-secondary leading-relaxed max-w-2xl font-normal">
              Không chỉ dừng lại ở calories. H1T MICRO cung cấp hệ thống định lượng minh bạch 10 khoáng chất
              và 12 vitamin theo tiêu chuẩn khuyến nghị RNI/RDA của Viện Dinh Dưỡng Quốc Gia và Bộ Nông Nghiệp Hoa Kỳ (USDA).
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="min-h-[50px] px-8 rounded-full bg-blue text-on-accent text-base font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-all shadow-md"
              >
                Tạo tài khoản miễn phí
              </Link>
              <Link
                href="/"
                className="min-h-[50px] px-7 rounded-full bg-card border border-card-border text-text text-base font-bold inline-flex items-center justify-center no-underline hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100 transition-all"
              >
                Trải nghiệm bản xem trước
              </Link>
            </div>

            {/* Trust points */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-secondary">
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
                <span>Tối ưu điện giải theo vận động</span>
              </div>
            </div>
          </div>

          {/* Product Interface Preview Mockup */}
          <div className="mt-16 mx-auto max-w-5xl rounded-2xl border border-card-border bg-card p-4 sm:p-6 shadow-xl">
            <div className="rounded-xl border border-card-border bg-surface-dark p-6 text-on-dark flex flex-col gap-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-card-border/30 pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-sky">
                    H1T MICRO DASHBOARD · NGÀY MẪU CHUẨN
                  </div>
                  <div className="text-2xl font-black font-display italic mt-1">
                    1.041 <span className="text-sm font-normal text-muted-on-dark font-sans">/ 1.950–2.275 kcal (53%)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-card/20 text-xs font-bold text-on-dark border border-card-border/40">
                    Ngày tập 60 phút
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue/30 text-xs font-bold text-sky border border-blue/40">
                    Muối khuyến nghị: 7–10,5 g
                  </span>
                </div>
              </div>

              {/* Grid 4 macros */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-card/10">
                  <div className="text-xs font-bold text-muted-on-dark">Tinh bột</div>
                  <div className="text-base font-extrabold mt-0.5">133 g <span className="text-xs text-sky font-normal">(52%)</span></div>
                </div>
                <div className="p-3 rounded-lg bg-card/10">
                  <div className="text-xs font-bold text-muted-on-dark">Đạm</div>
                  <div className="text-base font-extrabold mt-0.5">62 g <span className="text-xs text-sky font-normal">(60%)</span></div>
                </div>
                <div className="p-3 rounded-lg bg-card/10">
                  <div className="text-xs font-bold text-muted-on-dark">Chất béo</div>
                  <div className="text-base font-extrabold mt-0.5">21 g <span className="text-xs text-sky font-normal">(64%)</span></div>
                </div>
                <div className="p-3 rounded-lg bg-card/10">
                  <div className="text-xs font-bold text-muted-on-dark">Chất xơ</div>
                  <div className="text-base font-extrabold mt-0.5">14 g <span className="text-xs text-sky font-normal">(47%)</span></div>
                </div>
              </div>

              {/* Sample micro highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-card-border/30 text-xs">
                <div className="flex justify-between items-center bg-card/5 px-3 py-2 rounded-md">
                  <span className="text-muted-on-dark font-medium">Natri (Điện giải)</span>
                  <span className="font-bold text-on-dark">2.900 mg · 105%</span>
                </div>
                <div className="flex justify-between items-center bg-card/5 px-3 py-2 rounded-md">
                  <span className="text-muted-on-dark font-medium">Kali</span>
                  <span className="font-bold text-on-dark">3.900 mg · 75%</span>
                </div>
                <div className="flex justify-between items-center bg-card/5 px-3 py-2 rounded-md">
                  <span className="text-muted-on-dark font-medium">Canxi</span>
                  <span className="font-bold text-warning-text">331 mg · 28%</span>
                </div>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {AUDIENCES.map((aud) => (
              <div
                key={aud.title}
                className="flex flex-col justify-between rounded-2xl border border-card-border bg-card p-6 shadow-2xs hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="inline-block text-[11px] font-extrabold text-blue uppercase tracking-wider mb-2">
                    {aud.tag}
                  </span>
                  <h4 className="m-0 text-xl font-bold text-text mb-3">{aud.title}</h4>
                  <p className="m-0 text-sm text-secondary leading-relaxed mb-6">{aud.desc}</p>
                </div>

                <ul className="m-0 list-none p-0 flex flex-col gap-2.5 pt-4 border-t border-card-border">
                  {aud.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-xs text-text leading-snug">
                      <span className="text-blue font-bold shrink-0 mt-0.5">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HOW IT WORKS (3 STEPS)                                     */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-20 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue mb-2">
              QUY TRÌNH HOẠT ĐỘNG
            </h2>
            <h3 className="m-0 text-3xl sm:text-4xl font-extrabold text-ink">
              3 bước kiểm soát dinh dưỡng toàn diện
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col gap-3 p-6 rounded-2xl border border-card-border bg-card">
                <span className="font-display font-black italic text-3xl text-blue">{step.num}</span>
                <h4 className="m-0 text-lg font-bold text-text">{step.title}</h4>
                <p className="m-0 text-sm text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. TRANSPARENCY & SCIENTIFIC PRINCIPLES                       */}
      {/* ============================================================== */}
      <section id="transparency" className="py-20 border-t border-card-border bg-card/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-card-border bg-card p-8 sm:p-10 flex flex-col gap-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue">
                CAM KẾT CHUẨN MỰC
              </span>
              <h3 className="m-0 text-2xl sm:text-3xl font-extrabold text-ink mt-1">
                Minh bạch số liệu là ưu tiên hàng đầu
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-secondary leading-relaxed">
              <div className="flex flex-col gap-2">
                <div className="font-bold text-text">Không làm tròn số sai lệch</div>
                <p className="m-0">
                  Dữ liệu vi chất được tính toán theo tỷ lệ khối lượng thực tế, định dạng số chuẩn xác theo quy chuẩn Việt Nam, bảo toàn tính khoa học.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-text">Không quy đổi giá trị thiếu thành 0</div>
                <p className="m-0">
                  Nếu một thực phẩm chưa có dữ liệu phân tích của vi chất nhất định, hệ thống thể hiện dấu gạch ngang (chưa rõ), tuyệt đối không gán bằng 0 gây hiểu lầm.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-text">Gắn nhãn nguồn gốc thực phẩm</div>
                <p className="m-0">
                  Mỗi món ăn hiển thị minh bạch nguồn gốc dữ liệu: Bảng thành phần dinh dưỡng Việt Nam, cơ sở dữ liệu USDA hoặc món do người dùng tự tạo.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-text">Tự chủ dữ liệu cá nhân</div>
                <p className="m-0">
                  Bạn toàn quyền quản lý, sao lưu hoặc xóa nhật ký dinh dưỡng và dữ liệu cơ thể của mình bất kỳ lúc nào mà không bị ràng buộc.
                </p>
              </div>
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
              className="min-h-[50px] px-8 rounded-full bg-blue text-on-accent text-base font-bold inline-flex items-center justify-center no-underline hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-all shadow-md"
            >
              Đăng ký miễn phí
            </Link>
            <Link
              href="/signin"
              className="min-h-[50px] px-7 rounded-full bg-card/20 border border-card-border/40 text-on-dark text-base font-bold inline-flex items-center justify-center no-underline hover:bg-card/30 active:scale-[0.97] motion-reduce:active:scale-100 transition-all"
            >
              Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. FOOTER                                                     */}
      {/* ============================================================== */}
      <footer className="border-t border-card-border bg-page py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-display italic font-black text-sm text-ink">H1T MICRO</span>
            <span>· Hệ thống quản lý dinh dưỡng và 22 vi chất chuẩn khoa học</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-text underline">
              Điều khoản dịch vụ
            </Link>
            <Link href="/privacy" className="hover:text-text underline">
              Chính sách bảo mật
            </Link>
            <Link href="/signin" className="hover:text-text underline">
              Đăng nhập
            </Link>
            <Link href="/signup" className="hover:text-text underline">
              Đăng ký
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import { LegalHeader } from "@/components/legal/legal-header";
import { AppShell } from "@/components/ui/app-shell";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | H1T MICRO",
  description: "Quy định minh bạch về thu thập, lưu trữ, bảo mật và quyền kiểm soát dữ liệu cá nhân tại H1T MICRO.",
};

export default function PrivacyPage() {
  return (
    <AppShell alignContainer="privacy-page">
      <LegalHeader title="Chính sách bảo mật" alignGroup="privacy-header" />

      <main className="mx-auto w-full max-w-[760px] px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        <article className="flex flex-col gap-6 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-5 text-text lg:p-8">
          <header className="flex flex-col gap-2 border-b border-divider pb-4">
            <h2 className="m-0 text-xl font-bold leading-snug text-text">
              Chính sách bảo mật dữ liệu H1T MICRO
            </h2>
            <p className="m-0 text-cap text-secondary">
              Cập nhật lần cuối: Ngày 15 tháng 10 năm 2026 · Áp dụng cho toàn bộ nền tảng H1T MICRO
            </p>
          </header>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">1. Nguyên tắc cốt lõi</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              H1T MICRO là ứng dụng chuyên sâu theo dõi dinh dưỡng và 22 vi chất thiết yếu. Chúng tôi hoạt động trên nguyên tắc thu thập tối thiểu dữ liệu cần thiết, minh bạch mục đích sử dụng và đặt quyền kiểm soát dữ liệu hoàn toàn vào tay người dùng. Chúng tôi không kinh doanh dữ liệu cá nhân hay cung cấp thói quen ăn uống của bạn cho các mạng lưới quảng cáo.
            </p>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">2. Dữ liệu chúng tôi thu thập</h3>
            <ul className="m-0 flex flex-col gap-2 pl-5 text-sm leading-relaxed text-secondary">
              <li>
                <strong className="text-text">Thông tin thể trạng và mục tiêu:</strong> Năm sinh, giới tính sinh học, cân nặng và thời lượng tập luyện hàng ngày. Các chỉ số này chỉ được dùng để tính toán nhu cầu năng lượng (TDEE) và mục tiêu khuyến nghị 22 vi chất dinh dưỡng theo thể trạng cá nhân.
              </li>
              <li>
                <strong className="text-text">Nhật ký ăn uống:</strong> Tên thực phẩm, khối lượng tiêu thụ (gram), thời gian ghi bữa và giá trị dinh dưỡng ước tính của khẩu phần.
              </li>
              <li>
                <strong className="text-text">Thông tin tài khoản:</strong> Địa chỉ email và tên hiển thị do bạn cung cấp. Mật khẩu được mã hóa an toàn qua dịch vụ xác thực Supabase Auth; hệ thống không bao giờ lưu trữ mật khẩu dưới dạng văn bản thô.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">3. Mục đích xử lý dữ liệu</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Dữ liệu của bạn được sử dụng độc quyền cho các tính năng vận hành ứng dụng:
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-secondary">
              <li>Hiển thị tiến độ hoàn thành vi chất và đa lượng trong ngày.</li>
              <li>Phân tích xu hướng dinh dưỡng theo tuần và tháng tại mục Tổng quan.</li>
              <li>Đồng bộ hóa dữ liệu trên các thiết bị đăng nhập cùng một tài khoản.</li>
              <li>Gửi email xác thực tài khoản và khôi phục mật khẩu khi có yêu cầu từ bạn.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">4. Cơ chế lưu trữ và bảo vệ dữ liệu</h3>
            <ul className="m-0 flex flex-col gap-2 pl-5 text-sm leading-relaxed text-secondary">
              <li>
                <strong className="text-text">Mã hóa đường truyền:</strong> Toàn bộ dữ liệu trao đổi giữa thiết bị người dùng và máy chủ đều được mã hóa bằng giao thức HTTPS/TLS 1.3 với tiêu chuẩn bảo mật hiện đại.
              </li>
              <li>
                <strong className="text-text">Phân quyền dữ liệu (Row Level Security):</strong> Cơ sở dữ liệu PostgreSQL thiết lập chính sách RLS nghiêm ngặt, đảm bảo mỗi người dùng chỉ có quyền đọc và ghi nhật ký thuộc sở hữu tài khoản của mình.
              </li>
              <li>
                <strong className="text-text">Lưu trữ ngoại tuyến trên thiết bị:</strong> Ứng dụng Progressive Web App (PWA) lưu trữ một bản sao nhật ký cục bộ trong bộ nhớ trình duyệt của bạn (localStorage) để phục vụ khi mất mạng và tự động đồng bộ khi có kết nối trở lại.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">5. Quyền kiểm soát và xóa dữ liệu</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Bạn có toàn quyền kiểm soát thông tin cá nhân của mình tại H1T MICRO:
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-secondary">
              <li>Chỉnh sửa hồ sơ hoặc nhật ký món ăn bất kỳ thời điểm nào.</li>
              <li>Tùy chọn tham gia hoặc ẩn danh khỏi Bảng xếp hạng cộng đồng (mặc định luôn bảo vệ quyền riêng tư, nhật ký ăn uống không bao giờ công khai).</li>
              <li>
                <strong className="text-text">Xóa vĩnh viễn tài khoản:</strong> Bạn có thể chủ động xóa tài khoản tại mục Cài đặt &gt; Xóa tài khoản. Khi xác nhận, toàn bộ hồ sơ, dữ liệu cân nặng và lịch sử nhật ký ăn uống sẽ được xóa hoàn toàn và không thể khôi phục.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5 border-t border-divider pt-4">
            <h3 className="m-0 text-base font-bold text-text">6. Thông tin liên hệ</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu liên quan đến chính sách bảo vệ dữ liệu cá nhân, vui lòng liên hệ đội ngũ quản trị tại: <code className="rounded bg-divider px-2 py-0.5 text-cap text-text">privacy@h1tmicro.vn</code>.
            </p>
          </section>
        </article>
      </main>
    </AppShell>
  );
}

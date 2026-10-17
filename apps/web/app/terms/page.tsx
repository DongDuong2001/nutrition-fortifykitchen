import type { Metadata } from "next";
import { LegalHeader } from "@/components/legal/legal-header";
import { AppShell } from "@/components/ui/app-shell";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ | H1T MICRO",
  description: "Quy định sử dụng, tuyên bố trách nhiệm y tế và quyền hạn pháp lý trên nền tảng H1T MICRO.",
};

export default function TermsPage() {
  return (
    <AppShell alignContainer="terms-page">
      <LegalHeader title="Điều khoản dịch vụ" alignGroup="terms-header" />

      <main className="mx-auto w-full max-w-[760px] px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        <article className="flex flex-col gap-6 rounded-[18px] lg:shadow-card border border-card-border bg-card p-5 text-text lg:p-8">
          <header className="flex flex-col gap-2 border-b border-divider pb-4">
            <h2 className="m-0 text-xl font-bold leading-snug text-text">
              Điều khoản sử dụng dịch vụ H1T MICRO
            </h2>
            <p className="m-0 text-[13px] text-secondary">
              Hiệu lực từ: Ngày 15 tháng 10 năm 2026 · Vui lòng đọc kỹ trước khi đăng ký hoặc sử dụng dịch vụ
            </p>
          </header>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">1. Giới thiệu dịch vụ</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              H1T MICRO là nền tảng theo dõi dinh dưỡng và vi chất chuyên sâu, hỗ trợ người dùng ghi nhận khẩu phần ăn, đối chiếu với 22 mục tiêu vi chất thiết yếu và theo dõi xu hướng năng lượng theo thời gian. Bằng việc truy cập, tạo tài khoản hoặc sử dụng ứng dụng, bạn đồng ý tuân thủ các điều khoản dịch vụ này.
            </p>
          </section>

          <section className="flex flex-col gap-2.5 rounded-xl border border-divider bg-surface p-4">
            <h3 className="m-0 text-base font-bold text-text">
              2. Tuyên bố từ chối trách nhiệm y tế (Quan trọng)
            </h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              <strong className="text-text">H1T MICRO là công cụ hỗ trợ theo dõi thói quen dinh dưỡng và giáo dục vi chất, không phải là dịch vụ khám chữa bệnh hoặc cung cấp lời khuyên y tế.</strong>
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-secondary">
              <li>Mọi công thức tính toán nhu cầu năng lượng (TDEE), tỷ lệ hấp thụ và khuyến nghị vi chất được đối chiếu từ dữ liệu nghiên cứu công khai (Bảng thành phần thực phẩm Việt Nam, Viện Dinh dưỡng Quốc gia, USDA).</li>
              <li>Thông tin trên ứng dụng không cấu thành phác đồ điều trị, chẩn đoán bệnh tật hoặc thay thế chỉ định chuyên môn từ bác sĩ hoặc chuyên gia dinh dưỡng lâm sàng.</li>
              <li>Người dùng có tiền sử bệnh lý chuyển hóa, bệnh thận, tim mạch, tiểu đường, phụ nữ mang thai hoặc đang điều trị y khoa đặc biệt cần tham khảo ý kiến bác sĩ chuyên khoa trước khi thay đổi chế độ dinh dưỡng.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">3. Trách nhiệm người sử dụng</h3>
            <ul className="m-0 flex flex-col gap-2 pl-5 text-sm leading-relaxed text-secondary">
              <li>
                <strong className="text-text">Tính xác thực của thông tin:</strong> Bạn chịu trách nhiệm về tính chính xác của các chỉ số thể trạng (năm sinh, cân nặng, nhật ký ăn uống) nhập vào hệ thống để đảm bảo kết quả đối chiếu mục tiêu có giá trị tham khảo đúng đắn.
              </li>
              <li>
                <strong className="text-text">Bảo mật tài khoản:</strong> Bạn có trách nhiệm bảo mật mật khẩu cá nhân và chịu trách nhiệm cho các hành động phát sinh từ tài khoản của mình.
              </li>
              <li>
                <strong className="text-text">Sử dụng hợp pháp:</strong> Bạn cam kết không thực hiện các hành vi quét mã tự động trái phép, phát tán phần mềm độc hại hoặc cố ý can thiệp vào máy chủ và hạ tầng kỹ thuật của H1T MICRO.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">4. Nguồn dữ liệu thực phẩm &amp; Bản quyền</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Dữ liệu thành phần dinh dưỡng trên H1T MICRO được chuẩn hóa từ các nguồn chính thống:
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-secondary">
              <li>Bảng thành phần thực phẩm Việt Nam (Bộ Y tế &amp; Viện Dinh dưỡng Quốc gia, ấn bản 2007 và 2016).</li>
              <li>Bộ cơ sở dữ liệu USDA FoodData Central (Agricultural Research Service, Hoa Kỳ).</li>
              <li>Nhãn thành phần dinh dưỡng công bố công khai từ các nhà sản xuất thực phẩm đóng gói.</li>
            </ul>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Giao diện, mã nguồn, cấu trúc dữ liệu và hệ thống đồ họa thuộc quyền sở hữu của H1T MICRO hoặc được cấp phép sử dụng hợp pháp.
            </p>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">5. Gói dịch vụ và Thanh toán</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              H1T MICRO cung cấp các tính năng nhật ký cơ bản miễn phí. Người dùng có thể nâng cấp gói H1T MICRO Pro để sử dụng các tính năng nâng cao (báo cáo vi chất chuyên sâu, phân tích chu kỳ). Chi phí và thời hạn sử dụng được thông báo minh bạch trước khi người dùng thực hiện giao dịch thanh toán qua cổng hợp pháp (PayOS).
            </p>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 text-base font-bold text-text">6. Ngừng cung cấp dịch vụ</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Bạn có thể ngừng sử dụng dịch vụ bất kỳ lúc nào bằng cách xóa tài khoản tại mục Cài đặt. H1T MICRO có quyền tạm ngưng hoặc chấm dứt quyền truy cập đối với các tài khoản vi phạm điều khoản bảo mật hoặc gây ảnh hưởng đến an ninh hệ thống.
            </p>
          </section>

          <section className="flex flex-col gap-2.5 border-t border-divider pt-4">
            <h3 className="m-0 text-base font-bold text-text">7. Luật áp dụng và Khiếu nại</h3>
            <p className="m-0 text-sm leading-relaxed text-secondary">
              Các điều khoản này chịu sự điều chỉnh của pháp luật Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi thắc mắc hoặc phản hồi vui lòng gửi đến: <code className="rounded bg-divider px-2 py-0.5 text-[13px] text-text">support@h1tmicro.vn</code>.
            </p>
          </section>
        </article>
      </main>
    </AppShell>
  );
}

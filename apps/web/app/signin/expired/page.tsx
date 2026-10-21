import { MagicLinkForm } from "@/components/onboarding/magic-link-form";
import { StatusGlyph } from "@/components/onboarding/status-screen";

export default function LinkExpiredPage() {
  return (
    <MagicLinkForm
      submitLabel="Gửi liên kết mới"
      hint="Dùng để gửi liên kết mới. Bạn không cần mật khẩu."
      status={{
        tone: "amber",
        icon: (
          <StatusGlyph>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </StatusGlyph>
        ),
        title: "Liên kết đã hết hạn",
        body: "Liên kết đăng nhập chỉ dùng được một lần và trong 15 phút. Bạn gửi liên kết mới là vào được ngay.",
      }}
    />
  );
}

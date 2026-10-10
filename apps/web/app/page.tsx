import Link from "next/link";
import { CalorieDial } from "@/components/ui/calorie-dial";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { BottomDock } from "@/components/layout/bottom-dock";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 md:pb-12">
      {/* Black Header Hero */}
      <div className="bg-[#0A0A0A] text-white rounded-b-3xl md:rounded-3xl p-6 md:p-12 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
            Khoa học dinh dưỡng & Vận động
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-tight">
            H1T <span className="text-[#2563EB]">MICRO</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-400 max-w-xl mx-auto font-medium">
            Theo dõi chính xác 26 vi chất, bù khoáng theo giờ tập và cân bằng năng lượng từng bữa ăn.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/diary"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm tracking-wide transition-all shadow-md active:scale-98"
            >
              Mở nhật ký hôm nay
            </Link>
            <Link
              href="/micros"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-black text-sm tracking-wide transition-all border border-neutral-800"
            >
              Xem bảng 21+ vi chất
            </Link>
          </div>
        </div>

        {/* Feature Preview Preview Card */}
        <div className="mt-10 p-5 bg-neutral-950 rounded-2xl border border-neutral-800 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-5 flex justify-center">
            <CalorieDial current={1041} target={2000} />
          </div>
          <div className="sm:col-span-7 space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-300 mb-1">
                <span>Đạm</span>
                <span className="font-mono">62 / 104 g</span>
              </div>
              <SegmentedBar totalSegments={8} filledSegments={5} color="gold" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-300 mb-1">
                <span>Tinh bột</span>
                <span className="font-mono">133 / 254 g</span>
              </div>
              <SegmentedBar totalSegments={8} filledSegments={4} color="gold" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-300 mb-1">
                <span>Chất xơ</span>
                <span className="font-mono">14 / 30 g</span>
              </div>
              <SegmentedBar totalSegments={8} filledSegments={4} color="coral" />
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="max-w-4xl mx-auto px-4 md:px-0 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs">
          <div className="text-2xl font-black italic text-[#2563EB] font-mono mb-2">
            26
          </div>
          <h3 className="font-black text-base text-neutral-900">Vi chất & Khoáng</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Theo dõi chi tiết canxi, kali, natri, magie, vitamin D và toàn bộ nhóm B theo nhu cầu cá nhân.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs">
          <div className="text-2xl font-black italic text-[#EAB308] font-mono mb-2">
            60&apos;
          </div>
          <h3 className="font-black text-base text-neutral-900">Chiến lược tập luyện</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Gợi ý bù muối, điện giải và carb hấp thu nhanh chuẩn xác theo từng mốc 20 phút tập luyện.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs">
          <div className="text-2xl font-black italic text-[#10B981] font-mono mb-2">
            0s
          </div>
          <h3 className="font-black text-base text-neutral-900">Cập nhật tức thì</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Giao diện phản hồi ngay lập tức với mã định danh idempotent trên mọi thiết bị.
          </p>
        </div>
      </div>

      <BottomDock />
    </div>
  );
}

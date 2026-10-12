import { OverviewFrame } from "@/components/overview/overview-frame";
import { SummaryTab } from "@/components/overview/summary-tab";

/** Tổng quan › Tóm tắt (IA v2): the default landing screen. The day itself lives in Nhật ký (/diary). */
export default function HomePage() {
  return (
    <OverviewFrame active="summary">
      <SummaryTab />
    </OverviewFrame>
  );
}

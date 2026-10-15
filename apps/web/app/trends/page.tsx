import { OverviewFrame } from "@/components/overview/overview-frame";
import { SummaryTab } from "@/components/overview/summary-tab";

/** Tổng quan › Tóm tắt (IA v2, cc2-31b): the period at a glance. Today lives on the home screen (/). */
export default function TrendsPage() {
  return (
    <OverviewFrame active="summary">
      <SummaryTab />
    </OverviewFrame>
  );
}

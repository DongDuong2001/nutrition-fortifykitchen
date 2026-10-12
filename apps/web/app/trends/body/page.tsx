import { BodyTab } from "@/components/overview/body-tab";
import { OverviewFrame } from "@/components/overview/overview-frame";

/** Tổng quan › Cơ thể (IA v2): weight over the period, from the weight log. */
export default function TrendsBodyPage() {
  return (
    <OverviewFrame active="body">
      <BodyTab />
    </OverviewFrame>
  );
}

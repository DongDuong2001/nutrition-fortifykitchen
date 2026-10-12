import { MicrosTab } from "@/components/overview/micros-tab";
import { OverviewFrame } from "@/components/overview/overview-frame";

/** Tổng quan › Vi chất (IA v2): period averages of the 22 counted nutrients, lowest first. */
export default function TrendsMicrosPage() {
  return (
    <OverviewFrame active="micros">
      <MicrosTab />
    </OverviewFrame>
  );
}

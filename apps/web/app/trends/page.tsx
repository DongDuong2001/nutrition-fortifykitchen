import { EnergyTab } from "@/components/overview/energy-tab";
import { OverviewFrame } from "@/components/overview/overview-frame";

/** Tổng quan › Năng lượng (IA v2): kcal composition, kcal per day with the target band, protein. */
export default function TrendsPage() {
  return (
    <OverviewFrame active="energy">
      <EnergyTab />
    </OverviewFrame>
  );
}

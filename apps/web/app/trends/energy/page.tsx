import { EnergyTab } from "@/components/overview/energy-tab";
import { OverviewFrame } from "@/components/overview/overview-frame";

/** Tổng quan › Năng lượng (IA v2, cc2-31b): kcal composition, kcal per day with the target band, protein. */
export default function TrendsEnergyPage() {
  return (
    <OverviewFrame active="energy">
      <EnergyTab />
    </OverviewFrame>
  );
}

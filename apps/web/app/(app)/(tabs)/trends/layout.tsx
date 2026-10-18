import { OverviewFrame } from "@/components/overview/overview-frame";

/** The ink header, the sub-tab bar and the 7|30 control of Tổng quan stay mounted; only the sub-tab's content swaps. */
export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return <OverviewFrame>{children}</OverviewFrame>;
}

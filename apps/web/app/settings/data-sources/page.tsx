import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { SectionTitle } from "@/components/ui/section-title";
import { DataSourceCards } from "@/components/data-sources/data-source-cards";

export const metadata: Metadata = {
  title: "Nguồn dữ liệu | H1T MICRO",
};

/** Nguồn dữ liệu, a pushed screen under Cài đặt. Same widths as Mục tiêu mỗi ngày: one column on the phone, two on desktop. */
export default function DataSourcesPage() {
  return (
    <AppShell alignContainer="data-sources-page">
      <AppHeader
        variant="sub"
        title="Nguồn dữ liệu"
        backHref="/settings"
        layout="wide"
        alignGroup="data-sources-header"
      />

      <main className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-col gap-4">
          <SectionTitle>Các cơ sở dữ liệu dinh dưỡng</SectionTitle>
          <DataSourceCards />
        </div>
      </main>
    </AppShell>
  );
}

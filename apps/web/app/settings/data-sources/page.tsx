import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { SectionTitle } from "@/components/ui/section-title";
import { DataSourceCards } from "@/components/data-sources/data-source-cards";

export const metadata: Metadata = {
  title: "Nguồn dữ liệu | H1T MICRO",
};

export default function DataSourcesPage() {
  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title="Nguồn dữ liệu"
        backHref="/settings"
        layout="wide"
        alignGroup="data-sources-header"
      />

      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        <SectionTitle>Các cơ sở dữ liệu dinh dưỡng</SectionTitle>
        <DataSourceCards />
      </main>
    </AppShell>
  );
}

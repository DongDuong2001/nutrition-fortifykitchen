"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { ReleaseList } from "@/components/whats-new/release-list";
import { useBack } from "@/hooks/use-back";
import { HOME_ROUTE } from "@/lib/nav";
import { markWhatsNewSeen } from "@/lib/onboarding-store";
import { RELEASES, latestRelease, type Release } from "@/lib/releases";
import { writeWhatsNewTour } from "@/lib/tour-bus";

/** Cài đặt › Có gì mới (cc-46): every release, newest first, and "Xem hướng dẫn" to replay its tour on Hôm nay. */
export default function WhatsNewPage() {
  const goBack = useBack();
  const router = useRouter();
  const replay = (release: Release) => {
    if (release.id === latestRelease()?.id) markWhatsNewSeen(release.id);
    writeWhatsNewTour({ releaseIds: [release.id], index: 0 });
    router.push(HOME_ROUTE);
  };

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title="Có gì mới"
        subtitle={RELEASES[0] ? `Cập nhật gần nhất ${RELEASES[0].date}` : undefined}
        onBack={goBack}
        backLabel="Quay lại"
        alignGroup="settings-header"
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-8 pt-4">
        {RELEASES.map((release) => (
          <Card as="section" key={release.id} aria-labelledby={`release-${release.id}`} className="flex flex-col gap-2">
            <SectionTitle id={`release-${release.id}`} data-align-group={`release-${release.id}`}>
              Cập nhật {release.date}
            </SectionTitle>
            <div data-align-group={`release-${release.id}`}>
              <ReleaseList release={release} alignGroup={`release-items-${release.id}`} />
            </div>
            {release.tour && release.tour.length > 0 && (
              <div data-align-group={`release-${release.id}`} className="flex flex-col gap-1">
                <PillButton variant="secondary" aria-describedby={`tour-note-${release.id}`} onClick={() => replay(release)}>
                  Xem hướng dẫn
                </PillButton>
                <p id={`tour-note-${release.id}`} className="m-0 text-center text-xs leading-snug text-secondary">
                  {release.tour.length} bước trên Hôm nay. Bạn bỏ qua được ở mọi bước.
                </p>
              </div>
            )}
          </Card>
        ))}
      </main>
    </AppShell>
  );
}

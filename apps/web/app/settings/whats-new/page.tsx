"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { ReleaseItems } from "@/components/whats-new/whats-new-sheet";
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
    writeWhatsNewTour({ releaseId: release.id, index: 0 });
    router.push(HOME_ROUTE);
  };

  return (
    <AppShell>
      <AppHeader variant="sub" title="Có gì mới" onBack={goBack} backLabel="Quay lại" alignGroup="settings-header" />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-8 pt-4">
        {RELEASES.map((release) => (
          <Card as="section" key={release.id} aria-labelledby={`release-${release.id}`} className="flex flex-col gap-2">
            <h2 id={`release-${release.id}`} data-align-group={`release-${release.id}`} className="m-0 text-xs font-bold text-cobalt">
              Cập nhật {release.date}
            </h2>
            <div data-align-group={`release-${release.id}`}>
              <ReleaseItems release={release} alignGroup={`release-items-${release.id}`} />
            </div>
            {release.tour && release.tour.length > 0 && (
              <div data-align-group={`release-${release.id}`}>
                <PillButton variant="secondary" onClick={() => replay(release)}>
                  Xem hướng dẫn
                </PillButton>
              </div>
            )}
          </Card>
        ))}
      </main>
    </AppShell>
  );
}

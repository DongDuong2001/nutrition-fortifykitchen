"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { SectionTitle } from "@/components/ui/section-title";
import { useBack } from "@/hooks/use-back";
import {
  type CoachApplication,
  getCoachApplications,
  updateCoachApplicationStatus,
} from "@/lib/coaches";

interface CoachDraft {
  id: string;
  file_path: string;
  markdown_content: string;
  status: "draft" | "published" | "rejected";
  commit_hash: string;
  updated_at: string;
}

const SAMPLE_DRAFTS: CoachDraft[] = [
  {
    id: "9f8e7d6c-5b4a-3120-ef98-123456789abc",
    file_path: "coaches/meal-plans/high-protein-cutting-v2.md",
    markdown_content: "# High Protein Cutting Plan\n\nDaily target: 2100 kcal, 180g Protein.\nFocus on lean poultry, steamed greens, and micronutrient density.",
    status: "draft",
    commit_hash: "a4c28f1",
    updated_at: new Date().toISOString(),
  },
  {
    id: "8e7d6c5b-4a31-20ef-9812-abcdef123456",
    file_path: "coaches/recipes/fortify-salmon-quinoa-bowl.md",
    markdown_content: "# Fortify Salmon Quinoa Bowl\n\nSalmon fillet (150g), Quinoa (100g), Avocado (50g), Edamame (50g). Rich in Omega-3 and Magnesium.",
    status: "published",
    commit_hash: "7bc310d",
    updated_at: new Date().toISOString(),
  },
];

const DRAFT_FILTER_LABELS: Record<"all" | CoachDraft["status"], string> = {
  all: "Tất cả",
  draft: "Bản nháp",
  published: "Đã đăng",
  rejected: "Từ chối",
};

const DRAFT_STATUS_LABELS: Record<CoachDraft["status"], string> = {
  draft: "Bản nháp",
  published: "Đã đăng",
  rejected: "Từ chối",
};

const APP_STATUS_LABELS: Record<CoachApplication["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt làm huấn luyện viên",
  rejected: "Đã từ chối",
};

const PILL = {
  good: "bg-blue text-on-accent",
  bad: "bg-destructive-text text-on-accent",
  wait: "bg-warning-bg text-warning-text",
} as const;

const ACTION = "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full px-4 text-[13px] font-bold active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * Kiểm duyệt: Level 5 coach applications and meal-plan drafts. Not linked from any screen; the page itself has no
 * role check yet (OPEN_QUESTIONS, for Dong: the API must enforce it).
 */
export default function AdminReviewPage() {
  const goBack = useBack();
  const [activeTab, setActiveTab] = useState<"coaches" | "drafts">("coaches");

  // Drafts state
  const [drafts, setDrafts] = useState<CoachDraft[]>(SAMPLE_DRAFTS);
  const [draftFilter, setDraftFilter] = useState<"all" | CoachDraft["status"]>("all");

  // Coach applications live in localStorage: read after mount, so the server and the first client render agree
  const [applications, setApplications] = useState<CoachApplication[] | null>(null);
  useEffect(() => {
    setApplications(getCoachApplications());
  }, []);
  const [appFilter, setAppFilter] = useState<"all" | CoachApplication["status"]>("all");

  const handleUpdateDraftStatus = (id: string, newStatus: "published" | "rejected") => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
  };

  const handleUpdateAppStatus = (id: string, newStatus: "approved" | "rejected") => {
    updateCoachApplicationStatus(id, newStatus);
    setApplications(getCoachApplications());
  };

  const filteredDrafts = drafts.filter((d) => (draftFilter === "all" ? true : d.status === draftFilter));
  const loaded = applications !== null;
  const apps = applications ?? [];
  const filteredApps = apps.filter((a) => (appFilter === "all" ? true : a.status === appFilter));
  const pendingApps = apps.filter((a) => a.status === "pending").length;
  const pendingDrafts = drafts.filter((d) => d.status === "draft").length;

  return (
    <AppShell alignContainer="admin-page">
      <AppHeader
        variant="sub"
        title="Kiểm duyệt"
        subtitle="Xét duyệt hồ sơ ứng tuyển huấn luyện viên và bản nháp thực đơn chuyên môn"
        onBack={goBack}
        layout="wide"
        alignGroup="admin-header"
      />

      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        <ChipGroup
          columns={2}
          data-align-group="admin-tabs"
          items={[
            {
              id: "coaches",
              label: `Hồ sơ huấn luyện viên (${loaded ? pendingApps : "–"})`,
              active: activeTab === "coaches",
              onClick: () => setActiveTab("coaches"),
            },
            {
              id: "drafts",
              label: `Bản nháp thực đơn (${pendingDrafts})`,
              active: activeTab === "drafts",
              onClick: () => setActiveTab("drafts"),
            },
          ]}
        />

        {activeTab === "coaches" && (
          <section aria-labelledby="admin-apps" className="flex flex-col gap-3">
            <SectionTitle as="h2" id="admin-apps">
              Hồ sơ ứng tuyển huấn luyện viên
            </SectionTitle>
            <ChipGroup
              columns={2}
              columnsLg={4}
              data-align-group="admin-filter"
              items={(["all", "pending", "approved", "rejected"] as const).map((tab) => ({
                id: tab,
                label: tab === "all" ? "Tất cả" : APP_STATUS_LABELS[tab],
                active: appFilter === tab,
                onClick: () => setAppFilter(tab),
              }))}
            />

            {!loaded ? (
              <div aria-busy="true" className="flex flex-col gap-3">
                <div className="h-40 rounded-[18px] bg-level-empty motion-safe:animate-pulse" />
                <div className="h-40 rounded-[18px] bg-level-empty motion-safe:animate-pulse" />
              </div>
            ) : filteredApps.length === 0 ? (
              <Card as="section" aria-label="Không có hồ sơ" className="text-[13px] leading-snug text-secondary">
                Không có hồ sơ nào trong mục này.
              </Card>
            ) : (
              <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredApps.map((app) => (
                  <li key={app.id}>
                    <Card as="article" aria-label={`Hồ sơ của ${app.name}`} data-align-group="admin-card" className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-base font-bold leading-snug text-text">{app.name}</h3>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${PILL[app.status === "approved" ? "good" : app.status === "rejected" ? "bad" : "wait"]}`}>
                          {APP_STATUS_LABELS[app.status]}
                        </span>
                      </div>
                      <p className="m-0 break-all text-[13px] text-secondary">{app.email}</p>

                      <ul role="list" className="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px] text-secondary">
                        <li className="rounded-xl border border-card-border bg-page px-3 py-1">
                          Chuyên môn: <strong className="text-text">{app.specialty}</strong>
                        </li>
                        <li className="rounded-xl border border-card-border bg-page px-3 py-1">
                          Kinh nghiệm: <strong className="text-text">{app.experienceYears} năm</strong>
                        </li>
                      </ul>
                      {app.socialLink && (
                        <a
                          href={app.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-center text-[13px] font-bold text-blue"
                        >
                          Xem nhóm cộng đồng
                        </a>
                      )}

                      <div className="rounded-xl border border-card-border bg-page p-3 text-[13px] leading-snug text-secondary">
                        <strong className="mb-1 block text-text">Giới thiệu và chứng chỉ</strong>
                        {app.message}
                      </div>

                      {app.status === "pending" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateAppStatus(app.id, "approved")}
                            className={`${ACTION} border-0 bg-blue text-on-accent`}
                          >
                            Duyệt làm huấn luyện viên
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAppStatus(app.id, "rejected")}
                            className={`${ACTION} border border-destructive-text bg-card text-destructive-text`}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "drafts" && (
          <section aria-labelledby="admin-drafts" className="flex flex-col gap-3">
            <SectionTitle as="h2" id="admin-drafts">
              Bản nháp thực đơn chuyên môn
            </SectionTitle>
            <ChipGroup
              columns={2}
              columnsLg={4}
              data-align-group="admin-filter"
              items={(["all", "draft", "published", "rejected"] as const).map((tab) => ({
                id: tab,
                label: DRAFT_FILTER_LABELS[tab],
                active: draftFilter === tab,
                onClick: () => setDraftFilter(tab),
              }))}
            />

            {filteredDrafts.length === 0 ? (
              <Card as="section" aria-label="Không có bản nháp" className="text-[13px] leading-snug text-secondary">
                Không có bản nháp nào trong mục này.
              </Card>
            ) : (
              <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredDrafts.map((draft) => (
                  <li key={draft.id}>
                    <Card as="article" aria-label={`Bản nháp ${draft.file_path}`} data-align-group="admin-card" className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${PILL[draft.status === "published" ? "good" : draft.status === "rejected" ? "bad" : "wait"]}`}>
                          {DRAFT_STATUS_LABELS[draft.status]}
                        </span>
                        <span className="text-[13px] tabular-nums text-secondary">
                          Mã bản ghi: <strong className="text-text">{draft.commit_hash}</strong>
                        </span>
                      </div>
                      <p className="m-0 break-all rounded-xl border border-card-border bg-page px-3 py-2 text-[13px] font-semibold text-text">
                        {draft.file_path}
                      </p>

                      <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-dark p-4 font-sans text-[13px] leading-relaxed text-muted-subtitle">
                        {draft.markdown_content}
                      </pre>

                      {draft.status === "draft" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraftStatus(draft.id, "published")}
                            className={`${ACTION} border-0 bg-blue text-on-accent`}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraftStatus(draft.id, "rejected")}
                            className={`${ACTION} border border-destructive-text bg-card text-destructive-text`}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </AppShell>
  );
}

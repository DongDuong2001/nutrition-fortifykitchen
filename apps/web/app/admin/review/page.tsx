"use client";

import { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { SectionTitle } from "@/components/ui/section-title";
import { useBack } from "@/hooks/use-back";

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

const PILL = {
  good: "bg-blue text-on-accent",
  bad: "bg-destructive-text text-on-accent",
  wait: "bg-warning-bg text-warning-text",
} as const;

const ACTION = "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full px-4 text-[13px] font-bold active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * Kiểm duyệt: the meal-plan drafts waiting for an admin (food drafts only; there is no coach application flow).
 * Behind the admin role gate of app/admin/layout.tsx; the API must enforce the role too (OPEN_QUESTIONS, for Dong).
 */
export default function AdminReviewPage() {
  const goBack = useBack();

  // Drafts state
  const [drafts, setDrafts] = useState<CoachDraft[]>(SAMPLE_DRAFTS);
  const [draftFilter, setDraftFilter] = useState<"all" | CoachDraft["status"]>("all");

  const handleUpdateDraftStatus = (id: string, newStatus: "published" | "rejected") => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
  };

  const filteredDrafts = drafts.filter((d) => (draftFilter === "all" ? true : d.status === draftFilter));

  return (
    <AppShell alignContainer="admin-page">
      <AppHeader
        variant="sub"
        title="Kiểm duyệt"
        subtitle="Xét duyệt bản nháp thực đơn chuyên môn"
        onBack={goBack}
        layout="wide"
        alignGroup="admin-header"
      />

      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
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
      </main>
    </AppShell>
  );
}

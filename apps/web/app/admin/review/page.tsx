"use client";

import { useState } from "react";

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

export default function AdminReviewPage() {
  const [drafts, setDrafts] = useState<CoachDraft[]>(SAMPLE_DRAFTS);
  const [filter, setFilter] = useState<string>("all");

  const handleUpdateStatus = (id: string, newStatus: "published" | "rejected") => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  const filtered = drafts.filter((d) => (filter === "all" ? true : d.status === filter));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 bg-page px-4 py-6 font-sans text-text sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-card-border pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center rounded-full bg-warning-bg px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-text">
            Admin RBAC Guarded
          </div>
          <h1 className="m-0 font-display text-3xl font-extrabold uppercase italic tracking-tight text-text">
            Coach Vault Review
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Review and publish markdown meal plans synchronized from GitHub repository
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter drafts">
          {["all", "draft", "published", "rejected"].map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={filter === tab}
              onClick={() => setFilter(tab)}
              className={`min-h-[44px] cursor-pointer rounded-full px-4 text-xs font-bold uppercase tracking-wider transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                filter === tab
                  ? "border-0 bg-ink text-on-dark"
                  : "border border-card-border bg-card text-text hover:bg-page"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4 sm:space-y-6">
        {filtered.map((draft) => (
          <div
            key={draft.id}
            className="flex flex-col justify-between gap-5 rounded-[18px] border border-card-border bg-card p-4 sm:p-6 md:flex-row sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="max-w-full truncate rounded-lg border border-card-border bg-page px-3 py-1 text-xs font-semibold text-text" title={draft.file_path}>
                  {draft.file_path}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    draft.status === "published"
                      ? "bg-blue text-on-accent"
                      : draft.status === "rejected"
                      ? "bg-destructive-text text-on-accent"
                      : "bg-warning-bg text-warning-text"
                  }`}
                >
                  {draft.status}
                </span>
                <span className="text-xs text-secondary tabular-nums">
                  commit: <strong className="text-text">{draft.commit_hash}</strong>
                </span>
              </div>

              <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-dark p-4 font-sans text-xs leading-relaxed text-muted-subtitle">
                {draft.markdown_content}
              </pre>
            </div>

            <div className="flex min-w-[150px] shrink-0 justify-end gap-3 md:flex-col">
              {draft.status === "draft" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(draft.id, "published")}
                    className="min-h-[44px] w-full cursor-pointer rounded-full border-0 bg-blue px-4 text-sm font-bold text-on-accent transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(draft.id, "rejected")}
                    className="min-h-[44px] w-full cursor-pointer rounded-full border border-destructive-text bg-card px-4 text-sm font-bold text-destructive-text transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
                  >
                    Reject
                  </button>
                </>
              )}
              {draft.status !== "draft" && (
                <div className="self-center text-xs font-semibold uppercase tracking-wider text-secondary md:self-end">
                  Status: {draft.status}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
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
  approved: "Đã duyệt (Cấp 5)",
  rejected: "Đã từ chối",
};

export default function AdminReviewPage() {
  const [activeTab, setActiveTab] = useState<"coaches" | "drafts">("coaches");

  // Drafts state
  const [drafts, setDrafts] = useState<CoachDraft[]>(SAMPLE_DRAFTS);
  const [draftFilter, setDraftFilter] = useState<"all" | CoachDraft["status"]>("all");

  // Coach applications state
  const [applications, setApplications] = useState<CoachApplication[]>(() => getCoachApplications());
  const [appFilter, setAppFilter] = useState<"all" | CoachApplication["status"]>("all");

  const handleUpdateDraftStatus = (id: string, newStatus: "published" | "rejected") => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  const handleUpdateAppStatus = (id: string, newStatus: "approved" | "rejected") => {
    updateCoachApplicationStatus(id, newStatus);
    setApplications(getCoachApplications());
  };

  const filteredDrafts = drafts.filter((d) => (draftFilter === "all" ? true : d.status === draftFilter));
  const filteredApps = applications.filter((a) => (appFilter === "all" ? true : a.status === appFilter));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 bg-page px-4 py-6 font-sans text-text sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-card-border pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center rounded-full bg-warning-bg px-3 py-1 text-[11px] font-bold tracking-wider text-warning-text">
            Khu vực quản trị
          </div>
          <h1 className="m-0 font-display text-3xl font-extrabold italic tracking-tight text-text">
            Quản trị & Kiểm duyệt
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Xét duyệt hồ sơ ứng tuyển Huấn luyện viên (Cấp 5) và các bản nháp thực đơn chuyên môn.
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center gap-2 rounded-full bg-page p-1 border border-card-border">
          <button
            type="button"
            onClick={() => setActiveTab("coaches")}
            className={`min-h-[44px] cursor-pointer rounded-full px-5 text-xs font-bold transition-colors border-0 ${
              activeTab === "coaches" ? "bg-ink text-on-dark shadow-xs" : "bg-transparent text-secondary hover:text-text"
            }`}
          >
            Duyệt Huấn luyện viên ({applications.filter((a) => a.status === "pending").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("drafts")}
            className={`min-h-[44px] cursor-pointer rounded-full px-5 text-xs font-bold transition-colors border-0 ${
              activeTab === "drafts" ? "bg-ink text-on-dark shadow-xs" : "bg-transparent text-secondary hover:text-text"
            }`}
          >
            Duyệt thực đơn ({drafts.filter((d) => d.status === "draft").length})
          </button>
        </div>
      </div>

      {/* Coach Applications Tab */}
      {activeTab === "coaches" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-base font-bold text-text">Hồ sơ ứng tuyển Cấp 5 (Huấn luyện viên)</h2>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc hồ sơ">
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAppFilter(tab)}
                  className={`min-h-[40px] cursor-pointer rounded-full px-4 text-xs font-bold transition-transform duration-150 active:scale-[0.97] ${
                    appFilter === tab
                      ? "border-0 bg-ink text-on-dark"
                      : "border border-card-border bg-card text-text hover:bg-page"
                  }`}
                >
                  {tab === "all" ? "Tất cả" : APP_STATUS_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {filteredApps.length === 0 ? (
              <div className="rounded-[18px] border border-card-border bg-card p-8 text-center text-secondary">
                Không có hồ sơ nào trong mục này.
              </div>
            ) : (
              filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col justify-between gap-5 rounded-[18px] border border-card-border bg-card p-4 sm:p-6 md:flex-row sm:gap-6"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="m-0 text-base font-bold text-text">{app.name}</h3>
                      <span className="text-xs text-secondary">{app.email}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${
                          app.status === "approved"
                            ? "bg-blue text-on-accent"
                            : app.status === "rejected"
                            ? "bg-destructive-text text-on-accent"
                            : "bg-warning-bg text-warning-text"
                        }`}
                      >
                        {APP_STATUS_LABELS[app.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-medium text-secondary">
                      <span className="rounded-lg bg-page px-2.5 py-1 border border-card-border">
                        Chuyên môn: <strong className="text-text">{app.specialty}</strong>
                      </span>
                      <span className="rounded-lg bg-page px-2.5 py-1 border border-card-border">
                        Kinh nghiệm: <strong className="text-text">{app.experienceYears} năm</strong>
                      </span>
                      {app.socialLink && (
                        <a
                          href={app.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-page px-2.5 py-1 border border-card-border text-blue hover:underline"
                        >
                          Xem nhóm cộng đồng
                        </a>
                      )}
                    </div>

                    <div className="rounded-xl bg-page p-3.5 text-xs text-secondary leading-relaxed border border-card-border">
                      <strong className="text-text block mb-1">Giới thiệu & Chứng chỉ:</strong>
                      {app.message}
                    </div>
                  </div>

                  <div className="flex min-w-[170px] shrink-0 justify-end gap-3 md:flex-col self-end md:self-center">
                    {app.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateAppStatus(app.id, "approved")}
                          className="min-h-[44px] w-full cursor-pointer rounded-full border-0 bg-blue px-4 text-xs font-bold text-on-accent transition-transform duration-150 active:scale-[0.97]"
                        >
                          Duyệt Cấp 5 (HLV)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAppStatus(app.id, "rejected")}
                          className="min-h-[44px] w-full cursor-pointer rounded-full border border-destructive-text bg-card px-4 text-xs font-bold text-destructive-text transition-transform duration-150 active:scale-[0.97]"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {app.status !== "pending" && (
                      <div className="self-center text-xs font-semibold tracking-wider text-secondary md:self-end">
                        {APP_STATUS_LABELS[app.status]}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Meal Plan Drafts Tab */}
      {activeTab === "drafts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-base font-bold text-text">Bản nháp thực đơn chuyên môn</h2>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc bản nháp">
              {(["all", "draft", "published", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={draftFilter === tab}
                  onClick={() => setDraftFilter(tab)}
                  className={`min-h-[40px] cursor-pointer rounded-full px-4 text-xs font-bold tracking-wider transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                    draftFilter === tab
                      ? "border-0 bg-ink text-on-dark"
                      : "border border-card-border bg-card text-text hover:bg-page"
                  }`}
                >
                  {DRAFT_FILTER_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {filteredDrafts.map((draft) => (
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
                      className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${
                        draft.status === "published"
                          ? "bg-blue text-on-accent"
                          : draft.status === "rejected"
                          ? "bg-destructive-text text-on-accent"
                          : "bg-warning-bg text-warning-text"
                      }`}
                    >
                      {DRAFT_STATUS_LABELS[draft.status]}
                    </span>
                    <span className="text-xs text-secondary tabular-nums">
                      Mã bản ghi: <strong className="text-text">{draft.commit_hash}</strong>
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
                        onClick={() => handleUpdateDraftStatus(draft.id, "published")}
                        className="min-h-[44px] w-full cursor-pointer rounded-full border-0 bg-blue px-4 text-sm font-bold text-on-accent transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDraftStatus(draft.id, "rejected")}
                        className="min-h-[44px] w-full cursor-pointer rounded-full border border-destructive-text bg-card px-4 text-sm font-bold text-destructive-text transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {draft.status !== "draft" && (
                    <div className="self-center text-xs font-semibold tracking-wider text-secondary md:self-end">
                      Trạng thái: {DRAFT_STATUS_LABELS[draft.status]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

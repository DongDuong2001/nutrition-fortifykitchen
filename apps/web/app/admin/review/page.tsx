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
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-black">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] bg-[#F59E0B] text-black border-2 border-black font-black text-[10px] uppercase font-mono shadow-[2px_2px_0px_0px_#000] mb-2">
            Admin RBAC Guarded
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] uppercase tracking-tight">
            Coach Vault Review
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-0.5">
            Review and publish markdown meal plans synchronized from GitHub repository
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "draft", "published", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`neo-btn px-3 py-1.5 text-[11px] font-black uppercase tracking-wider min-h-[34px] ${
                filter === tab
                  ? "neo-btn-emerald"
                  : "neo-btn-dark text-[#94A3B8]"
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
            className="neo-card p-4 sm:p-6 flex flex-col md:flex-row justify-between gap-5 sm:gap-6"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="font-mono text-xs px-2.5 py-1 rounded-[3px] bg-[#0B0F17] text-[#10B981] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] truncate max-w-full">
                  {draft.file_path}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-[3px] uppercase font-black font-mono border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                    draft.status === "published"
                      ? "bg-[#10B981] text-black"
                      : draft.status === "rejected"
                      ? "bg-[#F43F5E] text-white"
                      : "bg-[#F59E0B] text-black"
                  }`}
                >
                  {draft.status}
                </span>
                <span className="text-[11px] text-[#94A3B8] font-mono">
                  commit: <strong className="text-[#F8FAFC]">{draft.commit_hash}</strong>
                </span>
              </div>

              <pre className="p-3.5 sm:p-4 rounded-[4px] bg-[#0B0F17] text-[#E2E8F0] font-mono text-xs overflow-x-auto whitespace-pre-wrap border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                {draft.markdown_content}
              </pre>
            </div>

            <div className="flex md:flex-col justify-end gap-2.5 min-w-[150px] shrink-0">
              {draft.status === "draft" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(draft.id, "published")}
                    className="neo-btn neo-btn-emerald px-4 py-2 text-xs font-black w-full min-h-[40px]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(draft.id, "rejected")}
                    className="neo-btn px-4 py-2 text-xs font-black bg-[#F43F5E] text-white hover:bg-rose-600 border-2 border-black w-full min-h-[40px]"
                  >
                    Reject
                  </button>
                </>
              )}
              {draft.status !== "draft" && (
                <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider italic self-center md:self-end">
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

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeader } from "@/components/ui/section-title";
import { useDiary } from "@/lib/diary-store";
import { coursesErrorText, type CourseCode, type CoursesApi } from "@/lib/courses";

// "23/10": vi-VN writes day and month alone with a dash, the app writes dd/mm
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }).replace("-", "/");

/**
 * "Mã cho khóa này" (design/courses CoachCourse): the coach's codes for one course. A new code shows once, with Sao chép; the live
 * ones are listed by date with Thu hồi. Only for a course with `access: code`.
 */
export function CourseCodes({ courseId, api }: { courseId: string; api: CoursesApi }) {
  const { notify } = useDiary();
  const [codes, setCodes] = useState<CourseCode[] | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api.codes(courseId).then(setCodes, (e) => setError(coursesErrorText(e))), [api, courseId]);
  useEffect(() => void load(), [load]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await api.createCode(courseId);
      setMade(code.code);
      setCodes((current) => [{ id: code.id, createdAt: code.createdAt, expiresAt: code.expiresAt }, ...(current ?? [])]);
    } catch (err) {
      setError(coursesErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      await api.revokeCode(courseId, id);
      setCodes((current) => (current ?? []).filter((c) => c.id !== id));
      notify("Đã thu hồi mã");
    } catch (err) {
      setError(coursesErrorText(err));
    }
  };

  const copy = async () => {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made);
      notify("Đã sao chép mã");
    } catch {
      setError("Không sao chép được. Chọn mã rồi sao chép tay.");
    }
  };

  const newest = codes?.[0];
  return (
    <Card as="section" aria-labelledby="course-codes-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <SectionHeader id="course-codes-title">Mã cho khóa này</SectionHeader>
        <p className="m-0 text-cap leading-snug text-secondary">Một mã mở cả khóa. Mỗi mã dùng được 30 ngày.</p>
      </div>
      {made && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3" data-align-group="course-code-row">
          <span className="text-cap font-semibold text-secondary">Mã mới, chỉ hiện một lần</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <output aria-label="Mã truy cập mới" className="select-all font-display text-title-sm font-black italic tracking-display tabular-nums text-text">
              {made}
            </output>
            <PillButton size="sm" variant="secondary" onClick={() => void copy()}>
              Sao chép
            </PillButton>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-callout">Mã đang dùng: {codes?.length ?? 0}</span>
          {newest && codes && codes.length > 1 && (
            <span className="text-cap text-secondary">
              Mới nhất: tạo {shortDate(newest.createdAt)} · hết hạn {shortDate(newest.expiresAt)}
            </span>
          )}
        </span>
        <PillButton size="md" onClick={() => void create()} disabled={busy} aria-disabled={busy} data-tour="course-new-code" className="shrink-0">
          {busy ? "Đang tạo…" : "Tạo mã mới"}
        </PillButton>
      </div>
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-destructive-text">
          {error}
        </p>
      )}
      {codes && codes.length > 0 && (
        <ul aria-label="Mã đang dùng" className="m-0 flex list-none flex-col p-0">
          {codes.map((c, i) => (
            <li key={c.id} data-align-group="course-code-row" className={`flex min-h-12 items-center justify-between gap-3 ${i > 0 ? "border-t border-divider" : ""}`}>
              <span className="text-callout leading-snug">
                Tạo {shortDate(c.createdAt)} · hết hạn {shortDate(c.expiresAt)}
              </span>
              <PillButton size="sm" variant="danger" onClick={() => void revoke(c.id)} aria-label={`Thu hồi mã tạo ${shortDate(c.createdAt)}`}>
                Thu hồi
              </PillButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

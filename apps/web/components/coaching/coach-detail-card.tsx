import React from "react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import type { CoachProfile } from "@/lib/coaches";
import { formatNumber } from "@/lib/format";
import { IconCheck, IconSparkles } from "@/components/ui/icons";
import { initialsOf } from "./coach-initials";

const LINK_BUTTON =
  "flex min-h-11 w-full items-center justify-center rounded-full border border-card-border bg-card px-4 text-[13px] font-bold text-text no-underline hover:bg-surface hover:text-text m-tint";

/** A coach's profile: who, what they know, what they recommend, how to reach them. The page's h1 is the name. */
export function CoachDetailCard({ coach }: { coach: CoachProfile }) {
  const statsLine = [
    coach.experienceYears ? `${coach.experienceYears} năm kinh nghiệm` : null,
    coach.clientsHelped ? `Đã hỗ trợ ${formatNumber(coach.clientsHelped)}+ học viên` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col gap-4">
      <Card as="section" aria-label="Hồ sơ huấn luyện viên" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue font-display text-3xl font-extrabold italic text-on-accent"
          >
            {initialsOf(coach.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {coach.featured && (
              <span className="w-fit rounded-full bg-blue px-2 py-0.5 text-[11px] font-bold text-on-accent">
                Huấn luyện viên tiêu biểu
              </span>
            )}
            <p className="m-0 text-[15px] font-bold leading-snug text-blue">{coach.title}</p>
            {statsLine && <p className="m-0 text-[13px] leading-snug text-secondary">{statsLine}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <SectionTitle as="h2">Giới thiệu</SectionTitle>
          <p className="m-0 text-[15px] leading-relaxed text-text">{coach.bio}</p>
        </div>

        {coach.specialties.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionTitle as="h2">Lĩnh vực chuyên môn</SectionTitle>
            <ul role="list" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {coach.specialties.map((s) => (
                <li key={s} className="rounded-full border border-card-border bg-surface px-3 py-1 text-[13px] font-semibold text-text">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {coach.credentials.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionTitle as="h2">Bằng cấp và chứng nhận</SectionTitle>
            <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] text-secondary">
              {coach.credentials.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <IconCheck className="shrink-0 text-blue" />
                  <span className="leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {coach.recommendedFoods.length > 0 && (
        <Card as="section" aria-labelledby="coach-foods" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconSparkles className="shrink-0 text-blue" />
            <SectionTitle as="h2" id="coach-foods">
              Món ăn huấn luyện viên khuyên dùng
            </SectionTitle>
          </div>
          <ul role="list" className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {coach.recommendedFoods.map((f) => (
              <li key={f} className="flex min-h-11 items-center rounded-xl border border-card-border bg-surface px-3 py-2 text-[13px] font-semibold leading-snug text-text">
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {Object.values(coach.social).some(Boolean) && (
      <Card as="section" aria-labelledby="coach-contact" className="flex flex-col gap-3">
        <SectionTitle as="h2" id="coach-contact">
          Kết nối với huấn luyện viên
        </SectionTitle>
        <p className="m-0 text-[13px] leading-snug text-secondary">
          Tham gia nhóm cộng đồng hỗ trợ dinh dưỡng hoặc đặt lịch tư vấn 1:1 cùng huấn luyện viên.
        </p>
        <div className="flex flex-col gap-2">
          {coach.social.bookingUrl && (
            <a
              href={coach.social.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-blue px-6 text-base font-bold text-on-accent no-underline hover:text-on-accent m-tint"
            >
              Đặt lịch tư vấn 1:1
            </a>
          )}
          {coach.social.zaloGroup && (
            <a href={coach.social.zaloGroup} target="_blank" rel="noopener noreferrer" className={LINK_BUTTON}>
              Tham gia nhóm Zalo
            </a>
          )}
          {coach.social.facebookCommunity && (
            <a href={coach.social.facebookCommunity} target="_blank" rel="noopener noreferrer" className={LINK_BUTTON}>
              Cộng đồng Facebook
            </a>
          )}
        </div>
      </Card>
      )}
    </div>
  );
}

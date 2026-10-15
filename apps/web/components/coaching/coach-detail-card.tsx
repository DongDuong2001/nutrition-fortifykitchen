import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import type { CoachProfile } from "@/lib/coaches";
import { IconBadge, IconCheck, IconSparkles, IconLink } from "@/components/ui/icons";

export function CoachDetailCard({ coach }: { coach: CoachProfile }) {
  const initials = coach.name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {/* Header Profile Card */}
      <Card as="section" className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue text-xl font-extrabold text-on-accent shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-xl font-extrabold text-text">{coach.name}</h1>
              {coach.featured && (
                <span className="shrink-0 flex items-center gap-1 rounded-full bg-blue px-2.5 py-0.5 text-[11px] font-bold text-on-accent">
                  <IconBadge size={12} />
                  <span>Tiêu biểu</span>
                </span>
              )}
            </div>
            <p className="m-0 text-sm font-semibold text-blue">{coach.title}</p>
            <p className="m-0 pt-1 text-[13px] text-secondary">
              {coach.experienceYears} năm kinh nghiệm · Đã hỗ trợ {coach.clientsHelped}+ học viên
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-card-border/60">
          <h2 className="m-0 text-sm font-bold text-text">Giới thiệu</h2>
          <p className="m-0 text-sm leading-relaxed text-text">{coach.bio}</p>
        </div>

        {/* Specialties */}
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-sm font-bold text-text">Lĩnh vực chuyên môn</h2>
          <div className="flex flex-wrap gap-2">
            {coach.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-page px-3 py-1.5 text-xs font-bold text-text border border-card-border"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-sm font-bold text-text">Bằng cấp & Chứng nhận</h2>
          <ul className="m-0 flex flex-col gap-2 p-0 list-none text-xs font-medium text-secondary">
            {coach.credentials.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <IconCheck size={14} className="text-blue shrink-0" aria-hidden="true" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Recommended Foods */}
      {coach.recommendedFoods.length > 0 && (
        <Card as="section" className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <IconSparkles size={16} className="text-blue" aria-hidden="true" />
            <h2 className="m-0 text-sm font-bold text-text">Món ăn khuyên dùng bởi HLV</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {coach.recommendedFoods.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-[12px] bg-page p-3 border border-card-border/80"
              >
                <span className="text-xs font-semibold text-text">{f}</span>
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* Direct Contact & Group Join CTAs */}
      <Card as="section" className="flex flex-col gap-3 p-5 bg-card">
        <h2 className="m-0 text-sm font-bold text-text">Kết nối với Huấn luyện viên</h2>
        <p className="m-0 text-[13px] leading-relaxed text-secondary">
          Tham gia nhóm cộng đồng hỗ trợ dinh dưỡng hoặc đặt lịch tư vấn 1:1 cùng huấn luyện viên.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          {coach.social.bookingUrl && (
            <a
              href={coach.social.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-blue text-base font-bold text-on-accent no-underline shadow-sm transition-transform duration-150 active:scale-[0.97]"
            >
              Đặt lịch tư vấn 1:1
            </a>
          )}
          {coach.social.zaloGroup && (
            <a
              href={coach.social.zaloGroup}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-full bg-page border border-card-border text-[13px] font-bold text-text no-underline hover:bg-card-border/30 transition-colors"
            >
              Tham gia nhóm Zalo HLV
            </a>
          )}
          {coach.social.facebookCommunity && (
            <a
              href={coach.social.facebookCommunity}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-full bg-page border border-card-border text-[13px] font-bold text-text no-underline hover:bg-card-border/30 transition-colors"
            >
              Cộng đồng Facebook
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}

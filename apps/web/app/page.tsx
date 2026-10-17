import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessRow } from "@/components/link-page/access-row";
import { CoachHeader } from "@/components/link-page/coach-header";
import { LinkBackground } from "@/components/link-page/link-background";
import { LinkRowContent, ROW_CLASS, ROW_ICON_CLASS } from "@/components/link-page/link-row";
import { COACH, FORTIFY_KITCHEN } from "@/lib/coach-links";
import { homeRedirectFor } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Lê Hồng Khánh · HIT1 Coaching",
  description: COACH.tagline,
};

/**
 * The coach link page (LinkKhanh.dc.html, LinkKhanhDesktop.dc.html): public, no app shell. Hôm nay lives at
 * HOME_ROUTE; an old "/?date=…" (or any Hôm nay query) is sent there with its query.
 */
export default async function LinkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const home = homeRedirectFor(await searchParams);
  if (home) redirect(home);

  return (
    <div className="relative flex-1 overflow-hidden bg-page">
      <LinkBackground />
      <main className="relative flex flex-col gap-10 px-6 pt-16 pb-8 lg:mx-auto lg:w-[480px] lg:gap-11 lg:px-0 lg:pt-[168px]">
        <CoachHeader />
        <ul className="m-0 flex list-none flex-col p-0">
          <li className="border-b border-divider">
            <AccessRow />
          </li>
          <li className="border-b border-divider">
            <a href={FORTIFY_KITCHEN.orderHref} className={ROW_CLASS} data-align-group="link-rows">
              <LinkRowContent
                icon={
                  FORTIFY_KITCHEN.logo ? (
                    <img src={FORTIFY_KITCHEN.logo} alt="" width={32} height={32} className={`block ${ROW_ICON_CLASS}`} />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`${ROW_ICON_CLASS} flex items-center justify-center bg-ink font-display text-sm font-extrabold text-on-dark lg:text-[15px]`}
                    >
                      FK
                    </span>
                  )
                }
                title={FORTIFY_KITCHEN.name}
                line={FORTIFY_KITCHEN.line}
                action="Đặt món"
              />
            </a>
          </li>
        </ul>
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { HOME_ROUTE, homeRedirectFor } from "@/lib/nav";

/** Hôm nay lives at HOME_ROUTE; "/" sends there, with an old "/?date=…" query kept. */
export default async function RootPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(homeRedirectFor(await searchParams) ?? HOME_ROUTE);
}

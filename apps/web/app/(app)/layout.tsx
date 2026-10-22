import { DiaryProviderWrapper } from "@/components/diary-provider-wrapper";
import { FeedbackHost } from "@/components/feedback/feedback-host";

/**
 * cc-58: every screen that reads or writes the diary (Hôm nay and the other tabs, /add, a food, an entry, Ngày tập, the
 * settings pages, setup, coach and admin) sits under the one DiaryProvider. The public screens (landing, sign-in, sign-up,
 * terms, privacy, offline, install, reset-password, paywall) are outside it and never load the diary store.
 * (tabs)/layout.tsx is the shared tab frame from cc-57. FeedbackHost: the one Góp ý & hỗ trợ sheet (lib/feedback openFeedback).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DiaryProviderWrapper>
      {children}
      <FeedbackHost />
    </DiaryProviderWrapper>
  );
}

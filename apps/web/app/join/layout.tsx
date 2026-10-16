import type { Metadata } from "next";

// A coach's invite link is shared privately: never listed, and not followed
export const metadata: Metadata = { title: "Tham gia HLV", robots: { index: false, follow: false } };

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

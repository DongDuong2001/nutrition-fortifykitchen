import type { Metadata } from "next";
import { RoleGate } from "@/components/auth/role-gate";

// Coach screens are for coaches and admins: no listing, and a 404 for everyone else
export const metadata: Metadata = { title: "Học viên", robots: { index: false, follow: false } };

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["coach", "admin"]}>{children}</RoleGate>;
}

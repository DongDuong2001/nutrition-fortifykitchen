import type { Metadata } from "next";
import { RoleGate } from "@/components/auth/role-gate";

// The review queue is for admins only: no listing, and a 404 for everyone else (components/auth/role-gate.tsx)
export const metadata: Metadata = { title: "Quản trị", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["admin"]}>{children}</RoleGate>;
}

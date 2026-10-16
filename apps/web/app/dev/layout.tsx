import type { ReactNode } from "react";
import { notFound } from "next/navigation";

// The component showcase is for development only: a production build answers 404 for everything under /dev
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}

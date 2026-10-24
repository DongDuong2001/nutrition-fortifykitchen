import { redirect } from "next/navigation";

/** Tài liệu moved into Khám phá as courses (an old link or bookmark lands on the library). */
export default function DocumentsRedirect() {
  redirect("/explore/documents");
}

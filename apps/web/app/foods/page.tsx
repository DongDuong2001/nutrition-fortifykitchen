import { permanentRedirect } from "next/navigation";

/** The food catalog page is gone. Food search and create live on /add. */
export default function FoodsPage() {
  permanentRedirect("/add");
}

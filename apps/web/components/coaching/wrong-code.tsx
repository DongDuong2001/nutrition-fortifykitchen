import Link from "next/link";
import { Card } from "@/components/ui/card";
import { WRONG_CODE } from "@/lib/level-copy";

/** The coach code is not one: say so, and offer the code field in Cài đặt. */
export function WrongCode() {
  return (
    <Card className="flex flex-col gap-3">
      <p role="alert" className="m-0 text-[15px] leading-snug text-text">
        {WRONG_CODE}
      </p>
      <Link href="/settings/coach" className="inline-flex min-h-[44px] items-center text-[15px] font-bold text-blue no-underline">
        Nhập mã khác
      </Link>
    </Card>
  );
}

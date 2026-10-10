"use client";

import React, { use } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { getNutrientDefinition } from "@/lib/nutrients";

interface PageProps {
  params: Promise<{ nutrient: string }>;
}

export default function NutrientDetailPage({ params }: PageProps) {
  const { nutrient } = use(params);
  const def = getNutrientDefinition(nutrient);

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      <Header
        title={def?.nameVi ? def.nameVi.toUpperCase() : "CHI TIẾT VI CHẤT"}
        subtitle="Chi tiết vi chất và nguồn thực phẩm"
        backHref="/micros"
      />

      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-6 flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h1 className="text-xl font-bold m-0">{def?.nameVi || nutrient}</h1>
            <span className="text-sm text-secondary font-mono">{def?.unit}</span>
          </div>
          <p className="text-sm text-secondary m-0">
            Trang chi tiết vi chất đang được xây dựng theo lộ trình.
          </p>
          <div className="pt-2">
            <Link
              href="/micros"
              className="inline-flex items-center text-sm font-semibold text-blue no-underline min-h-[44px]"
            >
              ← Quay lại danh sách vi chất
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}

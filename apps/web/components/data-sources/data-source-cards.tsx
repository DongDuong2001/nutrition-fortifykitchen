import React from "react";
import { Card } from "@/components/ui/card";
import { DATA_SOURCES, DATA_READING_GUIDE } from "@/lib/data-sources";

export function DataSourceCards() {
  return (
    <div className="flex flex-col gap-3">
      {DATA_SOURCES.map((source) => (
        <Card as="article" key={source.id} className="flex flex-col gap-1 p-4">
          <h3 className="m-0 text-[15px] font-bold text-text leading-snug">{source.name}</h3>
          <p className="m-0 text-[13px] text-secondary leading-relaxed">{source.description}</p>
        </Card>
      ))}

      <Card as="article" className="flex flex-col gap-2 p-4 bg-card border border-card-border">
        <h3 className="m-0 text-[15px] font-bold text-text leading-snug">{DATA_READING_GUIDE.title}</h3>
        <ul className="m-0 pl-4 list-disc text-[13px] text-secondary leading-relaxed space-y-1">
          <li>{DATA_READING_GUIDE.bullet1}</li>
          <li>{DATA_READING_GUIDE.bullet2}</li>
        </ul>
      </Card>
    </div>
  );
}

import React from "react";
import { Card } from "@/components/ui/card";
import { DATA_SOURCES, DATA_READING_GUIDE } from "@/lib/data-sources";

/** One column on the phone; on desktop the sources sit two to a row and the reading guide spans both. */
export function DataSourceCards() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {DATA_SOURCES.map((source) => (
        <Card as="article" key={source.id} className="flex flex-col gap-1 p-4">
          <h3 className="m-0 text-callout font-bold text-text leading-snug">{source.name}</h3>
          <p className="m-0 text-cap text-secondary leading-relaxed">{source.description}</p>
        </Card>
      ))}

      <Card as="article" className="flex flex-col gap-2 p-4 bg-card border border-card-border lg:col-span-2">
        <h3 className="m-0 text-callout font-bold text-text leading-snug">{DATA_READING_GUIDE.title}</h3>
        <ul className="m-0 pl-4 list-disc text-cap text-secondary leading-relaxed space-y-1">
          <li>{DATA_READING_GUIDE.bullet1}</li>
          <li>{DATA_READING_GUIDE.bullet2}</li>
        </ul>
      </Card>
    </div>
  );
}

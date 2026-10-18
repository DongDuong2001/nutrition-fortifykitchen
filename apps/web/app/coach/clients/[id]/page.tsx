"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { PillButton } from "@/components/ui/pill-button";
import { Toast } from "@/components/ui/toast";
import { Presence } from "@/components/ui/presence";
import { LevelBadge } from "@/components/profile/level-badge";
import { useBack } from "@/hooks/use-back";
import { safeDecode, toLevel } from "@/lib/coaching-link";
import { levelChangedToast, previewForLevel, previewHasChanges } from "@/lib/coach-preview";
import { clientById, readClients, withClientLevel, writeClients, type MockClient } from "@/lib/mock-coach-server";

const LEVEL_CHOICES = [1, 2, 3, 4, 5] as const;

/** One client: their Level, the picker, and a live preview of what their Hôm nay would list. */
export default function CoachClientPage() {
  const goBack = useBack();
  const params = useParams();
  const id = safeDecode(String(params?.id ?? ""));
  const [client, setClient] = useState<MockClient | null | undefined>(undefined);
  const [draft, setDraft] = useState<number>(1);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const found = clientById(readClients(), id);
    setClient(found);
    if (found) setDraft(found.level);
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const current = client ? toLevel(client.level) : 1;
  const draftLevel = toLevel(draft);
  const groups = useMemo(() => previewForLevel(current, draftLevel), [current, draftLevel]);
  const changed = client !== null && client !== undefined && draft !== client.level;

  function save() {
    if (!client || !changed) return;
    const next = withClientLevel(readClients(), client.id, draft);
    writeClients(next);
    const updated = clientById(next, client.id);
    if (updated) {
      setClient(updated);
      setDraft(updated.level);
      setToast(levelChangedToast(updated.name, updated.level));
    }
  }

  return (
    <AppShell alignContainer="coach-client">
      <AppHeader variant="sub" title={client ? client.name : "Học viên"} onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[760px] lg:px-8">
        {client === undefined ? (
          <div aria-busy="true" className="h-[160px] rounded-[18px] bg-divider motion-safe:animate-pulse" />
        ) : client === null ? (
          <Card>
            <p className="m-0 text-[15px] text-secondary">Không tìm thấy học viên này.</p>
          </Card>
        ) : (
          <>
            <Card as="section" aria-label="Level hiện tại" className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-secondary">Level hiện tại</span>
                <span className="text-[15px] font-bold text-text">Level {client.level}</span>
              </div>
              <LevelBadge level={toLevel(client.level)} size="share" />
            </Card>

            <section aria-labelledby="coach-level-pick" className="flex flex-col gap-2">
              <h2 id="coach-level-pick" className="m-0 text-base font-bold">
                Đặt Level
              </h2>
              <ChipGroup
                columns={5}
                tone="light"
                data-align-group="level-pick"
                items={LEVEL_CHOICES.map((n) => ({
                  id: String(n),
                  label: String(n),
                  ariaLabel: `Level ${n}`,
                  active: draft === n,
                  onClick: () => setDraft(n),
                }))}
              />
            </section>

            <Card as="section" aria-labelledby="coach-preview" className="flex flex-col gap-3">
              <h2 id="coach-preview" className="m-0 text-base font-bold">
                Học viên sẽ thấy
              </h2>
              {groups.map((g) => (
                <div key={g.title} className="flex flex-col gap-1">
                  <h3 className="m-0 text-[11px] font-extrabold leading-snug text-secondary">{g.title}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {g.items.map((item) => (
                      <li
                        key={item.id}
                        data-status={item.status}
                        className={`rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none ${
                          item.status === "added"
                            ? "bg-blue/10 text-blue"
                            : item.status === "removed"
                              ? "bg-surface text-secondary line-through"
                              : "bg-surface text-text"
                        }`}
                      >
                        {item.status === "added" && <span className="sr-only">Thêm: </span>}
                        {item.status === "removed" && <span className="sr-only">Bỏ: </span>}
                        {item.status === "added" ? "+ " : item.status === "removed" ? "− " : ""}
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {previewHasChanges(groups) && (
                <p className="m-0 text-[13px] leading-snug text-secondary">+ là chỉ số được thêm, − là chỉ số bị bỏ so với Level hiện tại.</p>
              )}
            </Card>

            <PillButton type="button" disabled={!changed} onClick={save}>
              Lưu
            </PillButton>
          </>
        )}
      </main>
      <Presence>
        {toast && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 px-4 lg:bottom-8 lg:left-60">
            <Toast message={toast} />
          </div>
        )}
      </Presence>
    </AppShell>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { SectionHeader } from "@/components/ui/section-title";
import { SettingsRow } from "@/components/settings/settings-row";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { useAccount } from "@/components/settings/use-account";
import { useCoaching } from "@/hooks/use-coaching";
import { useDiary } from "@/lib/diary-store";
import {
  DocumentsError,
  checkAccessCode,
  createAccessCode,
  documentsErrorText,
  forgetAccessCode,
  getAccessCode,
  isDocumentName,
  listAccessCodes,
  listDocuments,
  openDocument,
  readDocument,
  rememberAccessCode,
  revokeAccessCode,
  saveDocument,
  type AccessCode,
  type DocumentMeta,
} from "@/lib/documents";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";
const ALERT = "m-0 text-xs font-semibold text-destructive-text";
const NAME_RULE = "Tên tệp chỉ gồm chữ không dấu, số, gạch ngang, gạch dưới và dấu chấm.";

/** "Cập nhật 23/10/2026" under a row, when the store gave the time. */
const updatedText = (iso: string | null) => (iso ? `Cập nhật ${new Date(iso).toLocaleDateString("vi-VN")}` : undefined);

// "23/10": vi-VN writes day and month alone with a dash, the app writes dd/mm
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }).replace("-", "/");

/** `record` without `key`. */
const omit = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  const { [key]: _gone, ...rest } = record;
  return rest;
};

/** What the sheet shows: the coach's editor (a new document has no name yet), or a learner's protected reading. */
type Opened =
  | { mode: "edit"; name: string; isNew: boolean; text: string | null; updatedAt?: string; error?: string }
  | { mode: "read"; name: string; text: string | null; error?: string };

/**
 * Tài liệu (feat/documents): the coach's documents and rules (lib/documents). HLV Khánh (a coach or an admin, as the server says)
 * adds a document, uploads a text file or taps one to edit it, and makes access codes for learners (CoachCodes). A learner sees
 * the list; "Nhập mã truy cập" asks for the coach's code once per tab (sessionStorage), and a row then opens the document in
 * ProtectedText: no selecting, copying, saving or printing, blurred when the app is left, the reader's account across it. An edit
 * that was not saved stays as a draft while the sheet is closed (D-SHT-04). Loading, empty and error states inline (D-LOAD).
 */
export function DocumentsScreen() {
  const { notify } = useDiary();
  const { hydrated, role } = useCoaching();
  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // The coach's live codes: an array means this account writes (the server lets it list codes); null is a learner, or not known yet
  const [codes, setCodes] = useState<AccessCode[] | null>(null);
  // A learner's code for this tab, read after mount (the server has no sessionStorage); null means locked
  const [code, setCode] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  // The row a locked learner tapped: opened as soon as the code is in
  const pendingOpen = useRef<string | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { text: string; base: string }>>({});
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const writer = codes !== null;

  const load = useCallback(async () => {
    setListError(null);
    try {
      setDocs(await listDocuments());
    } catch (error) {
      setDocs([]);
      setListError(documentsErrorText(error));
    }
  }, []);

  useEffect(() => {
    setCode(getAccessCode());
    void load();
  }, [load]);

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    // A learner gets 403; any other failure also leaves the coach's tools hidden, as the list above says the server cannot be reached
    listAccessCodes(role).then(
      (list) => live && setCodes(list),
      () => live && setCodes(null)
    );
    return () => {
      live = false;
    };
  }, [hydrated, role]);

  const read = async (name: string, withCode: string) => {
    setOpened({ mode: "read", name, text: null });
    try {
      const text = await openDocument(name, withCode);
      setOpened((current) => (current?.name === name ? { mode: "read", name, text } : current));
    } catch (error) {
      // The code expired or was revoked: the tab is locked again and asks for a new one
      if (error instanceof DocumentsError && error.status === 403) {
        forgetAccessCode();
        setCode(null);
      }
      setOpened((current) => (current?.name === name ? { mode: "read", name, text: null, error: documentsErrorText(error) } : current));
    }
  };

  const edit = async (name: string) => {
    setSaveError(null);
    setOpened({ mode: "edit", name, isNew: false, text: null });
    try {
      const doc = await readDocument(name, role);
      // A draft made on an older version would cover the newer text: it is dropped (a 409 asked to copy the edits out first)
      setDrafts((current) => (current[name] && current[name].base !== doc.updatedAt ? omit(current, name) : current));
      setOpened((current) => (current?.name === name ? { mode: "edit", name, isNew: false, text: doc.content, updatedAt: doc.updatedAt } : current));
    } catch (error) {
      setOpened((current) => (current?.name === name ? { mode: "edit", name, isNew: false, text: null, error: documentsErrorText(error) } : current));
    }
  };

  const tapRow = (name: string) => {
    if (writer) return void edit(name);
    if (code) return void read(name, code);
    pendingOpen.current = name;
    setAsking(true);
  };

  const startNew = () => {
    setSaveError(null);
    setNewName("");
    setOpened({ mode: "edit", name: "", isNew: true, text: "" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (opened?.mode !== "edit" || opened.text === null) return;
    const name = opened.isNew ? newName.trim() : opened.name;
    if (!isDocumentName(name)) {
      setSaveError(NAME_RULE);
      return;
    }
    if (opened.isNew && docs?.some((d) => d.name === name)) {
      setSaveError("Đã có tài liệu tên này. Đặt tên khác, hoặc mở tài liệu đó để sửa.");
      return;
    }
    const key = opened.isNew ? "" : name;
    const text = drafts[key]?.text ?? opened.text;
    setSaving(true);
    setSaveError(null);
    try {
      await saveDocument(name, text, role, opened.isNew ? undefined : opened.updatedAt);
      setDrafts((current) => omit(current, key));
      setOpened(null);
      notify(`Đã lưu ${name}`);
      void load();
    } catch (error) {
      setSaveError(documentsErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploadError(null);
    if (!isDocumentName(file.name)) {
      setUploadError(NAME_RULE);
      return;
    }
    try {
      await saveDocument(file.name, await file.text(), role);
      // The upload replaces the document: a draft kept for the old text would cover it in the editor
      setDrafts((current) => omit(current, file.name));
      notify(`Đã tải lên ${file.name}`);
      void load();
    } catch (error) {
      setUploadError(documentsErrorText(error));
    }
  };

  const draftKey = opened?.mode === "edit" ? (opened.isNew ? "" : opened.name) : "";
  const draft = opened?.mode === "edit" && opened.text !== null ? (drafts[draftKey]?.text ?? opened.text) : "";
  const changed = opened?.mode === "edit" && opened.text !== null && (draft !== opened.text || opened.isNew);

  return (
    <AppShell alignContainer="documents-page">
      <AppHeader variant="sub" title="Tài liệu" backHref="/settings" layout="wide" alignGroup="documents-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-col gap-2">
          {writer ? (
            <div className="flex flex-wrap items-center gap-3">
              <PillButton size="md" onClick={startNew} data-tour="documents-new">
                Thêm tài liệu
              </PillButton>
              <PillButton size="md" variant="secondary" onClick={() => fileInput.current?.click()} data-tour="documents-upload">
                Tải lên tệp
              </PillButton>
              <input
                ref={fileInput}
                type="file"
                accept=".md,.txt,text/*"
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </div>
          ) : code ? (
            <p className="m-0 text-cap leading-snug text-secondary">Đã mở khóa. Chạm một tài liệu để đọc.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <PillButton size="md" variant="secondary" onClick={() => setAsking(true)} data-tour="documents-edit">
                Nhập mã truy cập
              </PillButton>
              <span className="text-cap leading-snug text-secondary">HLV gửi mã để bạn đọc tài liệu.</span>
            </div>
          )}
          {uploadError && (
            <p role="alert" className={ALERT}>
              {uploadError}
            </p>
          )}
        </div>

        {docs === null ? (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : listError ? (
          <EmptyState
            title="Không tải được tài liệu"
            actions={
              <PillButton size="md" variant="secondary" onClick={() => void load()}>
                Thử lại
              </PillButton>
            }
          >
            {listError}
          </EmptyState>
        ) : docs.length === 0 ? (
          <EmptyState title="Chưa có tài liệu">{writer ? "Chạm Thêm tài liệu, hoặc tải lên tệp .md hay .txt đầu tiên." : "HLV chưa thêm tài liệu nào."}</EmptyState>
        ) : (
          <Card as="section" aria-label="Danh sách tài liệu" className="flex flex-col gap-1">
            {docs.map((d, i) => (
              <SettingsRow
                key={d.name}
                dense
                tone="data"
                glyph={SETTINGS_ICONS.document}
                label={d.name}
                hint={updatedText(d.updatedAt)}
                onClick={() => tapRow(d.name)}
                divider={i > 0}
                minHeight="14"
                data-align-group="documents-row"
              />
            ))}
          </Card>
        )}

        {codes && <CoachCodes codes={codes} setCodes={setCodes} />}
      </main>

      <AccessCodeSheet
        open={asking}
        onClose={() => {
          pendingOpen.current = null;
          setAsking(false);
        }}
        onUnlocked={(unlocked) => {
          setCode(unlocked);
          setAsking(false);
          const name = pendingOpen.current;
          pendingOpen.current = null;
          if (name) void read(name, unlocked);
        }}
      />

      <Sheet
        open={opened !== null}
        onClose={() => setOpened(null)}
        title={opened?.mode === "edit" && opened.isNew ? "Tài liệu mới" : opened?.name}
        titleId="documents-document-title"
        desktopDialog
      >
        {opened &&
          (opened.error ? (
            <EmptyState
              title="Không mở được tài liệu"
              actions={
                opened.mode === "edit" || code ? (
                  <PillButton size="md" variant="secondary" onClick={() => void (opened.mode === "edit" ? edit(opened.name) : code && read(opened.name, code))}>
                    Thử lại
                  </PillButton>
                ) : undefined
              }
            >
              {opened.error}
            </EmptyState>
          ) : opened.text === null ? (
            <div aria-busy="true" aria-live="polite" className="flex flex-col gap-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 rounded-md bg-divider animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          ) : opened.mode === "read" ? (
            <ProtectedText text={opened.text} />
          ) : (
            <form onSubmit={save} className="flex flex-col gap-3">
              {opened.isNew && (
                <FormRow label="Tên tệp" htmlFor="documents-new-name" hint="ví dụ huong-dan.md">
                  <input
                    id="documents-new-name"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`${FIELD} h-12 px-3`}
                  />
                </FormRow>
              )}
              <label htmlFor="documents-editor" className="sr-only">
                Nội dung {opened.name}
              </label>
              {changed && !opened.isNew && <p className="m-0 text-cap leading-snug text-secondary">Bản nháp chưa lưu</p>}
              <textarea
                id="documents-editor"
                value={draft}
                onChange={(e) => setDrafts((current) => ({ ...current, [draftKey]: { text: e.target.value, base: opened.updatedAt ?? "" } }))}
                spellCheck={false}
                className={`${FIELD} min-h-[50vh] resize-y p-3 leading-relaxed`}
              />
              {saveError && (
                <p role="alert" className={ALERT}>
                  {saveError}
                </p>
              )}
              <PillButton type="submit" disabled={saving || !changed}>
                {saving ? "Đang lưu…" : "Lưu"}
              </PillButton>
            </form>
          ))}
      </Sheet>
    </AppShell>
  );
}

/**
 * A learner's reading of a coach's document, made hard to take away: the text cannot be selected, copied, dragged, saved or
 * printed, it blurs while the app is not in front (an app switcher's preview, a screen tool taking focus), and the reader's account
 * runs across it, so a photo of the screen still says whose it was. A browser cannot stop the phone's own screenshot.
 */
function ProtectedText({ text }: { text: string }) {
  const { account } = useAccount();
  const { profile } = useDiary();
  const [away, setAway] = useState(false);
  const owner = account?.email || profile.displayName || "H1T MICRO";
  const mark = `${owner} · ${new Date().toLocaleDateString("vi-VN")}`;

  useEffect(() => {
    const leave = () => setAway(true);
    const back = () => setAway(document.hidden);
    const onVisibility = () => setAway(document.hidden);
    // The save, print and copy shortcuts do nothing while the document is open
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "a", "x"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "PrintScreen") setAway(true);
    };
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div className="flex flex-col gap-3">
      <div
        data-protected
        onCopy={block}
        onCut={block}
        onContextMenu={block}
        onDragStart={block}
        className="relative overflow-hidden rounded-xl bg-surface p-3 select-none print:hidden [-webkit-touch-callout:none] [-webkit-user-select:none]"
      >
        <div className={`whitespace-pre-wrap break-words text-callout leading-relaxed text-text transition-[filter] duration-150 ${away ? "blur-md" : ""}`}>{text}</div>
        {/* The reader's account, repeated across the text */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-x-8 gap-y-12 overflow-hidden p-4 opacity-[0.09]">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="-rotate-[24deg] whitespace-nowrap text-cap font-bold text-text">
              {mark}
            </span>
          ))}
        </div>
      </div>
      <p className="m-0 hidden text-callout print:block">Tài liệu này không in được.</p>
      <p className="m-0 text-cap leading-snug text-secondary">Tài liệu của HLV chỉ đọc trong app, không tải về hay sao chép.</p>
    </div>
  );
}

/**
 * Mã truy cập cho học viên: the coach makes a random code here and gives it to a learner, who types it in Nhập mã truy cập to
 * read. A new code shows once, with Sao chép; the live ones are listed by date with Thu hồi.
 */
function CoachCodes({ codes, setCodes }: { codes: AccessCode[]; setCodes: (codes: AccessCode[]) => void }) {
  const { notify } = useDiary();
  const { role } = useCoaching();
  const [made, setMade] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await createAccessCode(role);
      setMade(code.code);
      setCodes([code, ...codes]);
    } catch (err) {
      setError(documentsErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      await revokeAccessCode(id);
      setCodes(codes.filter((c) => c.id !== id));
      notify("Đã thu hồi mã");
    } catch (err) {
      setError(documentsErrorText(err));
    }
  };

  const copy = async () => {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made);
      notify("Đã sao chép mã");
    } catch {
      setError("Không sao chép được. Chọn mã rồi sao chép tay.");
    }
  };

  return (
    <Card as="section" aria-labelledby="documents-codes-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <SectionHeader id="documents-codes-title">Mã truy cập cho học viên</SectionHeader>
        <p className="m-0 text-cap leading-snug text-secondary">Tạo mã ngẫu nhiên rồi gửi cho học viên để họ đọc tài liệu. Mỗi mã dùng được 30 ngày.</p>
      </div>
      {made && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3" data-align-group="documents-code-row">
          <span className="text-cap font-semibold text-secondary">Mã mới, chỉ hiện một lần</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <output aria-label="Mã truy cập mới" className="select-all font-display text-title-sm font-black italic tracking-display tabular-nums text-text">
              {made}
            </output>
            <PillButton size="sm" variant="secondary" onClick={() => void copy()}>
              Sao chép
            </PillButton>
          </div>
        </div>
      )}
      <PillButton size="md" onClick={() => void create()} disabled={busy} data-tour="documents-new-code" className="self-start">
        {busy ? "Đang tạo…" : "Tạo mã mới"}
      </PillButton>
      {error && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {codes.length > 0 && (
        <ul aria-label="Mã đang dùng" className="m-0 flex list-none flex-col p-0">
          {codes.map((c, i) => (
            <li key={c.id} data-align-group="documents-code-row" className={`flex min-h-12 items-center justify-between gap-3 ${i > 0 ? "border-t border-divider" : ""}`}>
              <span className="text-callout leading-snug">
                Tạo {shortDate(c.createdAt)} · hết hạn {shortDate(c.expiresAt)}
              </span>
              <PillButton size="sm" variant="danger" onClick={() => void revoke(c.id)} aria-label={`Thu hồi mã tạo ${shortDate(c.createdAt)}`}>
                Thu hồi
              </PillButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The "Mã truy cập" sheet: one field, checked on the server (POST /document-codes/check); a wrong code says so under the field. */
function AccessCodeSheet({ open, onClose, onUnlocked }: { open: boolean; onClose: () => void; onUnlocked: (code: string) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Mã truy cập" titleId="documents-code-title" desktopDialog initialFocusId="documents-code">
      {/* The form is the Sheet's child, so each opening starts blank (the Sheet remounts its children per opening) */}
      <AccessCodeForm onUnlocked={onUnlocked} />
    </Sheet>
  );
}

function AccessCodeForm({ onUnlocked }: { onUnlocked: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) {
      setError("Nhập mã truy cập");
      return;
    }
    setChecking(true);
    try {
      await checkAccessCode(code);
      rememberAccessCode(code);
      setValue("");
      onUnlocked(code);
    } catch (err) {
      setError(documentsErrorText(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <p className="m-0 text-callout leading-snug text-secondary">Nhập mã HLV gửi để đọc tài liệu. Mã được nhớ đến khi đóng tab này.</p>
      <FormRow label="Mã truy cập" htmlFor="documents-code" error={error}>
        <input
          id="documents-code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          className={`${FIELD} h-12 px-3 ${error ? "shadow-[inset_0_0_0_2px_var(--color-destructive)]" : ""}`}
        />
      </FormRow>
      <PillButton type="submit" disabled={checking}>
        {checking ? "Đang kiểm tra…" : "Mở khóa"}
      </PillButton>
    </form>
  );
}

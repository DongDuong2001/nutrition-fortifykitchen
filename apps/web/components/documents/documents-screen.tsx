"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { SettingsRow } from "@/components/settings/settings-row";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { useDiary } from "@/lib/diary-store";
import {
  DocumentsError,
  documentsErrorText,
  forgetAccessCode,
  getAccessCode,
  isDocumentName,
  listDocuments,
  readDocument,
  rememberAccessCode,
  saveDocument,
  verifyAccessCode,
  type DocumentMeta,
} from "@/lib/documents";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";
const ALERT = "m-0 text-xs font-semibold text-destructive-text";

/** "Cập nhật 23/10/2026" under a row, when the store gave the time. */
const updatedText = (iso: string | null) => (iso ? `Cập nhật ${new Date(iso).toLocaleDateString("vi-VN")}` : undefined);

interface OpenDocument {
  name: string;
  /** null while it loads */
  text: string | null;
  error?: string;
}

/**
 * Tài liệu (feat/documents): the app's documents and rules from the documents bucket (lib/documents). A row opens the document
 * in a sheet. "Cập nhật tài liệu" asks the access code once per tab (sessionStorage); unlocked, the sheet is an editor with Lưu,
 * and the screen gets Tải lên tệp, which adds or replaces a document from a text file. An edit that was not saved stays as a
 * draft while the sheet is closed, so closing it loses nothing (D-SHT-04). Loading, empty and error states inline (D-LOAD).
 */
export function DocumentsScreen() {
  const { notify } = useDiary();
  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // The code this tab was unlocked with, read after mount (the server has no sessionStorage); null means locked
  const [code, setCode] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState<OpenDocument | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  /** The message of a failed write. A 401 means the code changed on the server: the tab is locked again and asks for it. */
  const writeFailed = (error: unknown) => {
    if (error instanceof DocumentsError && error.status === 401) {
      forgetAccessCode();
      setCode(null);
    }
    return documentsErrorText(error);
  };

  const openDocument = async (name: string) => {
    setSaveError(null);
    setOpen({ name, text: null });
    try {
      const text = await readDocument(name);
      setOpen((current) => (current?.name === name ? { name, text } : current));
    } catch (error) {
      setOpen((current) => (current?.name === name ? { name, text: null, error: documentsErrorText(error) } : current));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!open || open.text === null || !code) return;
    const { name } = open;
    const text = drafts[name] ?? open.text;
    setSaving(true);
    setSaveError(null);
    try {
      await saveDocument(name, text, code);
      setDrafts((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      setOpen(null);
      notify(`Đã lưu ${name}`);
      void load();
    } catch (error) {
      setSaveError(writeFailed(error));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (!code) return;
    setUploadError(null);
    if (!isDocumentName(file.name)) {
      setUploadError("Tên tệp chỉ gồm chữ không dấu, số, gạch ngang, gạch dưới và dấu chấm.");
      return;
    }
    try {
      await saveDocument(file.name, await file.text(), code);
      notify(`Đã tải lên ${file.name}`);
      void load();
    } catch (error) {
      setUploadError(writeFailed(error));
    }
  };

  const draft = open?.text !== null && open ? (drafts[open.name] ?? open.text) : "";
  const changed = open?.text !== null && open !== null && draft !== open.text;

  return (
    <AppShell alignContainer="documents-page">
      <AppHeader variant="sub" title="Tài liệu" backHref="/settings" layout="wide" alignGroup="documents-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {code ? (
              <>
                <PillButton size="md" onClick={() => fileInput.current?.click()} data-tour="documents-upload">
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
                <span className="text-cap leading-snug text-secondary">Đã mở khóa. Chạm một tài liệu để sửa.</span>
              </>
            ) : (
              <PillButton size="md" variant="secondary" onClick={() => setAsking(true)} data-tour="documents-edit">
                Cập nhật tài liệu
              </PillButton>
            )}
          </div>
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
          <EmptyState title="Chưa có tài liệu">Mở khóa bằng Cập nhật tài liệu rồi tải lên tệp .md hoặc .txt đầu tiên.</EmptyState>
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
                onClick={() => void openDocument(d.name)}
                divider={i > 0}
                minHeight="14"
                data-align-group="documents-row"
              />
            ))}
          </Card>
        )}
      </main>

      <AccessCodeSheet
        open={asking}
        onClose={() => setAsking(false)}
        onUnlocked={(unlocked) => {
          setCode(unlocked);
          setAsking(false);
        }}
      />

      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open?.name} titleId="documents-document-title" desktopDialog>
        {open &&
          (open.error ? (
            <EmptyState
              title="Không mở được tài liệu"
              actions={
                <PillButton size="md" variant="secondary" onClick={() => void openDocument(open.name)}>
                  Thử lại
                </PillButton>
              }
            >
              {open.error}
            </EmptyState>
          ) : open.text === null ? (
            <div aria-busy="true" aria-live="polite" className="flex flex-col gap-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 rounded-md bg-divider animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          ) : code ? (
            <form onSubmit={save} className="flex flex-col gap-3">
              <label htmlFor="documents-editor" className="sr-only">
                Nội dung {open.name}
              </label>
              {changed && <p className="m-0 text-cap leading-snug text-secondary">Bản nháp chưa lưu</p>}
              <textarea
                id="documents-editor"
                value={draft}
                onChange={(e) => setDrafts((current) => ({ ...current, [open.name]: e.target.value }))}
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
          ) : (
            <div className="flex flex-col gap-3">
              <pre className="m-0 whitespace-pre-wrap break-words font-sans text-callout leading-relaxed text-text">{open.text}</pre>
              <p className="m-0 text-cap leading-snug text-secondary">{saveError ?? "Bấm Cập nhật tài liệu ở màn hình trước để sửa."}</p>
            </div>
          ))}
      </Sheet>
    </AppShell>
  );
}

/** The "Mã truy cập" sheet: one field, checked on the server (POST /api/documents/access); a wrong code says so under the field. */
function AccessCodeSheet({ open, onClose, onUnlocked }: { open: boolean; onClose: () => void; onUnlocked: (code: string) => void }) {
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
      await verifyAccessCode(code);
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
    <Sheet open={open} onClose={onClose} title="Mã truy cập" titleId="documents-code-title" desktopDialog initialFocusId="documents-code">
      <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
        <p className="m-0 text-callout leading-snug text-secondary">Nhập mã để sửa hay tải lên tài liệu. Mã được nhớ đến khi đóng tab này.</p>
        <FormRow label="Mã truy cập" htmlFor="documents-code" error={error}>
          <input
            id="documents-code"
            type="password"
            autoComplete="off"
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
    </Sheet>
  );
}

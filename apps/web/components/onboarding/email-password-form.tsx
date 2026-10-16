"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmailField } from "@/components/auth/email-field";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { PasswordField } from "@/components/auth/password-field";
import { PillButton } from "@/components/ui/pill-button";
import {
  requestMagicLink,
  signInWithPassword,
  signUpWithPassword,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
  validateRequiredPassword,
} from "@/lib/auth-actions";
import { isLiveMode } from "@/lib/api-mode";
import { HCaptcha } from "@/components/auth/hcaptcha";
import { readPendingEmail, writePendingEmail } from "@/lib/onboarding";

type Errors = { email?: string; password?: string; confirm?: string };

const COPY = {
  signin: { primary: "Đăng nhập", magic: "Gửi liên kết đăng nhập qua email", next: "/" },
  signup: { primary: "Đăng ký", magic: "Gửi liên kết đăng ký qua email", next: "/setup/profile" },
} as const;

/**
 * The one email and password form on /signin (variant "signin") and /signup ("signup"). One primary
 * button; the quiet text button sends a magic link to the same email and ignores the password fields.
 */
export function EmailPasswordForm({ variant }: { variant: "signin" | "signup" }) {
  const router = useRouter();
  const signup = variant === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {
      email: validateEmail(email) ?? undefined,
      password: signup ? (validateNewPassword(password) ?? undefined) : (validateRequiredPassword(password) ?? undefined),
      confirm: signup ? (validatePasswordConfirm(password, confirm) ?? undefined) : undefined,
    };
    setErrors(next);
    if (next.email || next.password || next.confirm) return;

    setBusy(true);
    const result = signup
      ? await signUpWithPassword(email, password, captchaToken)
      : await signInWithPassword(email, password, captchaToken);
    if (result.ok) {
      router.push(COPY[variant].next);
      return;
    }
    // Sign-up's only server error is an email already in use; sign-in's is the one generic message.
    setErrors(signup ? { email: result.error } : { password: result.error });
    setCaptchaToken(undefined);
    if (typeof window !== "undefined" && window.hcaptcha) {
      try {
        window.hcaptcha.reset();
      } catch {
        // ignore
      }
    }
    setBusy(false);
  }

  async function handleMagicLink() {
    const emailError = validateEmail(email);
    setErrors({ email: emailError ?? undefined });
    if (emailError) return;

    setBusy(true);
    try {
      const result = await requestMagicLink(email.trim(), captchaToken);
      if (!result.ok) {
        setErrors({ email: result.error });
        setCaptchaToken(undefined);
        if (typeof window !== "undefined" && window.hcaptcha) {
          try {
            window.hcaptcha.reset();
          } catch {
            // ignore
          }
        }
        setBusy(false);
        return;
      }
      writePendingEmail(email.trim());
      router.push("/signin/check-email");
    } catch {
      setErrors({ email: "Chưa gửi được liên kết. Thử lại sau ít phút." });
      setCaptchaToken(undefined);
      if (typeof window !== "undefined" && window.hcaptcha) {
        try {
          window.hcaptcha.reset();
        } catch {
          // ignore
        }
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <EmailField value={email} onChange={setEmail} error={errors.email} />
      {signup ? (
        <NewPasswordFields
          newLabel="Mật khẩu"
          password={password}
          confirm={confirm}
          errors={errors}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
      ) : (
        <>
          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
          <Link href="/signin/forgot" className="inline-flex min-h-[44px] items-center self-end px-2 text-[15px] font-semibold text-blue">
            Quên mật khẩu?
          </Link>
        </>
      )}
      {isLiveMode() && (
        <HCaptcha
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(undefined)}
        />
      )}
      <PillButton type="submit" disabled={busy}>
        {COPY[variant].primary}
      </PillButton>
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={busy}
        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-0 bg-transparent px-2 text-[15px] font-semibold text-blue transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {COPY[variant].magic}
      </button>
    </form>
  );
}

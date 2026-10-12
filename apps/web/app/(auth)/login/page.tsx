"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/diary`,
        },
      });

      if (error) {
        setIsError(true);
        setMessage(error.message);
      } else {
        setMessage("Đã gửi liên kết đăng nhập đến email của bạn.");
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || "Đã xảy ra lỗi không mong muốn.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/diary`,
        },
      });
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || "Không thể khởi tạo đăng nhập Google.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col justify-between px-6 py-12 md:justify-center md:items-center">
      <div className="w-full max-w-sm mx-auto">
        {/* Brandmark */}
        <div className="text-center mb-8">
          <span className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase font-mono">
            H1T <span className="text-[#2563EB]">MICRO</span>
          </span>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight">
            CHÀO MỪNG TRỞ LẠI.
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 font-medium">
            Đăng nhập để xem tiếp nhật ký và vi chất của bạn.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-bold mb-5 ${
              isError
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full py-4 px-4 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-neutral-800" />
          <span className="px-3 text-xs text-neutral-500 font-medium">hoặc</span>
          <div className="flex-1 border-t border-neutral-800" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ban@email.com"
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm transition-all shadow-md active:scale-98"
          >
            {loading ? "Đang gửi..." : "Gửi link đăng nhập"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-neutral-400">
          Chưa có tài khoản?{" "}
          <Link href="/diary" className="text-white font-bold underline ml-1">
            Đăng ký hoặc dùng thử
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-600 font-mono mt-8">
        H1T MICRO · Dinh dưỡng & Vi chất
      </div>
    </div>
  );
}

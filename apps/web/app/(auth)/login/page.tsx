"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsError(true);
        setMessage(error.message);
      } else {
        setMessage("Signed in successfully! Redirecting...");
        window.location.href = "/diary";
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-3 py-6">
      <div className="w-full max-w-md p-5 sm:p-8 rounded-lg bg-[#141C2B] border-2 sm:border-[3px] border-black shadow-[6px_6px_0px_0px_#000]">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex w-12 h-12 rounded-[6px] bg-[#10B981] border-2 border-black shadow-[3px_3px_0px_0px_#000] items-center justify-center font-black text-2xl text-black mb-3.5">
            F
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase text-[#F8FAFC] tracking-tight">
            Sign In to Fortify
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-1">
            Access your personalized meal logs & nutrient targets
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-[4px] border-2 border-black text-xs font-black uppercase tracking-wider mb-5 shadow-[2px_2px_0px_0px_#000] ${
              isError
                ? "bg-rose-500/20 text-rose-300"
                : "bg-emerald-500/20 text-[#10B981]"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black text-[#F8FAFC] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="neo-input w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-[#F8FAFC] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="neo-input w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono min-h-[42px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-emerald w-full py-3 px-4 text-xs sm:text-sm font-black text-black border-2 border-black min-h-[46px] mt-2"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#94A3B8] font-mono">
          Supabase Auth Session Connection.{" "}
          <Link href="/diary" className="text-[#10B981] font-bold underline hover:text-[#34D399] ml-1">
            Continue to Diary demo
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";

interface HCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function HCaptcha({ onVerify, onExpire, className = "" }: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

  useEffect(() => {
    if (!siteKey) return;
    let mounted = true;

    function renderWidget() {
      if (!mounted || !containerRef.current || !window.hcaptcha || widgetIdRef.current) return;
      try {
        const id = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (mounted) onVerify(token);
          },
          "expired-callback": () => {
            if (mounted && onExpire) onExpire();
          },
        });
        widgetIdRef.current = id;
      } catch {
        // Ignore if already rendered
      }
    }

    if (typeof window !== "undefined") {
      if (window.hcaptcha) {
        renderWidget();
      } else {
        const existingScript = document.getElementById("hcaptcha-api-script");
        if (!existingScript) {
          const script = document.createElement("script");
          script.id = "hcaptcha-api-script";
          script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (mounted) renderWidget();
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener("load", () => {
            if (mounted) renderWidget();
          });
        }
      }
    }

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup error
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={`flex justify-center my-2 ${className}`}>
      <div ref={containerRef} className="h-captcha min-h-[78px]" data-sitekey={siteKey} />
    </div>
  );
}

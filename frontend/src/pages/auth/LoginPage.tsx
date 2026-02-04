"use client";

import Link from "next/link";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { useI18n } from "@/src/lib/i18n";
import { useLocalePath } from "@/src/lib/use-locale-path";

export default function LoginPage() {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#27272a] bg-[#111113] p-8 text-white">
        <h1 className="text-2xl font-semibold">{messages.auth.loginTitle}</h1>
        <p className="mt-2 text-sm text-[#a1a1aa]">
          {messages.auth.loginSubtitle}
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-xs text-[#a1a1aa]">
          {messages.auth.loginNoAccount}{" "}
          <Link href={localePath("/register")} className="text-white">
            {messages.auth.loginLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

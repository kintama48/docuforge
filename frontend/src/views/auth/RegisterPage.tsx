"use client";

import Link from "next/link";
import { RegisterForm } from "@/src/components/auth/RegisterForm";
import { useI18n } from "@/src/lib/i18n";
import { useLocalePath } from "@/src/lib/use-locale-path";

export default function RegisterPage() {
  const { messages } = useI18n();
  const localePath = useLocalePath();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#27272a] bg-[#111113] p-8 text-white">
        <h1 className="text-2xl font-semibold">
          {messages.auth.registerTitle}
        </h1>
        <p className="mt-2 text-sm text-[#a1a1aa]">
          {messages.auth.registerSubtitle}
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-4 text-xs text-[#a1a1aa]">
          {messages.auth.registerHaveAccount}{" "}
          <Link href={localePath("/login")} className="text-white">
            {messages.auth.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

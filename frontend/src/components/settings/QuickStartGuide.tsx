"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/src/lib/i18n";

const tabs = ["curl", "Node.js", "Python", "Go"] as const;

export function QuickStartGuide() {
  const { messages } = useI18n();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("curl");

  const code = useMemo(() => {
    const key = "${DOCUFORGE_API_KEY:-docu_live_your_key}";
    switch (activeTab) {
      case "Node.js":
        return `import fetch from "node-fetch";

const response = await fetch("${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/v1/render", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${key}",
  },
  body: JSON.stringify({ template_id: "tpl_123", data: {} }),
});

const buffer = await response.arrayBuffer();
await fs.promises.writeFile("output.pdf", Buffer.from(buffer));`;
      case "Python":
        return `import requests

response = requests.post(
  "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/v1/render",
  headers={"X-API-Key": "${key}"},
  json={"template_id": "tpl_123", "data": {}},
)

with open("output.pdf", "wb") as f:
  f.write(response.content)`;
      case "Go":
        return `package main

import (
  "bytes"
  "net/http"
)

func main() {
  payload := []byte(` + "`" + `{"template_id":"tpl_123","data":{}}` + "`" + `)
  req, _ := http.NewRequest("POST", "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/v1/render", bytes.NewBuffer(payload))
  req.Header.Set("Content-Type", "application/json")
  req.Header.Set("X-API-Key", "${key}")

  client := &http.Client{}
  _, _ = client.Do(req)
}`;
      default:
        return `curl -X POST "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/v1/render" \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{ "template_id": "tpl_123", "data": {} }' \\
  --output output.pdf`;
    }
  }, [activeTab]);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {messages.settings.quickStartGuideTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-dim)]">
            {messages.settings.quickStartGuideSubtitle}
          </p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            toast.success(messages.settings.quickStartCopied);
          }}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)] hover:border-[var(--line-hover)]"
        >
          {messages.settings.quickStartCopy}
        </button>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Use your full secret API key in <code>DOCUFORGE_API_KEY</code>. The
        prefix shown in the table is only an identifier.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
              activeTab === tab
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-hover)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
        <code>{code}</code>
      </pre>
    </section>
  );
}

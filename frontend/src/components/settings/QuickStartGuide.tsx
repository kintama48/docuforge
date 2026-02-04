"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/src/lib/i18n";

const tabs = ["curl", "Node.js", "Python", "Go"] as const;

type QuickStartGuideProps = {
  apiKey: string;
};

export function QuickStartGuide({ apiKey }: QuickStartGuideProps) {
  const { messages } = useI18n();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("curl");

  const code = useMemo(() => {
    const key = apiKey || "docu_live_...";
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
  }, [activeTab, apiKey]);

  return (
    <section className="rounded-2xl border border-[#27272a] bg-[#111113] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {messages.settings.quickStartGuideTitle}
          </h2>
          <p className="mt-1 text-xs text-[#71717a]">
            {messages.settings.quickStartGuideSubtitle}
          </p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            toast.success(messages.settings.quickStartCopied);
          }}
          className="rounded-md border border-[#27272a] px-3 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          {messages.settings.quickStartCopy}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
              activeTab === tab
                ? "bg-[#3b82f6] text-white"
                : "border border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl border border-[#27272a] bg-[#0f1117] p-4 text-xs text-[#a1a1aa]">
        <code>{code}</code>
      </pre>
    </section>
  );
}

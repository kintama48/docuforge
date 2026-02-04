"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAssets, useDeleteAsset, useUploadAsset } from "@/src/hooks/use-assets";
import { formatBytes } from "@/src/lib/utils";
import { useEditorStore } from "@/src/stores/editor";
import { toast } from "sonner";
import { useI18n } from "@/src/lib/i18n";

function assetSnippet(name: string, mime: string) {
  const lower = name.toLowerCase();
  if (mime.startsWith("image/")) {
    return `#image("${name}")`;
  }
  if (mime.includes("font") || lower.endsWith(".ttf") || lower.endsWith(".otf") || lower.endsWith(".woff2")) {
    const fontName = name.replace(/\.[^/.]+$/, "");
    return `#set text(font: "${fontName}")`;
  }
  return `#image("${name}")`;
}

function assetIcon(mime: string, name: string) {
  const lower = name.toLowerCase();
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.includes("font") || lower.endsWith(".ttf") || lower.endsWith(".otf") || lower.endsWith(".woff2")) {
    return "🔤";
  }
  return "📄";
}

export function AssetPanel() {
  const { messages } = useI18n();
  const { data } = useAssets();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const insertSnippet = useEditorStore((state) => state.insertSnippet);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) =>
        uploadAsset.mutate(file, {
          onSuccess: () =>
            toast.success(
              messages.editor.assetUploaded.replace("{name}", file.name)
            ),
          onError: () =>
            toast.error(
              messages.editor.assetUploadFailed.replace("{name}", file.name)
            ),
        })
      );
    },
    [uploadAsset, messages.editor.assetUploaded, messages.editor.assetUploadFailed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">
        {messages.editor.assetsTitle}
      </p>
      <div
        {...getRootProps()}
        className={`mt-3 rounded-lg border border-dashed px-3 py-4 text-center text-xs ${
          isDragActive
            ? "border-[#3b82f6] text-white"
            : "border-[#27272a] text-[#71717a]"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive
          ? messages.editor.assetsDrop
          : messages.editor.assetsDrag}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {data?.assets?.length ? (
          data.assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between rounded-md border border-[#27272a] px-3 py-2 text-xs text-[#a1a1aa]"
            >
              <button
                onClick={() => insertSnippet(assetSnippet(asset.name, asset.mime_type))}
                className="flex items-center gap-2 text-left hover:text-white"
              >
                <span>{assetIcon(asset.mime_type, asset.name)}</span>
                <span>{asset.name}</span>
                <span className="text-[10px] text-[#71717a]">
                  {formatBytes(asset.size_bytes)}
                </span>
              </button>
              <button
                  onClick={() => {
                    if (
                      confirm(
                        messages.editor.assetDeleteConfirm.replace(
                          "{name}",
                          asset.name
                        )
                      )
                    ) {
                      deleteAsset.mutate(asset.id);
                    }
                  }}
                className="text-[10px] text-[#ef4444]"
              >
                {messages.editor.delete}
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-[#71717a]">
            {messages.editor.noAssets}
          </p>
        )}
      </div>
    </div>
  );
}

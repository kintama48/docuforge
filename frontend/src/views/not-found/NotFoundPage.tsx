import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-6 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[#a1a1aa]">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md border border-[#27272a] px-4 py-2 text-xs text-white hover:border-[#3f3f46]"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

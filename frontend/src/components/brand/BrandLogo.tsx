import Image from "next/image";
import { cn } from "@/src/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  className,
  priority = false,
  alt = "DocuForge logo",
}: BrandLogoProps) {
  return (
    <span className={cn("relative block h-9 w-9 shrink-0", className)}>
      <Image
        src="/brand/logo-square-512.png"
        alt={alt}
        fill
        priority={priority}
        suppressHydrationWarning
        sizes="(max-width: 768px) 28px, 40px"
        className="object-contain"
      />
    </span>
  );
}

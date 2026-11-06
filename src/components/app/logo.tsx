import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo ufficiale 89 Gradi (asset fornito, non reinterpretato). Proporzioni 2725×3438. */
export function Logo({ height = 56, className, priority }: { height?: number; className?: string; priority?: boolean }) {
  const width = Math.round((height * 2725) / 3438);
  return (
    <Link href="/" aria-label="89 Gradi, vai alla Home" className={cn("inline-block rounded-md", className)}>
      <Image src="/brand/logo-89gradi.png" alt="89 Gradi" width={width} height={height} priority={priority} />
    </Link>
  );
}

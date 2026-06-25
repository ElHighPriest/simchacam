import Image from "next/image";
import Link from "next/link";

export default function GuideHeader() {
  return (
    <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/en"
          aria-label="SimchaCam home"
          className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
        >
          <Image
            src="/simchacam-logo.svg"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </Link>

        <Link
          href="/en/blog"
          className="text-sm font-semibold text-navy/65 transition hover:text-navy"
        >
          Guides
        </Link>
      </nav>
    </header>
  );
}

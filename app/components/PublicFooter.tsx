import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-navy/10 bg-warm-white text-navy">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-navy sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© {new Date().getFullYear()} SimchaCam</p>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <Link href="/privacy" className="transition hover:text-navy">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-navy">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

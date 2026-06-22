"use client";

import { useState } from "react";

type EventPasswordInputProps = {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 5.4A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a14.7 14.7 0 0 1-2.7 3.5" />
      <path d="M6.1 6.6A15.4 15.4 0 0 0 2.5 12S6 19 12 19a9.7 9.7 0 0 0 4.1-.9" />
    </svg>
  );
}

export default function EventPasswordInput({
  id,
  name,
  onChange,
  placeholder,
  value,
}: EventPasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage("Copied");
      window.setTimeout(() => setCopyMessage(""), 1800);
    } catch {
      setCopyMessage("Could not copy");
      window.setTimeout(() => setCopyMessage(""), 1800);
    }
  }

  return (
    <div className="mt-2">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete="new-password"
          data-1p-ignore="true"
          data-lpignore="true"
          className="w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 pr-12 placeholder:text-muted-navy/60"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={isVisible ? "Hide event password" : "Show event password"}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-navy transition hover:bg-navy/5 hover:text-navy"
        >
          <EyeIcon hidden={!isVisible} />
        </button>
      </div>

      {value && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={copyPassword}
            className="rounded-lg border border-gold/35 bg-pale-gold/60 px-3 py-2 text-sm font-semibold text-navy transition hover:bg-pale-gold"
          >
            Copy password
          </button>
          {copyMessage && (
            <span className="text-sm font-medium text-muted-navy">
              {copyMessage}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

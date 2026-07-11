"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlassButtonVariant = "default" | "dropdown" | "compact";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  href?: string;
  variant?: GlassButtonVariant;
}

const baseClasses =
  "group relative inline-flex items-center justify-center overflow-hidden rounded-full transition-all duration-300 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<GlassButtonVariant, string> = {
  default:
    "border border-white/35 bg-white/12 text-white backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-4px_10px_rgba(18,12,76,0.58),0_10px_22px_rgba(11,7,52,0.34)] hover:-translate-y-px hover:border-white/50 hover:bg-white/16 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-6px_12px_rgba(18,12,76,0.66),0_14px_26px_rgba(11,7,52,0.38)]",
  dropdown:
    "border border-white/35 bg-white/12 text-white backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-4px_10px_rgba(18,12,76,0.58),0_10px_22px_rgba(11,7,52,0.34)] hover:-translate-y-px hover:border-white/50 hover:bg-white/16 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-6px_12px_rgba(18,12,76,0.66),0_14px_26px_rgba(11,7,52,0.38)]",
  compact:
    "border border-white/70 bg-white !text-[#2B1F97] font-bold shadow-[0_10px_24px_rgba(255,255,255,0.18)] hover:-translate-y-px hover:bg-white/95 hover:text-[#24188f] hover:shadow-[0_14px_28px_rgba(255,255,255,0.2)]",
};

const overlayClasses: Record<GlassButtonVariant, { ring: string; glow: string; base: string }> = {
  default: {
    ring: "pointer-events-none absolute inset-[1px] rounded-full border border-white/12",
    glow: "pointer-events-none absolute inset-x-3 top-[2px] h-[42%] rounded-full bg-white/20 blur-[4px] transition-opacity duration-300 group-hover:opacity-90",
    base: "pointer-events-none absolute inset-x-5 bottom-0 h-[48%] rounded-full bg-[#2b1f97]/35 blur-md",
  },
  dropdown: {
    ring: "pointer-events-none absolute inset-[1px] rounded-full border border-white/12",
    glow: "pointer-events-none absolute inset-x-3 top-[2px] h-[42%] rounded-full bg-white/20 blur-[4px] transition-opacity duration-300 group-hover:opacity-90",
    base: "pointer-events-none absolute inset-x-5 bottom-0 h-[48%] rounded-full bg-[#2b1f97]/35 blur-md",
  },
  compact: {
    ring: "pointer-events-none absolute inset-[1px] rounded-full border border-white/75",
    glow: "pointer-events-none absolute inset-x-3 top-[2px] h-[42%] rounded-full bg-white/80 blur-[4px] transition-opacity duration-300 group-hover:opacity-100",
    base: "pointer-events-none absolute inset-x-5 bottom-0 h-[42%] rounded-full bg-[#d7d2ff]/50 blur-md",
  },
};

export default function GlassButton({
  children,
  className = "",
  href,
  variant = "default",
  type = "button",
  ...props
}: GlassButtonProps) {
  const overlays = overlayClasses[variant];
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
  const content = (
    <>
      <span className={overlays.ring} />
      <span className={overlays.glow} />
      <span className={overlays.base} />
      <span className="relative z-10 inline-flex items-center justify-center gap-2 text-inherit font-inherit [font-family:var(--font-satoshi)]">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}

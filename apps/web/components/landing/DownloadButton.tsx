/**
 * components/landing/DownloadButton.tsx
 * ─────────────────────────────────────────────────────────────────
 * Download CTA button — no-op with data-coming-soon attribute.
 * Tokens: red, surface from constants/tokens.ts.
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

interface DownloadButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
  label?: string;
}

export function DownloadButton({
  size = 'md',
  variant = 'primary',
  label = 'Download App',
}: DownloadButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]',
  };

  const variantClasses = {
    primary: 'bg-red text-white hover:opacity-90 border-transparent',
    outline: 'bg-transparent text-navy border-border hover:bg-bg',
  };

  return (
    <button
      type="button"
      data-coming-soon="true"
      aria-label="Download Sortt app — coming soon"
      onClick={() => {
        /* no-op — app not yet published */
      }}
      className={`
        inline-flex items-center justify-center gap-2 font-bold rounded-btn border
        transition-all duration-200 cursor-not-allowed opacity-90
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
    >
      <span>📱</span>
      <span>{label}</span>
      <span className="text-[10px] font-semibold opacity-60 border border-current rounded px-1 py-0.5 ml-1 hidden sm:inline">
        Coming Soon
      </span>
    </button>
  );
}

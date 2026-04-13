/**
 * app/admin/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Minimal root layout for the entire /admin/* segment.
 * No sidebar. No auth guards. Those live in (portal)/layout.tsx.
 * This wrapper ensures DM Sans font is applied across all admin pages.
 * ─────────────────────────────────────────────────────────────────
 */

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  );
}

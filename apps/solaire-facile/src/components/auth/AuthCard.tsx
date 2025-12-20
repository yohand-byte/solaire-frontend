import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AuthCard({ title, subtitle, children }: Props) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        background: "var(--panel)",
        boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
      }}
    >
      {title || subtitle ? (
        <div style={{ marginBottom: 12 }}>
          {title ? <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div> : null}
          {subtitle ? <div style={{ opacity: 0.8, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

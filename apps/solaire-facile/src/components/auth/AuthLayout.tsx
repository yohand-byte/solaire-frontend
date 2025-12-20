import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="page" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
        </div>
      </div>
      <div className="page-body">{children}</div>
    </div>
  );
}

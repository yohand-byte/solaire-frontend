import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export default function DashboardLayout({ title, subtitle, right, children }: Props) {
  return (
    <div className="page">
      {(title || subtitle || right) && (
        <div className="page-header">
          <div>
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <div className="page-subtitle">{subtitle}</div>}
          </div>
          {right && <div className="page-header-right">{right}</div>}
        </div>
      )}
      <div className="page-body">{children}</div>
    </div>
  );
}

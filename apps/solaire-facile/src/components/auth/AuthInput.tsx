import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
};

export default function AuthInput({ label, hint, error, className, ...props }: Props) {
  return (
    <label className={"field " + (className ?? "")}>
      {label ? <div className="label">{label}</div> : null}
      <input className={"input " + (error ? "input-error" : "")} {...props} />
      {error ? <div className="help error">{error}</div> : hint ? <div className="help">{hint}</div> : null}
    </label>
  );
}

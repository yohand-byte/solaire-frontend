import { useEffect, useState } from "react";

export default function LiveBadge() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <span className={`pill ${online ? "pill-live" : "pill-off"}`}>
      <span className={`dot ${online ? "dot-live" : "dot-off"}`} aria-hidden="true" />
      {online ? "Temps réel" : "Hors-ligne"}
    </span>
  );
}

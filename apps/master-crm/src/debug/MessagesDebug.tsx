import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_WS_URL } from "../api/client";

export function MessagesDebug() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const socket = io(API_WS_URL, { autoConnect: true });

    socket.on("connect", () => setLogs((l) => [...l, "connected"]));
    socket.on("disconnect", () => setLogs((l) => [...l, "disconnected"]));

    return () => socket.disconnect();
  }, []);

  return (
    <pre style={{ background: "#000", color: "#0f0", padding: 10 }}>
      {logs.join("\n")}
    </pre>
  );
}

export default MessagesDebug;

import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes";
import { AuthProvider } from "./auth/AuthProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);

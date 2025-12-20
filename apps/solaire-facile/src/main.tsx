import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes";
import "./styles.css";
import { ThemeProvider } from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </React.StrictMode>
);

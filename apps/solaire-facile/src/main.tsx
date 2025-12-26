import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import AppRouter from "./routes";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

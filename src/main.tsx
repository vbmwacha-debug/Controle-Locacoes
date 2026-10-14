import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const iniciar = () =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

// Modo demonstração (só em desenvolvimento): veja o README.
if (import.meta.env.DEV && sessionStorage.getItem("loc_mock")) {
  import("./mock-dev").then((m) => m.instalarMock()).then(iniciar);
} else {
  iniciar();
}

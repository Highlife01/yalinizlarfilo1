import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./i18n";
import "./integrations/firebase/client"; // Initialize Firebase

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}

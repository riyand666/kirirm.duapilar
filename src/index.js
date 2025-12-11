import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Mengimpor file aplikasi utama
// Di Canvas ini nama filenya adalah "pencatat_rit"
import App from "./App.js";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

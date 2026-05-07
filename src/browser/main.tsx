import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserWikiApp } from "@/components/BrowserWikiApp";
import "./globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element.");
}

createRoot(root).render(
  <React.StrictMode>
    <BrowserWikiApp />
  </React.StrictMode>
);

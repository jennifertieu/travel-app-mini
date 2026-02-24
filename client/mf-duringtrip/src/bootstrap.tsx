import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const container = document.getElementById("root");

if (container) {
  const root = ReactDOM.createRoot(container);
  // Temporarily disable StrictMode to debug reload issue
  root.render(<App />);
}

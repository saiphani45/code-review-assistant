import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StrictMode } from "react";
import App from "./App";
import { Toaster } from "@/components/ui/toaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster />
  </StrictMode>
);

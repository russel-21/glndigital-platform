import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installAntiScrapingGuard } from "./lib/antiScraping";

installAntiScrapingGuard();

createRoot(document.getElementById("root")!).render(<App />);

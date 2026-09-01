const BOT_UA_PATTERN =
  /(bot|crawler|spider|scrapy|curl|wget|python|httpclient|axios|postman|insomnia|headless|puppeteer|playwright|selenium|phantomjs|censys|ahrefs|semrush|mj12|dotbot|bytespider|gptbot|chatgpt-user|ccbot|claudebot|anthropic-ai|perplexitybot|google-extended|applebot-extended|amazonbot|facebookbot)/i;

const SENSITIVE_PATH_PATTERN =
  /^\/(admin|audit\/rapport|eleve-dashboard|partenaires-dashboard|client-dashboard|auth-callback)(\/|$)/i;

const BLOCK_STORAGE_KEY = "gln_scrape_guard_blocked";
const VISIT_STORAGE_KEY = "gln_scrape_guard_visits";

const isLikelyAutomatedBrowser = () => {
  const nav = window.navigator as Navigator & {
    webdriver?: boolean;
    userAgentData?: { brands?: Array<{ brand: string }> };
  };

  if (nav.webdriver) return true;
  if (!nav.languages || nav.languages.length === 0) return true;
  if (BOT_UA_PATTERN.test(nav.userAgent || "")) return true;

  const brands = nav.userAgentData?.brands?.map((brand) => brand.brand).join(" ") || "";
  if (BOT_UA_PATTERN.test(brands)) return true;

  return false;
};

const hasSuspiciousBurstNavigation = () => {
  const now = Date.now();
  const raw = sessionStorage.getItem(VISIT_STORAGE_KEY);
  const visits = raw ? JSON.parse(raw) as number[] : [];
  const recentVisits = visits.filter((time) => now - time < 10000);
  recentVisits.push(now);
  sessionStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(recentVisits));

  return recentVisits.length >= 12;
};

const renderBlockedScreen = () => {
  document.documentElement.innerHTML = `
    <head>
      <title>Access blocked</title>
      <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #070a10;
          color: #f8fafc;
          font-family: Arial, sans-serif;
        }
        main {
          max-width: 440px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          background: rgba(255,255,255,.04);
        }
        h1 { margin: 0 0 10px; font-size: 20px; }
        p { margin: 0; color: #a1a1aa; line-height: 1.5; font-size: 14px; }
      </style>
    </head>
    <body>
      <main>
        <h1>Acces bloque</h1>
        <p>Une activite automatisee ou non autorisee a ete detectee. Rechargez la page depuis un navigateur normal si vous pensez qu'il s'agit d'une erreur.</p>
      </main>
    </body>
  `;
};

export const installAntiScrapingGuard = () => {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  const alreadyBlocked = localStorage.getItem(BLOCK_STORAGE_KEY) === "true";
  const isSensitivePath = SENSITIVE_PATH_PATTERN.test(path);
  const blocked = alreadyBlocked || isLikelyAutomatedBrowser() || hasSuspiciousBurstNavigation();

  if (blocked) {
    localStorage.setItem(BLOCK_STORAGE_KEY, "true");
    renderBlockedScreen();
    throw new Error("GLN scrape guard blocked automated access.");
  }

  if (isSensitivePath) {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow,noarchive,nosnippet,noimageindex";
    document.head.appendChild(meta);
  }

  document.addEventListener("copy", (event) => {
    if (SENSITIVE_PATH_PATTERN.test(window.location.pathname)) {
      event.preventDefault();
    }
  });

  document.addEventListener("contextmenu", (event) => {
    if (SENSITIVE_PATH_PATTERN.test(window.location.pathname)) {
      event.preventDefault();
    }
  });
};

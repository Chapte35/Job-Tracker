import path from "path";
import os from "os";
import fs from "fs";

/**
 * Résout le chemin vers l'exécutable Chrome installé par Puppeteer.
 * Sur Windows, `puppeteer.executablePath()` peut retourner un chemin incorrect
 * depuis Next.js — on cherche dans le cache utilisateur en fallback.
 */
function findChromePath(): string {
  const home = os.homedir();

  // Patterns génériques — couvre toutes les versions installées
  const baseDir = path.join(home, ".cache", "puppeteer", "chrome");

  // Chercher récursivement dans le dossier cache
  if (fs.existsSync(baseDir)) {
    const exeNames =
      process.platform === "win32"
        ? ["chrome.exe"]
        : ["chrome", "Google Chrome for Testing"];

    const walk = (dir: string, depth: number): string | null => {
      if (depth > 6) return null;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return null;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = walk(full, depth + 1);
          if (found) return found;
        } else if (exeNames.includes(entry.name)) {
          return full;
        }
      }
      return null;
    };

    const found = walk(baseDir, 0);
    if (found) return found;
  }

  throw new Error(
    `Chrome introuvable dans ${baseDir}.\nLance : npx puppeteer browsers install chrome`
  );
}

// Résolution faite une seule fois et mise en cache
let resolvedChromePath: string | null = null;

export function getChromePath(): string {
  if (!resolvedChromePath) {
    resolvedChromePath = findChromePath();
  }
  return resolvedChromePath;
}

export function getPuppeteerLaunchOptions() {
  return {
    headless: true as const,
    executablePath: getChromePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  };
}

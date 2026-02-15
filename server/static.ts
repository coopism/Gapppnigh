import express, { type Express, type Request, Response } from "express";
import compression from "compression";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Enable compression for all text assets
  app.use(compression({
    filter: (req: Request, res: Response) => {
      // Compress all text-based responses
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balanced compression level
  }));

  // API route for sitemap.xml (dynamic generation)
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour cache
    
    const sitemap = generateSitemap();
    res.send(sitemap);
  });

  // API route for robots.txt (dynamic generation)
  app.get("/robots.txt", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day cache
    
    const robotsTxt = generateRobotsTxt();
    res.send(robotsTxt);
  });

  // Serve static files with proper cache headers
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y", // 1 year for hashed assets
    immutable: true,
    setHeaders: (res, path) => {
      // Set proper cache headers for hashed assets
      if (path.includes("-") && (path.endsWith(".js") || path.endsWith(".css"))) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  // Favicon and other static images with shorter cache
  app.use(["/favicon.ico", "/og-image.png"], express.static(distPath, {
    maxAge: "1d", // 1 day for these files
    setHeaders: (res, path) => {
      res.setHeader("Cache-Control", "public, max-age=86400");
    },
  }));

  // Serve other static files with no-cache (HTML, etc.)
  app.use(express.static(distPath, {
    maxAge: 0,
    setHeaders: (res, path) => {
      // Don't cache HTML files
      if (path.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

function generateRobotsTxt(): string {
  const baseUrl = process.env.VITE_APP_URL || "https://www.gapnight.com";
  
  return `User-agent: *
Allow: /
Disallow: /owner/
Disallow: /host/
Disallow: /admin/
Disallow: /api/
Disallow: /uploads/

# Crawl delay to be nice to servers
Crawl-delay: 1

Sitemap: ${baseUrl}/sitemap.xml
`;
}

function generateSitemap(): string {
  const baseUrl = process.env.VITE_APP_URL || "https://www.gapnight.com";
  const today = new Date().toISOString().split("T")[0];
  
  const staticRoutes = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/deals", priority: "0.9", changefreq: "daily" },
    { url: "/stays", priority: "0.9", changefreq: "daily" },
    { url: "/about", priority: "0.5", changefreq: "monthly" },
    { url: "/faq", priority: "0.5", changefreq: "monthly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
    { url: "/how-it-works", priority: "0.6", changefreq: "monthly" },
    { url: "/login", priority: "0.4", changefreq: "yearly" },
    { url: "/signup", priority: "0.4", changefreq: "yearly" },
  ];

  const urls = staticRoutes.map(route => `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

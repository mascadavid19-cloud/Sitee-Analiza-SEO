// server.js
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

app.get("/seo", async (req, res) => {
  const siteUrl = req.query.url;
  if (!siteUrl) return res.json({ error: "Nu ai introdus un URL." });

  try {
    // Folosim proxy gratuit AllOrigins
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(siteUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) return res.json({ error: "Site-ul nu răspunde." });

    const data = await response.json();
    const html = data.contents; // HTML-ul real al site-ului

    const $ = cheerio.load(html);

    const title = $("title").text() || "N/A";
    const metaDescription = $('meta[name="description"]').attr("content") || "N/A";
    const h1 = $("h1").first().text() || "N/A";
    const h2 = $("h2").map((i, el) => $(el).text()).get().join(", ") || "N/A";
    const canonical = $('link[rel="canonical"]').attr("href") || "N/A";
    const robots = $('meta[name="robots"]').attr("content") || "N/A";

    const textContent = $("body").text();
    const contentLength = textContent.length || 0;
    const wordCount = textContent.split(/\s+/).filter(Boolean).length || 0;
    const pageSizeKB = Buffer.byteLength(html, "utf8") / 1024;

    const internalLinks = $("a[href^='/'], a[href^='" + siteUrl + "']").length;
    const externalLinks = $("a[href]").not(`[href^='/'], [href^='${siteUrl}']`).length;

    let score = 50;
    if (title !== "N/A") score += 10;
    if (metaDescription !== "N/A") score += 10;
    if (h1 !== "N/A") score += 10;
    if (canonical !== "N/A") score += 5;
    if (robots !== "N/A") score += 5;
    if (contentLength > 300) score += 10;
    if (wordCount > 100) score += 10;
    if (internalLinks + externalLinks > 5) score += 10;
    score = Math.min(score, 95);

    const improvements = [];
    if (title === "N/A") improvements.push("Adaugă un titlu relevant pentru pagină.");
    if (metaDescription === "N/A") improvements.push("Adaugă meta descriere.");
    if (h1 === "N/A") improvements.push("Include un H1 clar.");
    if (canonical === "N/A") improvements.push("Adaugă link canonical.");
    if (robots === "N/A") improvements.push("Definește meta robots corect.");
    if (contentLength < 300) improvements.push("Mărește conținutul paginii.");
    if (internalLinks + externalLinks < 5) improvements.push("Adaugă link-uri interne și externe relevante.");

    res.json({
      title,
      metaDescription,
      h1,
      h2,
      canonical,
      robots,
      contentLength,
      wordCount,
      pageSizeKB: pageSizeKB.toFixed(2),
      internalLinks,
      externalLinks,
      seoScore: score,
      improvements,
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Nu am putut analiza site-ul. Verifică URL-ul." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server pornit pe port ${PORT}`));

// server.js
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Funcție pentru a verifica dacă URL-ul este valid
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

app.get("/seo", async (req, res) => {
  const siteUrl = req.query.url;

  if (!siteUrl || !isValidUrl(siteUrl)) {
    return res.json({ error: "Nu ai introdus un URL valid." });
  }

  try {
    // Cerere cu User-Agent real
    const response = await fetch(siteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.json({
        error:
          "Site-ul nu răspunde sau are protecții împotriva accesului automat.",
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").text() || "N/A";
    const metaDescription =
      $('meta[name="description"]').attr("content") || "N/A";
    const h1 = $("h1").first().text() || "N/A";
    const h2 = $("h2")
      .map((i, el) => $(el).text())
      .get()
      .join(", ") || "N/A";
    const canonical = $('link[rel="canonical"]').attr("href") || "N/A";
    const robots = $('meta[name="robots"]').attr("content") || "N/A";

    const textContent = $("body").text();
    const contentLength = textContent.length || 0;
    const wordCount = textContent.split(/\s+/).filter(Boolean).length || 0;
    const pageSizeKB = Buffer.byteLength(html, "utf8") / 1024;

    const internalLinks = $("a[href^='/'], a[href^='" + siteUrl + "']").length;
    const externalLinks = $("a[href]").not(`[href^='/'], [href^='${siteUrl}']`)
      .length;

    // Calcul SEO realist
    let score = 50;
    if (title !== "N/A") score += 10;
    if (metaDescription !== "N/A") score += 10;
    if (h1 !== "N/A") score += 10;
    if (canonical !== "N/A") score += 5;
    if (robots !== "N/A") score += 5;
    if (contentLength > 300) score += 10;
    if (wordCount > 100) score += 10;
    if (internalLinks + externalLinks > 5) score += 10;
    score = Math.min(score, 95); // limităm la 95

    const improvements = [];
    if (title === "N/A") improvements.push("Adaugă un titlu relevant pentru pagină.");
    if (metaDescription === "N/A") improvements.push("Adaugă meta descriere.");
    if (h1 === "N/A") improvements.push("Include un H1 clar.");
    if (canonical === "N/A") improvements.push("Adaugă link canonical.");
    if (robots === "N/A") improvements.push("Definește meta robots corect.");
    if (contentLength < 300) improvements.push("Mărește conținutul paginii.");
    if (internalLinks + externalLinks < 5)
      improvements.push("Adaugă link-uri interne și externe relevante.");

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
    res.json({
      error:
        "Nu am putut analiza site-ul. Site-ul poate avea protecții împotriva accesului automat.",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server pornit pe port ${PORT}`));

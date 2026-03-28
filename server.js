// server.js
import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.get("/seo", async (req, res) => {
  const siteUrl = req.query.url;
  if (!siteUrl) return res.json({ error: "Nu ai introdus un URL." });

  try {
    let url = siteUrl;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url; // adaugă https dacă nu există
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // User-agent real
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const title = await page.title() || "N/A";
    const metaDescription = await page.$eval(
      'meta[name="description"]',
      el => el.content
    ).catch(() => "N/A");

    const h1 = await page.$eval("h1", el => el.innerText).catch(() => "N/A");
    const h2 = await page.$$eval("h2", els => els.map(el => el.innerText).join(", ")).catch(() => "N/A");
    const canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => "N/A");
    const robots = await page.$eval('meta[name="robots"]', el => el.content).catch(() => "N/A");

    const textContent = await page.$eval("body", el => el.innerText).catch(() => "");
    const contentLength = textContent.length;
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    const internalLinks = await page.$$eval(
      `a[href^="/"], a[href^="${url}"]`,
      els => els.length
    );
    const externalLinks = await page.$$eval(
      "a[href]",
      els => els.filter(el => !el.href.startsWith("/") && !el.href.startsWith(url)).length
    );

    // Scor SEO realist
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

    await browser.close();

    res.json({
      title,
      metaDescription,
      h1,
      h2,
      canonical,
      robots,
      contentLength,
      wordCount,
      internalLinks,
      externalLinks,
      seoScore: score,
      improvements
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Nu am putut analiza site-ul. Verifică URL-ul sau site-ul poate bloca cererile." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server pornit pe port ${PORT}`));

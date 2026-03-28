import express from "express";
import cors from "cors";
import { load } from "cheerio";
import puppeteer from "puppeteer-core";
import { executablePath } from "puppeteer";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// -------------------- HELPERS --------------------

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": url
    },
  });
  return await res.text();
}

async function fetchHTMLPuppeteer(url) {
  const browser = await puppeteer.launch({
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
  await page.goto(url, { waitUntil: "networkidle2" });
  const html = await page.content();
  await browser.close();
  return html;
}

async function getHTML(url) {
  try {
    const html = await fetchHTML(url);
    if (html.includes("bot") || html.length < 200) {
      return await fetchHTMLPuppeteer(url);
    }
    return html;
  } catch {
    return await fetchHTMLPuppeteer(url);
  }
}

// -------------------- SEO SCOR --------------------

function calculateScore(data) {
  let score = 0;
  if (data.title.exists) score += 15;
  if (data.title.length >= 30 && data.title.length <= 60) score += 10;
  if (data.metaDescription.exists) score += 15;
  if (data.metaDescription.length >= 120 && data.metaDescription.length <= 160) score += 10;
  if (data.h1.count > 0) score += 15;
  if (data.images.missingAlt === 0) score += 10;
  if (data.links.internal > 0) score += 10;
  return Math.min(score, 100);
}

function generateSuggestions(data) {
  const suggestions = [];
  if (!data.title.exists) suggestions.push("Adaugă un titlu (title tag).");
  if (data.title.length < 30 || data.title.length > 60) suggestions.push("Menține titlul între 30-60 caractere.");
  if (!data.metaDescription.exists) suggestions.push("Adaugă meta description (120-160 caractere).");
  if (data.h1.count === 0) suggestions.push("Adaugă cel puțin un H1.");
  if (data.images.missingAlt > 0) suggestions.push(`${data.images.missingAlt} imagini lipsesc de alt.`);
  return suggestions;
}

// -------------------- ENDPOINT --------------------

app.get("/seo", async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: "Lipseste URL-ul" });
  if (!url.startsWith("http")) url = "https://" + url;

  try {
    const html = await getHTML(url);
    const $ = load(html);

    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1");
    const images = $("img");
    let missingAlt = 0;
    images.each((i, el) => { if (!$(el).attr("alt")) missingAlt++; });
    const links = $("a");
    let internal = 0, external = 0;
    links.each((i, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      if (href.startsWith("/") || href.includes(url)) internal++;
      else external++;
    });

    const data = {
      title: { value: title, length: title.length, exists: !!title },
      metaDescription: { value: metaDescription, length: metaDescription.length, exists: !!metaDescription },
      h1: { count: h1.length },
      images: { total: images.length, missingAlt },
      links: { total: links.length, internal, external },
    };

    const score = calculateScore(data);
    const suggestions = generateSuggestions(data);

    res.json({ url, score, data, suggestions });
  } catch (err) {
    res.status(500).json({ error: "Nu s-a putut analiza site-ul" });
  }
});

// -------------------- START SERVER --------------------

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

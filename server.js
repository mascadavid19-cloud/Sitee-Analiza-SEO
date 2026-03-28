import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const app = express();

app.get("/seo", async (req, res) => {
  let url = req.query.url;

  if (!url) return res.json({ error: "Nu ai introdus URL." });

  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const data = await page.evaluate(() => {
      const getMeta = (name) =>
        document.querySelector(`meta[name="${name}"]`)?.content || "N/A";

      const getCanonical =
        document.querySelector('link[rel="canonical"]')?.href || "N/A";

      const text = document.body.innerText || "";

      return {
        title: document.title || "N/A",
        metaDescription: getMeta("description"),
        h1: document.querySelector("h1")?.innerText || "N/A",
        h2: [...document.querySelectorAll("h2")]
          .map((el) => el.innerText)
          .join(", "),
        canonical: getCanonical,
        robots: getMeta("robots"),
        contentLength: text.length,
        wordCount: text.split(/\s+/).length,
        internalLinks: [...document.querySelectorAll("a[href^='/']")].length,
        externalLinks: [...document.querySelectorAll("a[href^='http']")].length,
      };
    });

    let score = 60;

    if (data.title !== "N/A") score += 10;
    if (data.metaDescription !== "N/A") score += 10;
    if (data.h1 !== "N/A") score += 5;
    if (data.canonical !== "N/A") score += 5;
    if (data.wordCount > 300) score += 5;
    if (data.internalLinks > 5) score += 5;

    score = Math.min(score, 95);

    const improvements = [];

    if (data.metaDescription === "N/A")
      improvements.push("Adaugă meta description");
    if (data.h1 === "N/A") improvements.push("Adaugă H1");
    if (data.wordCount < 300)
      improvements.push("Adaugă mai mult conținut SEO");
    if (data.internalLinks < 5)
      improvements.push("Adaugă linkuri interne");

    await browser.close();

    res.json({ ...data, seoScore: score, improvements });
  } catch (err) {
    console.log(err);
    res.json({
      error:
        "Site-ul blochează analiza sau serverul este limitat (Render Free).",
    });
  }
});

app.listen(10000, () => console.log("Server running"));

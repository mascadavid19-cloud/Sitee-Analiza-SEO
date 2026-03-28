import express from "express";
import cors from "cors";
import { load } from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// helper: fetch HTML
async function getHTML(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });
  return await res.text();
}

// SEO scoring
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
  if (!data.title.exists) suggestions.push("Add a title tag.");
  if (data.title.length < 30 || data.title.length > 60) suggestions.push("Keep title 30-60 chars.");
  if (!data.metaDescription.exists) suggestions.push("Add meta description 120-160 chars.");
  if (data.h1.count === 0) suggestions.push("Add at least one H1.");
  if (data.images.missingAlt > 0) suggestions.push(`${data.images.missingAlt} images missing alt.`);
  return suggestions;
}

app.get("/seo", async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  if (!url.startsWith("http")) url = "https://" + url;

  try {
    const html = await getHTML(url);
    const $ = load(html);

    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") || "";

    const h1 = $("h1");
    const images = $("img");
    let missingAlt = 0;
    images.each((i, el) => {
      if (!$(el).attr("alt")) missingAlt++;
    });

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
    res.status(500).json({ error: "Failed to analyze site" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

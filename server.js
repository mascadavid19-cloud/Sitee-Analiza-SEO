import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors()); // permite frontend-ul să facă request-uri

app.get("/seo", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "URL lipsă" });

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content") || "";

    const h1 = $("h1").length;
    const images = $("img");
    const imagesAltMissing = images.filter((i, el) => !$(el).attr("alt")).length;
    const links = $("a");
    const internalLinks = links.filter((i, el) => $(el).attr("href")?.startsWith(url)).length;
    const externalLinks = links.length - internalLinks;

    // calcul simplificat scor SEO
    const score = Math.min(
      100,
      Math.floor(
        (title.length > 0 ? 20 : 0) +
        (metaDescription.length > 0 ? 20 : 0) +
        (h1 > 0 ? 20 : 0) +
        (imagesAltMissing === 0 ? 20 : 10) +
        ((internalLinks + externalLinks > 0) ? 20 : 10)
      )
    );

    res.json({
      score,
      suggestions: [
        ...(title.length === 0 ? ["Adaugă un titlu"] : []),
        ...(metaDescription.length === 0 ? ["Adaugă meta description"] : []),
        ...(h1 === 0 ? ["Adaugă un H1"] : []),
        ...(imagesAltMissing > 0 ? ["Adaugă alt text la imagini"] : [])
      ],
      data: {
        title: { value: title, length: title.length },
        metaDescription: { value: metaDescription, length: metaDescription.length },
        h1: { count: h1 },
        images: { total: images.length, missingAlt: imagesAltMissing },
        links: { internal: internalLinks, external: externalLinks }
      }
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Nu am putut analiza site-ul." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import express from 'express';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const app = express();
app.use(express.json());

// Endpoint SEO
app.get('/seo', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.json({ error: "Introduceți un URL valid." });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    const title = $('title').text() || 'N/A';
    const metaDescription = $('meta[name="description"]').attr('content') || 'N/A';
    const h1 = $('h1').first().text() || 'N/A';
    const h2 = $('h2').map((i,e)=>$(e).text()).get().join(', ') || 'N/A';

    const canonical = $('link[rel="canonical"]').attr('href') || 'N/A';
    const robots = $('meta[name="robots"]').attr('content') || 'N/A';

    const imagesTotal = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    const internalLinks = $('a[href^="/"]').length;
    const externalLinks = $('a[href^="http"]').filter((i,e)=>{
      const link = $(e).attr('href');
      return !link.includes(url);
    }).length;

    const contentLength = bodyText.length;
    const pageSizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);

    res.json({
      title,
      metaDescription,
      h1,
      h2,
      canonical,
      robots,
      imagesTotal,
      imagesWithAlt,
      contentLength,
      pageSizeKB,
      internalLinks,
      externalLinks
    });

  } catch (err) {
    res.json({ error: "Nu am putut analiza site-ul. Verifică URL-ul." });
  }
});

// Endpoint email
app.post('/lead', (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.json({ error: "Email invalid." });
  }

  console.log("Lead nou:", email);

  res.json({ success: true });
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});

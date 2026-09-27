import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";

const app = express();
app.use(cors());
app.use(express.json({ limit: "60mb" }));

const MM_TO_PT = 72 / 25.4;

app.get("/", (req, res) => {
  res.json({ ok: true, service: "handwriter-backend" });
});

// pages: [{ dataUrl: "data:image/png;base64,...", widthMm, heightMm }]
app.post("/api/pdf", (req, res) => {
  const { pages, filename } = req.body || {};

  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: "pages must be a non-empty array" });
  }
  for (const p of pages) {
    if (!p || typeof p.dataUrl !== "string" || !p.dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "each page needs a dataUrl image" });
    }
    if (!(p.widthMm > 0) || !(p.heightMm > 0)) {
      return res.status(400).json({ error: "each page needs widthMm/heightMm" });
    }
  }

  const safeName = (filename || "rukopisny-list").replace(/[^\w\-.]+/g, "_");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);

  const doc = new PDFDocument({ autoFirstPage: false });
  doc.pipe(res);

  for (const page of pages) {
    const widthPt = page.widthMm * MM_TO_PT;
    const heightPt = page.heightMm * MM_TO_PT;
    doc.addPage({ size: [widthPt, heightPt], margin: 0 });

    const base64 = page.dataUrl.slice(page.dataUrl.indexOf(",") + 1);
    const buffer = Buffer.from(base64, "base64");
    doc.image(buffer, 0, 0, { width: widthPt, height: heightPt });
  }

  doc.end();
});

const port = process.env.PORT || 3300;
app.listen(port, () => console.log(`handwriter-backend listening on ${port}`));

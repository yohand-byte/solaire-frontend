import express from "express";
import path from "path";
import { z } from "zod";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const dpGenerator = require(path.join(process.cwd(), "dp-generator.js"));

const app = express();

app.use(express.json({ limit: "20mb" }));

app.use(express.static(path.join(process.cwd(), "public")));
app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const Payload = z.object({
  issuer: z.object({
    name: z.string().min(2),
    slogan: z.string().optional().default(""),
  }),
  client: z.object({
    name: z.string().min(2),
  }),
  site: z.object({
    address: z.string().min(5),
    postalCode: z.string().min(4),
    city: z.string().min(2),
  }),
  tech: z.object({
    panelCount: z.number().int().positive(),
    powerKwc: z.number().positive(),
    surfacePanelsM2: z.number().positive(),
    orientation: z.string().min(2),
    roofType: z.string().min(2),
    terrainSurfaceM2: z.number().positive(),
    floorSurfaceM2: z.number().positive(),
    parcelRef: z.string().min(2),
    slopeDeg: z.number().optional(),
    azimuthDeg: z.number().optional(),
    panelType: z.string().optional().default("Panneaux photovoltaïques noirs mats"),
  }),
});

app.get("/health", (_req, res) => res.type("text/plain").send("ok"));

app.post("/api/generate-dp", async (req, res) => {
  try {
    const data = Payload.parse(req.body);

    const fullAddress = `${data.site.address}, ${data.site.postalCode} ${data.site.city}`;

    const project = {
      beneficiary: {
        firstName: "",
        lastName: data.client.name,
        address: {
          street: data.site.address,
          postalCode: data.site.postalCode,
          city: data.site.city,
        },
      },
      installation: {
        panelsCount: data.tech.panelCount,
        power: data.tech.powerKwc,
        roofType: data.tech.roofType,
      },
      issuer: {
        name: data.issuer.name,
        slogan: data.issuer.slogan,
      },
      tech: {
        surfacePanelsM2: data.tech.surfacePanelsM2,
        orientation: data.tech.orientation,
        terrainSurfaceM2: data.tech.terrainSurfaceM2,
        floorSurfaceM2: data.tech.floorSurfaceM2,
        parcelRef: data.tech.parcelRef,
        slopeDeg: data.tech.slopeDeg,
        azimuthDeg: data.tech.azimuthDeg,
        panelType: data.tech.panelType,
      },
    };

    const analysis = await dpGenerator.analyzeAddress(fullAddress);
    const pdfBuffer = await dpGenerator.generateDPDocument(project, analysis);

    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="dp-mairie.pdf"');
    res.end(pdfBuffer);
  } catch (e: any) {
    const msg = e?.errors ? JSON.stringify(e.errors, null, 2) : (e?.message || String(e));
    res.status(400).type("text/plain").send(msg);
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`DP server on http://localhost:${PORT}`);
});

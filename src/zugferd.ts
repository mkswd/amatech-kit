// ZUGFeRD / Factur-X hybrid PDF: a human-readable invoice PDF that carries the
// EN 16931 CII XML embedded as `factur-x.xml`, plus the Factur-X + PDF/A-3 XMP
// metadata that ZUGFeRD-aware software (DATEV, accounting tools) looks for.
// Kept in a subpath export (./zugferd) so the kit's main entry stays pure;
// this module depends on pdf-lib.
//
// Note: text uses the standard Helvetica font (WinAnsi covers German + € + ²).
// Embedding a font + sRGB OutputIntent for *strict* PDF/A-3B validator pass is a
// further refinement; the embedded XML + XMP are what consuming systems read.

import { PDFDocument, StandardFonts, rgb, AFRelationship, PDFName } from 'pdf-lib';

export type ZugferdParty = {
  name: string;
  address?: string | null;
  taxNumber?: string | null;
  vatId?: string | null;
  iban?: string | null;
};

export type ZugferdLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type ZugferdInput = {
  number: string;
  issueDateStr: string; // de display, e.g. 13.06.2026
  dueDateStr?: string | null;
  title?: string | null;
  seller: ZugferdParty;
  buyer: ZugferdParty;
  lines: ZugferdLine[];
  netCents: number;
  taxCents: number;
  totalCents: number;
  kleinunternehmer: boolean;
  xml: string; // the EN 16931 CII XML (from buildCiiXml)
};

const eur = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function xmp(invoiceNumber: string): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Rechnung ${xmlEsc(invoiceNumber)}</rdf:li></rdf:Alt></dc:title>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function buildZugferdPdf(input: ZugferdInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Rechnung ${input.number}`);
  doc.setProducer('Feierabend / @amatech/kit');
  doc.setCreator('Feierabend');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const left = 56;
  const right = width - 56;
  let y = height - 64;
  const grey = rgb(0.42, 0.45, 0.5);
  const dark = rgb(0.1, 0.12, 0.16);

  const text = (s: string, x: number, yy: number, size = 9, f = font, color = dark) =>
    page.drawText(s ?? '', { x, y: yy, size, font: f, color });
  const rightText = (s: string, xRight: number, yy: number, size = 9, f = font, color = dark) =>
    page.drawText(s ?? '', { x: xRight - f.widthOfTextAtSize(s ?? '', size), y: yy, size, font: f, color });

  // Letterhead (right)
  rightText(input.seller.name, right, y, 12, bold);
  y -= 13;
  for (const l of (input.seller.address || '').split(/\n/).filter(Boolean)) { rightText(l, right, y, 8, font, grey); y -= 10; }

  // Recipient
  y = height - 150;
  text('Rechnung an', left, y, 8, font, grey); y -= 13;
  text(input.buyer.name || '—', left, y, 11, bold); y -= 26;

  // Meta
  text(`Rechnungsnr.: ${input.number}`, left, y, 9); rightText(`Datum: ${input.issueDateStr}`, right, y, 9); y -= 12;
  if (input.dueDateStr) { rightText(`Fällig bis: ${input.dueDateStr}`, right, y, 9); y -= 12; }
  y -= 8;
  text(`Rechnung: ${input.title || 'Leistung'}`, left, y, 12, bold); y -= 22;

  // Table header
  const colDesc = left, colQty = 330, colUnit = 415, colTot = right;
  text('Beschreibung', colDesc, y, 8, bold, grey);
  rightText('Menge', colQty, y, 8, bold, grey);
  rightText('Einzelpreis', colUnit, y, 8, bold, grey);
  rightText('Gesamt', colTot, y, 8, bold, grey);
  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 14;

  for (const l of input.lines) {
    const desc = l.description.length > 60 ? l.description.slice(0, 58) + '…' : l.description;
    text(desc, colDesc, y, 9);
    rightText(`${l.quantity} ${l.unit}`, colQty, y, 9);
    rightText(eur(l.unitPriceCents), colUnit, y, 9);
    rightText(eur(l.lineTotalCents), colTot, y, 9);
    y -= 14;
    if (y < 140) { y = height - 64; doc.addPage(); } // naive overflow guard
  }

  y -= 6;
  page.drawLine({ start: { x: 360, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 14;
  text('Netto', 360, y, 9, font, grey); rightText(eur(input.netCents), right, y, 9); y -= 12;
  if (!input.kleinunternehmer) { text('zzgl. 19 % USt.', 360, y, 9, font, grey); rightText(eur(input.taxCents), right, y, 9); y -= 12; }
  text('Rechnungsbetrag', 360, y, 10, bold); rightText(eur(input.totalCents), right, y, 10, bold); y -= 20;

  if (input.kleinunternehmer) { text('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', left, y, 8, font, grey); y -= 14; }
  if (input.dueDateStr || input.seller.iban) {
    const pay = `Bitte überweisen Sie den Betrag${input.dueDateStr ? ` bis zum ${input.dueDateStr}` : ''}${input.seller.iban ? ` auf IBAN ${input.seller.iban}.` : '.'}`;
    text(pay, left, y, 8, font, grey); y -= 14;
  }

  // Footer
  const footer = [input.seller.name, input.seller.taxNumber && `Steuernr.: ${input.seller.taxNumber}`, input.seller.vatId && `USt-IdNr.: ${input.seller.vatId}`, input.seller.iban && `IBAN: ${input.seller.iban}`].filter(Boolean).join('  ·  ');
  text(footer, left, 48, 7, font, grey);

  // Embed the EN 16931 CII XML as the Factur-X attachment.
  await doc.attach(new TextEncoder().encode(input.xml), 'factur-x.xml', {
    mimeType: 'application/xml',
    description: 'Factur-X / ZUGFeRD invoice (EN 16931 CII)',
    afRelationship: AFRelationship.Alternative,
  });

  // PDF/A-3 + Factur-X XMP metadata stream (uncompressed).
  const meta = doc.context.stream(xmp(input.number), {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const metaRef = doc.context.register(meta);
  doc.catalog.set(PDFName.of('Metadata'), metaRef);

  // Uncompressed object layout — keeps the /AF, /AFRelationship and embedded
  // factur-x.xml plainly addressable (friendlier for PDF/A-3 + ZUGFeRD readers).
  return doc.save({ useObjectStreams: false });
}

// ZUGFeRD / Factur-X PDF/A-3B: a human-readable invoice PDF that carries the
// EN 16931 CII XML embedded as `factur-x.xml`, targeting strict PDF/A-3B:
// embedded (subsetted) font, sRGB OutputIntent, PDF/A-3 + Factur-X XMP, file ID.
// Kept in a subpath export (./zugferd) so the kit's main entry stays pure.

import { PDFDocument, rgb, AFRelationship, PDFName, PDFString, PDFRawStream, PDFHexString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { CARLITO_REGULAR_B64 } from './assets/carlito-regular';
import { SRGB_ICC_B64 } from './assets/srgb-icc';

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
  issueDateStr: string;
  dueDateStr?: string | null;
  title?: string | null;
  seller: ZugferdParty;
  buyer: ZugferdParty;
  lines: ZugferdLine[];
  netCents: number;
  taxCents: number;
  totalCents: number;
  kleinunternehmer: boolean;
  xml: string;
};

const eur = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function xmp(invoiceNumber: string, isoDate: string, docId: string): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Rechnung ${xmlEsc(invoiceNumber)}</rdf:li></rdf:Alt></dc:title>
      <dc:format>application/pdf</dc:format>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>Feierabend</xmp:CreatorTool>
      <xmp:CreateDate>${isoDate}</xmp:CreateDate>
      <xmp:ModifyDate>${isoDate}</xmp:ModifyDate>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">
      <xmpMM:DocumentID>${docId}</xmpMM:DocumentID>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>Feierabend / @amatech/kit</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Name of the embedded XML invoice file</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The conformance level of the embedded Factur-X data</pdfaProperty:description></rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function buildZugferdPdf(input: ZugferdInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const now = new Date();
  const iso = now.toISOString().replace(/\.\d+Z$/, 'Z');
  const docId = `urn:uuid:${globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000'}`;

  doc.setTitle(`Rechnung ${input.number}`);
  doc.setProducer('Feierabend / @amatech/kit');
  doc.setCreator('Feierabend');
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const font = await doc.embedFont(b64ToBytes(CARLITO_REGULAR_B64), { subset: true });
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const left = 56;
  const right = width - 56;
  let y = height - 64;
  const grey = rgb(0.42, 0.45, 0.5);
  const dark = rgb(0.1, 0.12, 0.16);

  const text = (s: string, x: number, yy: number, size = 9, color = dark) =>
    page.drawText(s ?? '', { x, y: yy, size, font, color });
  const rightText = (s: string, xRight: number, yy: number, size = 9, color = dark) =>
    page.drawText(s ?? '', { x: xRight - font.widthOfTextAtSize(s ?? '', size), y: yy, size, font, color });

  rightText(input.seller.name, right, y, 13, dark); y -= 14;
  for (const l of (input.seller.address || '').split(/\n/).filter(Boolean)) { rightText(l, right, y, 8, grey); y -= 10; }

  y = height - 150;
  text('Rechnung an', left, y, 8, grey); y -= 13;
  text(input.buyer.name || '—', left, y, 11, dark); y -= 26;

  text(`Rechnungsnr.: ${input.number}`, left, y, 9); rightText(`Datum: ${input.issueDateStr}`, right, y, 9); y -= 12;
  if (input.dueDateStr) { rightText(`Fällig bis: ${input.dueDateStr}`, right, y, 9); y -= 12; }
  y -= 8;
  text(`Rechnung: ${input.title || 'Leistung'}`, left, y, 13, dark); y -= 22;

  const colDesc = left, colQty = 330, colUnit = 415, colTot = right;
  text('Beschreibung', colDesc, y, 8, grey);
  rightText('Menge', colQty, y, 8, grey);
  rightText('Einzelpreis', colUnit, y, 8, grey);
  rightText('Gesamt', colTot, y, 8, grey);
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
    if (y < 140) { y = height - 64; doc.addPage(); }
  }

  y -= 6;
  page.drawLine({ start: { x: 360, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 14;
  text('Netto', 360, y, 9, grey); rightText(eur(input.netCents), right, y, 9); y -= 12;
  if (!input.kleinunternehmer) { text('zzgl. 19 % USt.', 360, y, 9, grey); rightText(eur(input.taxCents), right, y, 9); y -= 12; }
  text('Rechnungsbetrag', 360, y, 11, dark); rightText(eur(input.totalCents), right, y, 11, dark); y -= 20;

  if (input.kleinunternehmer) { text('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', left, y, 8, grey); y -= 14; }
  if (input.dueDateStr || input.seller.iban) {
    const pay = `Bitte überweisen Sie den Betrag${input.dueDateStr ? ` bis zum ${input.dueDateStr}` : ''}${input.seller.iban ? ` auf IBAN ${input.seller.iban}.` : '.'}`;
    text(pay, left, y, 8, grey); y -= 14;
  }

  const footer = [input.seller.name, input.seller.taxNumber && `Steuernr.: ${input.seller.taxNumber}`, input.seller.vatId && `USt-IdNr.: ${input.seller.vatId}`, input.seller.iban && `IBAN: ${input.seller.iban}`].filter(Boolean).join('  ·  ');
  text(footer, left, 48, 7, grey);

  // Embed the EN 16931 CII XML as the Factur-X attachment.
  await doc.attach(new TextEncoder().encode(input.xml), 'factur-x.xml', {
    mimeType: 'application/xml',
    description: 'Factur-X / ZUGFeRD invoice (EN 16931 CII)',
    afRelationship: AFRelationship.Alternative,
    creationDate: now,
    modificationDate: now,
  });

  // sRGB OutputIntent (PDF/A requirement).
  const iccBytes = b64ToBytes(SRGB_ICC_B64);
  const iccDict = doc.context.obj({});
  iccDict.set(PDFName.of('N'), doc.context.obj(3));
  iccDict.set(PDFName.of('Length'), doc.context.obj(iccBytes.length));
  const iccRef = doc.context.register(PDFRawStream.of(iccDict, iccBytes));
  const oi = doc.context.obj({});
  oi.set(PDFName.of('Type'), PDFName.of('OutputIntent'));
  oi.set(PDFName.of('S'), PDFName.of('GTS_PDFA1'));
  oi.set(PDFName.of('OutputConditionIdentifier'), PDFString.of('sRGB'));
  oi.set(PDFName.of('Info'), PDFString.of('sRGB IEC61966-2.1'));
  oi.set(PDFName.of('DestOutputProfile'), iccRef);
  doc.catalog.set(PDFName.of('OutputIntents'), doc.context.obj([doc.context.register(oi)]));

  // PDF/A-3 + Factur-X XMP metadata stream (uncompressed).
  const meta = doc.context.stream(xmp(input.number, iso, docId), {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(meta));

  // Trailer /ID (required by PDF/A) — pdf-lib doesn't add one for new documents.
  const idHex = docId.replace(/[^0-9a-fA-F]/g, '').slice(0, 32).padEnd(32, '0');
  doc.context.trailerInfo.ID = doc.context.obj([PDFHexString.of(idHex), PDFHexString.of(idHex)]);

  return doc.save({ useObjectStreams: false });
}

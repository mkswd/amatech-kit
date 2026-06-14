// EN 16931 Cross-Industry-Invoice (CII) XML builder — the machine-readable core
// of a German e-invoice. This is the payload embedded in a ZUGFeRD/Factur-X PDF
// and is also the basis for XRechnung. Pure + dependency-free so every Amazonia
// Tech product (Feierabend, Rechnungsfertig, …) shares one correct implementation.
//
// Profile: ZUGFeRD EN 16931 (COMFORT), guideline urn:cen.eu:en16931:2017.
// Amounts are passed in integer cents and rendered as 2-decimal strings.

export type EInvoiceParty = {
  name: string;
  street?: string | null;
  postcode?: string | null;
  city?: string | null;
  countryCode?: string; // ISO 3166-1 alpha-2; defaults to DE
  taxNumber?: string | null; // Steuernummer (FC)
  vatId?: string | null; // USt-IdNr. (VA)
  email?: string | null;
};

export type EInvoiceLine = {
  id: number | string;
  name: string;
  quantity: number;
  unit: string; // human unit (Stk, h, m², m, pauschal) — mapped to UN/ECE Rec 20
  unitPriceCents: number;
  lineTotalCents: number;
};

export type EInvoiceInput = {
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  currency?: string; // default EUR
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lines: EInvoiceLine[];
  netCents: number;
  taxCents: number;
  grandTotalCents: number;
  kleinunternehmer: boolean; // §19 UStG → VAT category E, rate 0
  vatRate?: number; // standard rate when not Kleinunternehmer (default 19)
  note?: string | null;
  buyerReference?: string | null; // BT-10 Leitweg-ID (required for B2G XRechnung)
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const amt = (cents: number) => (Math.round(cents) / 100).toFixed(2);
const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// Human unit → UN/ECE Recommendation 20 / 21 code.
export function uneceUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'h' || u === 'std' || u === 'stunde' || u === 'stunden') return 'HUR';
  if (u === 'm²' || u === 'm2' || u === 'qm') return 'MTK';
  if (u === 'm' || u === 'lfm') return 'MTR';
  if (u === 'kg') return 'KGM';
  if (u === 'l') return 'LTR';
  if (u === 'tag' || u === 'tage') return 'DAY';
  return 'C62'; // piece / unit (also used for "pauschal")
}

function partyXml(tag: string, p: EInvoiceParty): string {
  const country = (p.countryCode || 'DE').toUpperCase();
  const lines: string[] = [`      <ram:${tag}>`, `        <ram:Name>${esc(p.name)}</ram:Name>`];
  lines.push('        <ram:PostalTradeAddress>');
  if (p.postcode) lines.push(`          <ram:PostcodeCode>${esc(p.postcode)}</ram:PostcodeCode>`);
  if (p.street) lines.push(`          <ram:LineOne>${esc(p.street)}</ram:LineOne>`);
  if (p.city) lines.push(`          <ram:CityName>${esc(p.city)}</ram:CityName>`);
  lines.push(`          <ram:CountryID>${esc(country)}</ram:CountryID>`);
  lines.push('        </ram:PostalTradeAddress>');
  if (p.email) {
    lines.push('        <ram:URIUniversalCommunication>');
    lines.push(`          <ram:URIID schemeID="EM">${esc(p.email)}</ram:URIID>`);
    lines.push('        </ram:URIUniversalCommunication>');
  }
  if (p.vatId) {
    lines.push('        <ram:SpecifiedTaxRegistration>');
    lines.push(`          <ram:ID schemeID="VA">${esc(p.vatId)}</ram:ID>`);
    lines.push('        </ram:SpecifiedTaxRegistration>');
  }
  if (p.taxNumber) {
    lines.push('        <ram:SpecifiedTaxRegistration>');
    lines.push(`          <ram:ID schemeID="FC">${esc(p.taxNumber)}</ram:ID>`);
    lines.push('        </ram:SpecifiedTaxRegistration>');
  }
  lines.push(`      </ram:${tag}>`);
  return lines.join('\n');
}

export function buildCiiXml(inv: EInvoiceInput): string {
  const currency = inv.currency || 'EUR';
  const rate = inv.kleinunternehmer ? 0 : inv.vatRate ?? 19;
  const catCode = inv.kleinunternehmer ? 'E' : 'S'; // E = exempt, S = standard
  const exemptionReason = inv.kleinunternehmer
    ? 'Kleinunternehmer gemäß § 19 UStG, keine Umsatzsteuer'
    : null;

  const lineXml = inv.lines
    .map((l, i) => {
      const lineId = String(l.id ?? i + 1);
      return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${esc(lineId)}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(l.name)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${amt(l.unitPriceCents)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${uneceUnit(l.unit)}">${l.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${catCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${amt(l.lineTotalCents)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
    })
    .join('\n');

  const taxXml = `      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amt(inv.taxCents)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${exemptionReason ? `\n        <ram:ExemptionReason>${esc(exemptionReason)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${amt(inv.netCents)}</ram:BasisAmount>
        <ram:CategoryCode>${catCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;

  const dueXml = inv.dueDate
    ? `      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${ymd(inv.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(inv.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${ymd(inv.issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>${inv.note ? `\n    <ram:IncludedNote>\n      <ram:Content>${esc(inv.note)}</ram:Content>\n    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
${partyXml('SellerTradeParty', inv.seller)}
${partyXml('BuyerTradeParty', inv.buyer)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>
${taxXml}
${dueXml ? dueXml + '\n' : ''}      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amt(inv.netCents)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${amt(inv.netCents)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${amt(inv.taxCents)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amt(inv.grandTotalCents)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${amt(inv.grandTotalCents)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// EN 16931 invoice in UBL syntax with the XRechnung 3.0 customization. UBL is the
// other EN 16931 syntax (alongside CII); German B2G (public-sector) buyers expect
// XRechnung, which also requires a BuyerReference (BT-10, the Leitweg-ID).
export function buildUblXml(inv: EInvoiceInput): string {
  const currency = inv.currency || 'EUR';
  const rate = inv.kleinunternehmer ? 0 : inv.vatRate ?? 19;
  const catCode = inv.kleinunternehmer ? 'E' : 'S';
  const exemptionReason = inv.kleinunternehmer ? 'Kleinunternehmer gemäß § 19 UStG, keine Umsatzsteuer' : null;
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const taxScheme = '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>';
  const taxCategory =
    `<cac:ClassifiedTaxCategory><cbc:ID>${catCode}</cbc:ID><cbc:Percent>${rate}</cbc:Percent>${taxScheme}</cac:ClassifiedTaxCategory>`;

  const partyXml = (tag: string, p: EInvoiceParty): string => {
    const country = (p.countryCode || 'DE').toUpperCase();
    const addr: string[] = ['      <cac:PostalAddress>'];
    if (p.street) addr.push(`        <cbc:StreetName>${esc(p.street)}</cbc:StreetName>`);
    if (p.city) addr.push(`        <cbc:CityName>${esc(p.city)}</cbc:CityName>`);
    if (p.postcode) addr.push(`        <cbc:PostalZone>${esc(p.postcode)}</cbc:PostalZone>`);
    addr.push(`        <cac:Country><cbc:IdentificationCode>${esc(country)}</cbc:IdentificationCode></cac:Country>`);
    addr.push('      </cac:PostalAddress>');
    const taxReg = p.vatId
      ? `\n      <cac:PartyTaxScheme><cbc:CompanyID>${esc(p.vatId)}</cbc:CompanyID>${taxScheme}</cac:PartyTaxScheme>`
      : '';
    const contact = p.email ? `\n      <cac:Contact><cbc:ElectronicMail>${esc(p.email)}</cbc:ElectronicMail></cac:Contact>` : '';
    return `  <cac:${tag}>
    <cac:Party>
${addr.join('\n')}${taxReg}
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName></cac:PartyLegalEntity>${contact}
    </cac:Party>
  </cac:${tag}>`;
  };

  const lineXml = inv.lines
    .map((l, i) => `  <cac:InvoiceLine>
    <cbc:ID>${esc(String(l.id ?? i + 1))}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${uneceUnit(l.unit)}">${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${amt(l.lineTotalCents)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${esc(l.name)}</cbc:Name>${taxCategory}</cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${currency}">${amt(l.unitPriceCents)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`)
    .join('\n');

  const taxCatHeader = `<cac:TaxCategory><cbc:ID>${catCode}</cbc:ID><cbc:Percent>${rate}</cbc:Percent>${exemptionReason ? `<cbc:TaxExemptionReason>${esc(exemptionReason)}</cbc:TaxExemptionReason>` : ''}${taxScheme}</cac:TaxCategory>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(inv.number)}</cbc:ID>
  <cbc:IssueDate>${iso(inv.issueDate)}</cbc:IssueDate>${inv.dueDate ? `\n  <cbc:DueDate>${iso(inv.dueDate)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>${inv.note ? `\n  <cbc:Note>${esc(inv.note)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>${inv.buyerReference ? `\n  <cbc:BuyerReference>${esc(inv.buyerReference)}</cbc:BuyerReference>` : ''}
${partyXml('AccountingSupplierParty', inv.seller)}
${partyXml('AccountingCustomerParty', inv.buyer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${amt(inv.taxCents)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${amt(inv.netCents)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${amt(inv.taxCents)}</cbc:TaxAmount>
      ${taxCatHeader}
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${amt(inv.netCents)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${amt(inv.netCents)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${amt(inv.grandTotalCents)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${amt(inv.grandTotalCents)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineXml}
</Invoice>`;
}

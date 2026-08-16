import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument = require('pdfkit');
import { brochureCopy, fill, type BrochureCopy, type BrochureLocale } from './copy';
import { formatBdDate, money, sampleAnnualRange, stripHtml, type ReturnAssumptions } from './util';

const OCEAN = '#0E3A5A';
const GOLD = '#D4AF37';
const PEARL = '#F8F8F6';
const MUTED = '#4A6578';
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_BN = join(process.cwd(), 'assets/fonts/NotoSansBengali-Regular.ttf');
const LOGO = join(process.cwd(), 'assets/brochure/logo.png');

export type BrochurePromo = { name: string; discountPct: number; endsAt: Date | string };
export type BrochureSuiteRow = {
  suiteId: string;
  type: string;
  view: string;
  floor: number | string;
  size: number | string;
  daysPerMonth: number;
  price: number;
  reserveFrom: number;
};
export type BrochureFaq = { question: string; answer: string };
export type BrochureTerm = { title: string; body: string };

export type BrochureData = {
  locale: BrochureLocale;
  promotions: BrochurePromo[];
  heroPath?: string | null;
  resortPaths: string[];
  designPaths: string[];
  suites: BrochureSuiteRow[];
  assumptions: ReturnAssumptions;
  reservePct: number;
  faqs: BrochureFaq[];
  terms: BrochureTerm[];
};

function isBn(locale: string) {
  return locale === 'bn';
}

export function buildBrochurePdf(data: BrochureData): Promise<Buffer> {
  const copy = brochureCopy(data.locale);
  const bn = isBn(data.locale);
  const hasBnFont = existsSync(FONT_BN);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (hasBnFont) doc.registerFont('Bn', FONT_BN);

    const bodyFont = bn && hasBnFont ? 'Bn' : 'Helvetica';
    const boldFont = bn && hasBnFont ? 'Bn' : 'Helvetica-Bold';

    const ctx = {
      doc,
      copy,
      data,
      bn,
      hasBnFont,
      bodyFont,
      boldFont,
      skipHeader: true
    };

    drawCover(ctx);
    ctx.skipHeader = false;
    drawResort(ctx);
    drawDesign(ctx);
    drawSuites(ctx);
    drawReturnsAndBuy(ctx);
    drawTerms(ctx);
    drawFaq(ctx);
    ctx.skipHeader = true;
    doc.addPage();
    drawBack(ctx);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const isCover = i === 0;
      const isBack = i === range.count - 1;
      if (!isCover && !isBack) {
        drawHeaderBar(ctx, i + 1, range.count);
        drawFooterBar(ctx);
      }
    }

    doc.end();
  });
}

type Ctx = {
  doc: PDFKit.PDFDocument;
  copy: BrochureCopy;
  data: BrochureData;
  bn: boolean;
  hasBnFont: boolean;
  bodyFont: string;
  boldFont: string;
  skipHeader: boolean;
};

function drawHeaderBar(ctx: Ctx, page: number, total: number) {
  const { doc, copy, boldFont } = ctx;
  doc.save();
  doc.rect(0, 0, PAGE_W, 22).fill(OCEAN);
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(8);
  doc.text(copy.brand, MARGIN, 6, { width: CONTENT_W - 40, lineBreak: false });
  doc.text(String(page), PAGE_W - MARGIN - 40, 6, { width: 40, align: 'right', lineBreak: false });
  doc.restore();
  void total;
}

function drawFooterBar(ctx: Ctx) {
  const { doc, copy, bodyFont } = ctx;
  doc.save();
  doc.moveTo(MARGIN, PAGE_H - 22).lineTo(PAGE_W - MARGIN, PAGE_H - 22).strokeColor(GOLD).lineWidth(0.6).stroke();
  doc.fillColor(MUTED).font(bodyFont).fontSize(7);
  doc.text(copy.footerNote, MARGIN, PAGE_H - 18, { width: CONTENT_W, align: 'center', lineBreak: false });
  doc.restore();
}

function ensure(ctx: Ctx, h: number) {
  const bottom = PAGE_H - (ctx.skipHeader ? MARGIN : 28);
  if (ctx.doc.y + h > bottom) {
    ctx.doc.addPage();
    ctx.doc.y = ctx.skipHeader ? MARGIN : 32;
  }
}

function sectionTitle(ctx: Ctx, title: string) {
  ensure(ctx, 28);
  const { doc, boldFont } = ctx;
  doc.fillColor(GOLD).font(boldFont).fontSize(8).text(title.toUpperCase(), MARGIN, doc.y);
  doc.moveTo(MARGIN, doc.y + 2).lineTo(MARGIN + 72, doc.y + 2).strokeColor(GOLD).lineWidth(1).stroke();
  doc.moveDown(0.6);
  doc.fillColor(OCEAN);
}

function para(ctx: Ctx, text: string, size = 9) {
  const { doc, bodyFont } = ctx;
  ensure(ctx, 24);
  doc.font(bodyFont).fontSize(size).fillColor(OCEAN).text(text, MARGIN, doc.y, {
    width: CONTENT_W,
    align: 'justify',
    lineGap: 1.5
  });
  doc.moveDown(0.4);
}

function drawTakaLine(ctx: Ctx, label: string, amount: number, x: number, y: number, w: number) {
  const { doc, bodyFont, hasBnFont } = ctx;
  const font = hasBnFont ? 'Bn' : bodyFont;
  doc.font(font).fontSize(8).fillColor(OCEAN).text(`${label}${money(amount)}`, x, y, {
    width: w,
    lineBreak: false
  });
}

function localImage(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return null;
  if (/\.pdf($|\?)/i.test(url)) return null;
  const relative = url.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '');
  const path = join(process.cwd(), 'uploads', relative);
  return existsSync(path) ? path : null;
}

function drawCover(ctx: Ctx) {
  const { doc, copy, data, boldFont, bodyFont, hasBnFont } = ctx;
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(PEARL);
  doc.rect(0, 0, PAGE_W, 8).fill(GOLD);
  doc.rect(0, 8, PAGE_W, 70).fill(OCEAN);

  if (existsSync(LOGO)) {
    try {
      doc.image(LOGO, MARGIN, 18, { height: 48 });
    } catch {
      /* skip */
    }
  }
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(14);
  doc.text(copy.brand, MARGIN + 58, 28, { width: CONTENT_W - 58 });
  doc.font(bodyFont).fontSize(8).fillColor(GOLD);
  doc.text(copy.tagline, MARGIN + 58, 48, { width: CONTENT_W - 58 });

  let y = 92;
  const hero = localImage(data.heroPath);
  if (hero) {
    try {
      doc.image(hero, MARGIN, y, { fit: [CONTENT_W, 168], align: 'center', valign: 'center' });
      y += 176;
    } catch {
      y += 8;
    }
  }

  doc.y = y;
  doc.fillColor(OCEAN).font(boldFont).fontSize(26);
  doc.text(copy.headline, MARGIN, doc.y, { width: CONTENT_W });
  doc.fillColor(GOLD).fontSize(22).text(copy.headlineAccent, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.3);
  doc.fillColor(MUTED).font(bodyFont).fontSize(10).text(copy.sub, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.8);

  doc.fillColor(OCEAN).font(boldFont).fontSize(11).text(copy.promoTitle, MARGIN, doc.y);
  doc.moveDown(0.3);
  if (!data.promotions.length) {
    doc.font(bodyFont).fontSize(9).fillColor(MUTED).text(copy.promoNone, MARGIN, doc.y, { width: CONTENT_W });
  } else {
    for (const p of data.promotions.slice(0, 3)) {
      ensure(ctx, 36);
      const top = doc.y;
      doc.save();
      doc.rect(MARGIN, top, CONTENT_W, 32).strokeColor(GOLD).lineWidth(1).stroke();
      doc.restore();
      doc.font(boldFont).fontSize(10).fillColor(OCEAN).text(p.name, MARGIN + 8, top + 6, { width: CONTENT_W - 120 });
      doc.font(boldFont).fontSize(11).fillColor(GOLD).text(fill(copy.promoOff, { pct: p.discountPct }), PAGE_W - MARGIN - 110, top + 6, {
        width: 100,
        align: 'right'
      });
      doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(fill(copy.promoUntil, { date: formatBdDate(p.endsAt) }), MARGIN + 8, top + 18, {
        width: CONTENT_W - 16
      });
      doc.y = top + 38;
    }
  }

  const boxY = PAGE_H - 128;
  doc.save();
  doc.rect(MARGIN, boxY, CONTENT_W, 92).fill('#FFFFFF');
  doc.rect(MARGIN, boxY, CONTENT_W, 92).strokeColor(OCEAN).lineWidth(0.6).stroke();
  doc.restore();
  doc.font(bodyFont).fontSize(8).fillColor(OCEAN).text(copy.declaration, MARGIN + 10, boxY + 8, {
    width: CONTENT_W - 20,
    align: 'justify',
    lineGap: 1.2
  });
}

function drawResort(ctx: Ctx) {
  const { doc, copy, data, bodyFont, boldFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.resortTitle);
  para(ctx, copy.aboutBody, 9);
  doc.moveDown(0.2);
  for (const h of copy.highlights) {
    ensure(ctx, 14);
    doc.font(boldFont).fontSize(9).fillColor(GOLD).text('▸ ', MARGIN, doc.y, { continued: true, lineBreak: false });
    doc.font(bodyFont).fillColor(OCEAN).text(h, { width: CONTENT_W - 12 });
  }
  doc.moveDown(0.4);

  const photos = data.resortPaths.map(localImage).filter(Boolean) as string[];
  if (photos.length) {
    ensure(ctx, 110);
    const n = Math.min(2, photos.length);
    const w = (CONTENT_W - 8) / n;
    const y = doc.y;
    photos.slice(0, n).forEach((p, i) => {
      try {
        doc.image(p, MARGIN + i * (w + 8), y, { fit: [w, 100], align: 'center', valign: 'center' });
      } catch {
        /* skip */
      }
    });
    doc.y = y + 108;
  }

  sectionTitle(ctx, copy.amenitiesTitle);
  const colW = (CONTENT_W - 10) / 2;
  const startY = doc.y;
  copy.amenities.forEach((a, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (colW + 10);
    const y = startY + row * 28;
    doc.font(boldFont).fontSize(8).fillColor(OCEAN).text(a.title, x, y, { width: colW });
    doc.font(bodyFont).fontSize(7).fillColor(MUTED).text(a.desc, x, y + 11, { width: colW });
  });
  doc.y = startY + Math.ceil(copy.amenities.length / 2) * 28 + 8;
  doc.font(boldFont).fontSize(8).fillColor(GOLD).text(copy.locationLabel + '  ', MARGIN, doc.y, { continued: true });
  doc.font(bodyFont).fillColor(OCEAN).text(copy.location);
}

function drawDesign(ctx: Ctx) {
  const { doc, copy, data, bodyFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.designTitle);
  const imgs = data.designPaths.map(localImage).filter(Boolean) as string[];
  if (!imgs.length) {
    para(ctx, copy.designEmpty, 9);
    return;
  }
  imgs.slice(0, 2).forEach((p) => {
    ensure(ctx, 250);
    try {
      doc.image(p, MARGIN, doc.y, { fit: [CONTENT_W, 240], align: 'center', valign: 'center' });
      doc.y += 248;
    } catch {
      doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(copy.designEmpty, MARGIN, doc.y);
    }
  });
}

function drawSuites(ctx: Ctx) {
  const { doc, copy, data, bodyFont, boldFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.suitesTitle);
  if (!data.suites.length) {
    para(ctx, copy.suitesEmpty, 9);
    return;
  }

  const cols = [
    { key: 'suiteId', label: copy.colUnit, w: 54 },
    { key: 'type', label: copy.colType, w: 58 },
    { key: 'view', label: copy.colView, w: 48 },
    { key: 'floor', label: copy.colFloor, w: 22 },
    { key: 'size', label: copy.colSize, w: 36 },
    { key: 'days', label: copy.colShare, w: 42 },
    { key: 'price', label: copy.colPrice, w: 88 },
    { key: 'from', label: copy.colFrom, w: 88 }
  ];
  const rowH = 16;

  const header = () => {
    ensure(ctx, rowH + 4);
    let x = MARGIN;
    doc.rect(MARGIN, doc.y, CONTENT_W, rowH).fill(OCEAN);
    doc.font(boldFont).fontSize(7).fillColor('#FFFFFF');
    for (const c of cols) {
      doc.text(c.label, x + 2, doc.y + 4, { width: c.w - 4, lineBreak: false });
      x += c.w;
    }
    doc.y += rowH;
  };

  header();
  data.suites.forEach((row, idx) => {
    if (doc.y + rowH > PAGE_H - 32) {
      doc.addPage();
      doc.y = 32;
      header();
    }
    if (idx % 2 === 0) doc.rect(MARGIN, doc.y, CONTENT_W, rowH).fill(PEARL);
    let x = MARGIN;
    const y = doc.y + 4;
    doc.font(bodyFont).fontSize(7).fillColor(OCEAN);
    const cells = [
      row.suiteId,
      row.type,
      row.view,
      String(row.floor),
      String(row.size),
      fill(copy.daysMo, { n: row.daysPerMonth })
    ];
    cells.forEach((val, i) => {
      doc.text(val, x + 2, y, { width: cols[i].w - 4, lineBreak: false });
      x += cols[i].w;
    });
    drawTakaLine(ctx, '', row.price, x + 2, y, cols[6].w - 4);
    x += cols[6].w;
    drawTakaLine(ctx, '', row.reserveFrom, x + 2, y, cols[7].w - 4);
    doc.y += rowH;
  });
  doc.moveDown(0.6);
}

function drawReturnsAndBuy(ctx: Ctx) {
  const { doc, copy, data, bodyFont, boldFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.returnsTitle);
  para(ctx, copy.returnsIntro, 9);
  doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(copy.sampleDays, MARGIN, doc.y);
  doc.moveDown(0.4);

  const cats = ['Standard', 'Delux', 'Premium'];
  const labels: Record<string, string> = { Standard: 'Standard', Delux: 'Deluxe', Premium: 'Premium' };
  const rowH = 18;
  ensure(ctx, rowH * 5);
  doc.rect(MARGIN, doc.y, CONTENT_W, rowH).fill(OCEAN);
  doc.font(boldFont).fontSize(8).fillColor('#FFFFFF');
  doc.text(copy.colCategory, MARGIN + 6, doc.y + 4, { width: 140 });
  doc.text(copy.colLow, MARGIN + 160, doc.y + 4, { width: 160 });
  doc.text(copy.colHigh, MARGIN + 330, doc.y + 4, { width: 160 });
  doc.y += rowH;

  cats.forEach((cat, idx) => {
    const r = sampleAnnualRange(5, data.assumptions, cat);
    if (idx % 2 === 0) doc.rect(MARGIN, doc.y, CONTENT_W, rowH).fill(PEARL);
    doc.font(bodyFont).fontSize(8).fillColor(OCEAN).text(labels[cat], MARGIN + 6, doc.y + 4, { width: 140 });
    if (r) {
      drawTakaLine(ctx, '', r.low, MARGIN + 160, doc.y + 4, 160);
      drawTakaLine(ctx, '', r.high, MARGIN + 330, doc.y + 4, 160);
    }
    doc.y += rowH;
  });
  doc.moveDown(0.5);
  para(ctx, copy.returnsDisclaimer, 8);

  sectionTitle(ctx, copy.buyTitle);
  para(ctx, copy.buyBody, 9);
  if (data.promotions.length) {
    doc.font(bodyFont).fontSize(9).fillColor(OCEAN).text(
      data.promotions.map((p) => `${p.name} — ${fill(copy.promoOff, { pct: p.discountPct })}`).join('  ·  '),
      MARGIN,
      doc.y,
      { width: CONTENT_W }
    );
  }
}

function drawTerms(ctx: Ctx) {
  const { doc, copy, data, boldFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.termsTitle);
  if (!data.terms.length) {
    para(ctx, copy.termsEmpty, 9);
    return;
  }
  for (const t of data.terms) {
    ensure(ctx, 36);
    doc.font(boldFont).fontSize(9).fillColor(OCEAN).text(t.title, MARGIN, doc.y, { width: CONTENT_W });
    para(ctx, stripHtml(t.body), 8);
  }
}

function drawFaq(ctx: Ctx) {
  const { doc, copy, data, boldFont } = ctx;
  doc.addPage();
  doc.y = 32;
  sectionTitle(ctx, copy.faqTitle);
  if (!data.faqs.length) {
    para(ctx, copy.faqEmpty, 9);
    return;
  }
  for (const f of data.faqs) {
    ensure(ctx, 28);
    doc.font(boldFont).fontSize(8).fillColor(OCEAN).text(stripHtml(f.question), MARGIN, doc.y, { width: CONTENT_W });
    para(ctx, stripHtml(f.answer), 8);
  }
}

function drawBack(ctx: Ctx) {
  const { doc, copy, boldFont, bodyFont } = ctx;
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(PEARL);
  doc.rect(0, 0, PAGE_W, 8).fill(GOLD);
  doc.rect(0, 8, PAGE_W, 56).fill(OCEAN);
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(16).text(copy.aboutTitle, MARGIN, 26, { width: CONTENT_W });

  doc.y = 84;
  para(ctx, copy.aboutBody, 9);
  doc.moveDown(0.3);
  for (const h of copy.highlights) {
    doc.font(bodyFont).fontSize(9).fillColor(OCEAN).text(`•  ${h}`, MARGIN, doc.y, { width: CONTENT_W });
  }
  doc.moveDown(0.8);
  doc.font(boldFont).fontSize(11).fillColor(GOLD).text(copy.companyTitle, MARGIN, doc.y);
  para(ctx, copy.companyIntro, 9);

  doc.y = Math.max(doc.y + 16, PAGE_H - 160);
  doc.rect(MARGIN, doc.y, CONTENT_W, 110).fill(OCEAN);
  const y = doc.y + 14;
  doc.fillColor(GOLD).font(boldFont).fontSize(10).text(copy.contactTitle, MARGIN + 14, y);
  doc.fillColor('#FFFFFF').font(bodyFont).fontSize(9);
  doc.text(copy.brand, MARGIN + 14, y + 18);
  doc.text(copy.location, MARGIN + 14, y + 32);
  doc.text(copy.phone, MARGIN + 14, y + 48);
  doc.text(copy.email, MARGIN + 14, y + 62);
  doc.text(copy.web, MARGIN + 14, y + 76);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(GOLD);
}

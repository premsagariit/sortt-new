import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB, LineCapStyle } from 'pdf-lib';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { storageProvider } from '../lib/storage';
import { getLocalizedMaterialLabelSql } from './language';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const sanitizeText = (value: unknown): string =>
  sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const fmtAmount = (n: number) => `Rs. ${n.toFixed(2)}`;

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
};

const drawRoundedRect = (
  page: PDFPage,
  x: number, y: number,
  w: number, h: number,
  r: number,
  fillColor?: RGB,
  strokeColor?: RGB,
  lineWidth = 0.5,
  corners = { tl: true, tr: true, br: true, bl: true }
) => {
  // SVG path generation for rectangles with selectively rounded corners
  // pdf-lib's drawSvgPath receives y bottom-up, but our system expects y top-down.
  // We use `page.drawSvgPath(path)` where all coordinates are in pdf-lib's bottom-up orientation.
  const kappa = 0.552284749831;
  const c = r * kappa;

  let p = `M ${corners.bl ? x + r : x} ${y - h}`;

  // left edge + top left corner
  p += ` L ${x} ${corners.tl ? y - r : y}`;
  if (corners.tl) {
    p += ` C ${x} ${y - r + c}, ${x + r - c} ${y}, ${x + r} ${y}`;
  }

  // top edge + top right corner
  p += ` L ${corners.tr ? x + w - r : x + w} ${y}`;
  if (corners.tr) {
    p += ` C ${x + w - r + c} ${y}, ${x + w} ${y - r + c}, ${x + w} ${y - r}`;
  }

  // right edge + bottom right corner
  p += ` L ${x + w} ${corners.br ? y - h + r : y - h}`;
  if (corners.br) {
    p += ` C ${x + w} ${y - h + r - c}, ${x + w - r + c} ${y - h}, ${x + w - r} ${y - h}`;
  }

  // bottom edge + bottom left corner
  p += ` L ${corners.bl ? x + r : x} ${y - h}`;
  if (corners.bl) {
    p += ` C ${x + r - c} ${y - h}, ${x} ${y - h + r - c}, ${x} ${y - h + r}`; // close path manually or use Z
  }
  p += ' Z';

  const options: any = {};
  if (fillColor) options.color = fillColor;
  if (strokeColor) {
    options.borderColor = strokeColor;
    options.borderWidth = lineWidth;
  }
  page.drawSvgPath(p, options);
};

const drawRect = (
  page: PDFPage,
  x: number, y: number,
  w: number, h: number,
  color?: RGB,
  strokeColor?: RGB,
  lineWidth = 0.5
) => {
  page.drawRectangle({
    x, y: y - h, width: w, height: h,
    color, borderColor: strokeColor, borderWidth: lineWidth
  });
};

const drawTextRight = (
  page: PDFPage,
  text: string,
  rightEdgeX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
) => {
  // Provide defensive font check, avoid crashing on empty fonts
  if (!font) return;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightEdgeX - textWidth, y, font, size, color });
};

const fitText = (text: string, font: PDFFont, size: number, maxWidth: number): string => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '…', size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
};

const COLORS = {
  navy: rgb(0.110, 0.180, 0.290), // #1C2E4A
  red: rgb(0.753, 0.224, 0.169), // #C0392B
  amber: rgb(0.718, 0.475, 0.122), // #B7791F
  teal: rgb(0.102, 0.420, 0.388), // #1A6B63
  tealLight: rgb(0.918, 0.961, 0.957), // #EAF5F4
  slate: rgb(0.361, 0.420, 0.478), // #5C6B7A
  muted: rgb(0.557, 0.608, 0.667), // #8E9BAA
  border: rgb(0.867, 0.890, 0.918), // #DDE3EA
  bg: rgb(0.957, 0.965, 0.976), // #F4F6F9
  white: rgb(1, 1, 1),
  
  // Opacity approximations specified for navy background (#1C2E4A = 28,46,74)
  navyFaint1: rgb(0.490, 0.550, 0.630), // 38% white
  navyLine: rgb(0.290, 0.350, 0.430), // 8% white 
  navyFaint2: rgb(0.860, 0.860, 0.860), // 84% approx white
  white76: rgb(0.760, 0.760, 0.760), // 76%
  white75: rgb(0.750, 0.750, 0.750),
  white65: rgb(0.650, 0.650, 0.650),
  white36: rgb(0.360, 0.360, 0.360),
  white34: rgb(0.340, 0.340, 0.340),
  white30: rgb(0.300, 0.300, 0.300),
  white60: rgb(0.600, 0.600, 0.600),
  white10: rgb(0.300, 0.340, 0.410),
};

// --------------------------------------------------------------------------
// Main export — fetch order data, generate PDF, upload to R2
// --------------------------------------------------------------------------
export async function generateAndStoreInvoice(orderId: string): Promise<void> {
  try {
    console.log(`[Invoice] Starting robust pdf-lib generation for order ${orderId}`);

    const orderRes = await query(
      `SELECT o.id,
              o.order_number,
              o.confirmed_value,
              o.created_at        AS order_created_at,
              o.updated_at        AS order_updated_at,
              u_seller.name       AS seller_name,
              u_seller.preferred_language AS seller_preferred_language,
              sp.profile_type,
              sp.business_name    AS seller_business_name,
              sp.gstin            AS seller_gstin,
              sp.locality         AS seller_locality,
              sp.city_code        AS seller_city_code,
              u_agg.name          AS aggregator_name,
              ap.business_name    AS aggregator_business_name,
              ap.operating_area   AS aggregator_operating_area,
              ap.city_code        AS aggregator_city_code,
              COALESCE(
                json_agg(
                  json_build_object(
                    'material_code',       oi.material_code,
                    'material_label',      ${getLocalizedMaterialLabelSql('u_seller.preferred_language')},
                    'confirmed_weight_kg', COALESCE(oi.confirmed_weight_kg, 0),
                    'rate_per_kg',         COALESCE(oi.rate_per_kg, 0),
                    'amount',              COALESCE(oi.amount, 0)
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'::json
              ) AS line_items
       FROM orders o
       JOIN users u_seller ON u_seller.id = o.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = o.seller_id
       LEFT JOIN users u_agg ON u_agg.id = o.aggregator_id
       LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN material_types mt ON mt.code = oi.material_code
       WHERE o.id = $1
      GROUP BY o.id, u_seller.name, u_seller.preferred_language, sp.profile_type, sp.business_name, sp.gstin, sp.locality, sp.city_code,
                u_agg.name, ap.business_name, ap.operating_area, ap.city_code`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      console.warn(`[Invoice] Order ${orderId} not found — skipping`);
      return;
    }

    const order = orderRes.rows[0];
    const confirmedTotal = toNumber(order.confirmed_value);
    const sellerGstin = order.seller_gstin ? String(order.seller_gstin).trim().toUpperCase() : null;

    if (sellerGstin && !GSTIN_REGEX.test(sellerGstin)) {
      Sentry.captureMessage(`Invalid GSTIN for order ${orderId}: ${sellerGstin}`, 'warning');
    }

    const year = new Date().getFullYear();
    const numericPart = String(order.order_number || '').padStart(6, '0');
    const orderDisplayId = `#${numericPart}`;
    const invoiceNumber  = `INV-${year}-${numericPart}`;
    const invoiceDate    = formatDate(new Date());

    const lineItemsRaw = Array.isArray(order.line_items) ? order.line_items : [];
    const lineItems = lineItemsRaw.map((item: Record<string, unknown>) => ({
      material_code:        sanitizeText(item.material_code),
      material_label:       sanitizeText(item.material_label || item.material_code),
      confirmed_weight_kg:  toNumber(item.confirmed_weight_kg),
      rate_per_kg:          toNumber(item.rate_per_kg),
      amount:               toNumber(item.amount),
    }));

    const subtotal     = lineItems.reduce((s: number, i: { amount: number }) => s + i.amount, 0) || confirmedTotal;
    const platformFee  = 0;
    const totalAmount  = Number((subtotal + platformFee).toFixed(2));
    const totalWeight  = lineItems.reduce((s: number, i: { confirmed_weight_kg: number }) => s + i.confirmed_weight_kg, 0);

    const city = sanitizeText(order.aggregator_city_code || order.seller_city_code || 'India');

    // Persist DB record
    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_date:   new Date().toISOString().split('T')[0],
      seller: {
        name:          sanitizeText(order.seller_name),
        profile_type:  sanitizeText(order.profile_type),
        business_name: sanitizeText(order.seller_business_name),
        gstin:         sellerGstin,
        locality:      sanitizeText(order.seller_locality),
        city_code:     sanitizeText(order.seller_city_code),
      },
      aggregator: {
        name:           sanitizeText(order.aggregator_name),
        business_name:  sanitizeText(order.aggregator_business_name),
        operating_area: sanitizeText(order.aggregator_operating_area),
        city_code:      sanitizeText(order.aggregator_city_code),
      },
      line_items:    lineItems,
      subtotal,
      platform_fee:  platformFee,
      total_amount:  totalAmount,
      order_display_id: orderDisplayId,
    };

    const insertRes = await query(
      `INSERT INTO invoices (order_id, seller_gstin, aggregator_details, total_amount, invoice_data)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
       ON CONFLICT (order_id) DO UPDATE SET
         seller_gstin       = EXCLUDED.seller_gstin,
         aggregator_details = EXCLUDED.aggregator_details,
         total_amount       = EXCLUDED.total_amount,
         invoice_data       = EXCLUDED.invoice_data
       RETURNING id`,
      [
        orderId,
        sellerGstin,
        JSON.stringify(invoiceData.aggregator),
        totalAmount,
        JSON.stringify(invoiceData),
      ]
    );

    const invoiceId = insertRes.rows[0]?.id;
    if (!invoiceId) {
      console.error(`[Invoice] DB insert returned no id for order ${orderId}`);
      return;
    }

    console.log(`[Invoice] DB record created id=${invoiceId}, generating PDF via pdf-lib...`);

    // PDF Generation — use standard embedded fonts (WinAnsi-safe, no external files needed)
    const pdfDoc = await PDFDocument.create();

    const fontSans     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono     = await pdfDoc.embedFont(StandardFonts.Courier);
    console.log('[Invoice] Using standard Helvetica/Courier fonts (WinAnsi-safe)');

    // Embed app logo — icon.png from mobile assets copied to backend/assets/
    let logoImage: import('pdf-lib').PDFImage | null = null;
    try {
      const p1 = path.join(process.cwd(), 'assets', 'logo.png');
      const p2 = path.resolve(__dirname, '../../assets/logo.png');
      const logoPath = fs.existsSync(p1) ? p1 : p2;
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {
      console.warn('[Invoice] Logo image not found, using text fallback');
    }

    // Dynamic height measurement
    const MARGIN_SIDE = 44;
    const PAGE_WIDTH = 595.28;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_SIDE * 2);

    const headerHeight = 182;
    const partyHeight = 78;
    const tableHeaderHeight = 28;
    const rowHeight = 42;
    const tableFooterHeight = 30;
    const tableRowsHeight = lineItems.length * rowHeight;
    const detailsHeight = 24 * 7;
    const bannerHeight = 56;
    const footerHeight = 52;
    
    // Sum padding and gaps roughly equal to html
    const totalContentHeight = headerHeight + 32 + partyHeight + 26 + 12 + tableHeaderHeight + tableRowsHeight + tableFooterHeight + 26 + detailsHeight + 26 + bannerHeight + 40 + footerHeight;
    const pageHeight = Math.max(841.89, totalContentHeight);
    const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight]);
    const fromTop = (y: number) => pageHeight - y;

    // SECTION 1 — HEADER
    drawRect(page, 0, fromTop(0), PAGE_WIDTH, headerHeight, COLORS.navy);

    // 1.2 Logo — app icon image or drawn text fallback
    const brandX = MARGIN_SIDE;
    const logoH = 44;
    if (logoImage) {
      const logoDims = logoImage.scaleToFit(logoH * 2.2, logoH); // wider than tall
      page.drawImage(logoImage, {
        x: brandX,
        y: fromTop(12 + logoDims.height),
        width: logoDims.width,
        height: logoDims.height,
      });
    } else {
      // Drawn text fallback: teal circle + 'S' + 'sortt' wordmark
      const logoR = 16;
      const logoCX = brandX + logoR;
      const logoCY = fromTop(36);
      page.drawCircle({ x: logoCX, y: logoCY, size: logoR, color: COLORS.teal });
      const sChar = 'S';
      const sCharSize = 18;
      const sCharW = fontSansBold.widthOfTextAtSize(sChar, sCharSize);
      page.drawText(sChar, { x: logoCX - sCharW / 2, y: logoCY - sCharSize * 0.36, font: fontSansBold, size: sCharSize, color: COLORS.white });
      const wordmarkX = brandX + logoR * 2 + 8;
      page.drawText('sortt', { x: wordmarkX, y: fromTop(36 + 10), font: fontSansBold, size: 22, color: COLORS.white });
      const dotAccentW = fontSansBold.widthOfTextAtSize('s', 22);
      page.drawCircle({ x: wordmarkX + dotAccentW / 2, y: fromTop(36 + 10) - 6, size: 2.5, color: COLORS.red });
    }

    // 1.3 Tagline
    page.drawText(`India's Scrap Marketplace  ·  ${city}`, { x: brandX, y: fromTop(36 + 42), font: fontSans, size: 8, color: COLORS.navyFaint1 });

    // 1.4 Invoice Badge
    const rightEdge = PAGE_WIDTH - MARGIN_SIDE;
    const badgeText = "ORDER INVOICE";
    const badgeW = fontSansBold.widthOfTextAtSize(badgeText, 7) + 24;
    drawRoundedRect(page, rightEdge - badgeW, fromTop(22), badgeW, 14, 7, COLORS.red);
    page.drawText(badgeText, { x: rightEdge - badgeW + 12, y: fromTop(22 + 9), font: fontSansBold, size: 7, color: COLORS.white });

    // 1.5 Invoice Number
    drawTextRight(page, invoiceNumber, rightEdge, fromTop(60), fontMono, 18, COLORS.white);
    
    // 1.6 Invoice Date
    drawTextRight(page, invoiceDate, rightEdge, fromTop(60 + 14), fontMono, 9, COLORS.navyFaint1);

    // 1.7 Horizontal Rule
    page.drawLine({ start: { x: MARGIN_SIDE, y: fromTop(100) }, end: { x: rightEdge, y: fromTop(100) }, color: COLORS.navyLine, thickness: 0.5 });

    // 1.8 4-column Meta Strip
    const colWidth = CONTENT_WIDTH / 4;
    const metaYlbl = fromTop(114);
    const metaYval = fromTop(130);
    
    [[`ORDER REFERENCE`, orderDisplayId],
     [`PICKUP DATE`, `${formatDate(order.order_updated_at)}`],
     [`PAYMENT MODE`, `Cash on Pickup`],
     [`CITY & STATE`, `${city}, Telangana`]].forEach((cell, i) => {
       const x = MARGIN_SIDE + (i * colWidth) + (i === 0 ? 0 : 20);
       if (i > 0) {
         page.drawLine({ start: { x: MARGIN_SIDE + (i * colWidth), y: fromTop(104) }, end: { x: MARGIN_SIDE + (i * colWidth), y: fromTop(140) }, color: COLORS.navyLine, thickness: 0.5 });
       }
       page.drawText(cell[0], { x, y: metaYlbl, font: fontSansBold, size: 7, color: COLORS.navyFaint1 });
       page.drawText(cell[1], { x, y: metaYval, font: fontMono, size: 10, color: COLORS.navyFaint2 });
    });

    // 1.9 Rule 2
    page.drawLine({ start: { x: MARGIN_SIDE, y: fromTop(146) }, end: { x: rightEdge, y: fromTop(146) }, color: COLORS.navyLine, thickness: 0.5 });

    // 1.10 Address
    page.drawText("PICKUP ADDRESS", { x: MARGIN_SIDE, y: fromTop(157), font: fontSansBold, size: 7, color: COLORS.navyFaint1 });
    const addressStr = order.seller_locality ? `${sanitizeText(order.seller_locality)}, ${city}` : city;
    page.drawText(addressStr, { x: MARGIN_SIDE, y: fromTop(170), font: fontSans, size: 10, color: COLORS.white76 });

    // 1.11 Completed Pill
    const pillTw = fontSansBold.widthOfTextAtSize("COMPLETED", 8);
    const pillW = pillTw + 36;
    drawRoundedRect(page, rightEdge - pillW, fromTop(155), pillW, 18, 9, COLORS.teal);
    page.drawCircle({ x: rightEdge - pillW + 12, y: fromTop(155 + 9), size: 3, color: COLORS.white, borderColor: COLORS.white });
    page.drawText("COMPLETED", { x: rightEdge - pillW + 20, y: fromTop(155 + 12), font: fontSansBold, size: 8, color: COLORS.white });

    // SECTION 2 — BODY
    let curY = headerHeight + 32;
    
    // 2.1 Heading
    page.drawText("TRANSACTION PARTIES", { x: MARGIN_SIDE, y: fromTop(curY), font: fontSansBold, size: 7, color: COLORS.muted });
    const lblW = fontSansBold.widthOfTextAtSize("TRANSACTION PARTIES", 7);
    page.drawLine({ start: { x: MARGIN_SIDE + lblW + 10, y: fromTop(curY - 3) }, end: { x: rightEdge, y: fromTop(curY - 3) }, color: COLORS.border, thickness: 0.5 });
    curY += 16;

    // 2.2 Cards
    const cardW = (CONTENT_WIDTH - 16) / 2;
    const cardH = partyHeight;
    const sDetail = order.seller_locality ? `${sanitizeText(order.seller_locality)}\nSortt Verified Member` : `Sortt Verified Member`;

    // Seller
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), cardW, cardH, 8, COLORS.bg, COLORS.border, 0.5);
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), 3, cardH, 2, COLORS.navy); 
    page.drawText("SELLER", { x: MARGIN_SIDE + 16, y: fromTop(curY + 16), font: fontSansBold, size: 7, color: COLORS.navy });
    page.drawText("Scrap Seller", { x: MARGIN_SIDE + 16, y: fromTop(curY + 28), font: fontSans, size: 9, color: COLORS.muted });
    page.drawText(sanitizeText(order.seller_name), { x: MARGIN_SIDE + 16, y: fromTop(curY + 44), font: fontSansBold, size: 14, color: COLORS.navy });
    page.drawText(sDetail, { x: MARGIN_SIDE + 16, y: fromTop(curY + 58), font: fontSans, size: 9, color: COLORS.slate, lineHeight: 12 });

    // Buyer
    const bOff = MARGIN_SIDE + cardW + 16;
    drawRoundedRect(page, bOff, fromTop(curY), cardW, cardH, 8, COLORS.bg, COLORS.border, 0.5);
    drawRoundedRect(page, bOff, fromTop(curY), 3, cardH, 2, COLORS.teal); 
    page.drawText("BUYER", { x: bOff + 16, y: fromTop(curY + 16), font: fontSansBold, size: 7, color: COLORS.teal });
    page.drawText("Scrap Aggregator", { x: bOff + 16, y: fromTop(curY + 28), font: fontSans, size: 9, color: COLORS.muted });
    page.drawText(sanitizeText(order.aggregator_name), { x: bOff + 16, y: fromTop(curY + 44), font: fontSansBold, size: 14, color: COLORS.navy });
    page.drawText("KYC Verified · Sortt Certified Partner", { x: bOff + 16, y: fromTop(curY + 58), font: fontSans, size: 9, color: COLORS.slate });

    curY += cardH + 26;

    // 2.3 Heading
    page.drawText("COLLECTED MATERIALS", { x: MARGIN_SIDE, y: fromTop(curY), font: fontSansBold, size: 7, color: COLORS.muted });
    const lblMatW = fontSansBold.widthOfTextAtSize("COLLECTED MATERIALS", 7);
    page.drawLine({ start: { x: MARGIN_SIDE + lblMatW + 10, y: fromTop(curY - 3) }, end: { x: rightEdge, y: fromTop(curY - 3) }, color: COLORS.border, thickness: 0.5 });
    curY += 16;

    // 2.4 Table
    const c1 = CONTENT_WIDTH * 0.36;
    const c2 = CONTENT_WIDTH * 0.22;
    const c3 = CONTENT_WIDTH * 0.22;
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), CONTENT_WIDTH, tableHeaderHeight, 8, COLORS.navy, undefined, 0, {tl: true, tr: true, bl: false, br: false});
    
    let thY = curY + 18;
    page.drawText("MATERIAL", { x: MARGIN_SIDE + 18, y: fromTop(thY), font: fontSansBold, size: 7, color: COLORS.white65 });
    drawTextRight(page, "CONFIRMED WEIGHT", MARGIN_SIDE + c1 + c2 - 16, fromTop(thY), fontSansBold, 7, COLORS.white65);
    drawTextRight(page, "RATE PER KG", MARGIN_SIDE + c1 + c2 + c3 - 16, fromTop(thY), fontSansBold, 7, COLORS.white65);
    drawTextRight(page, "AMOUNT", rightEdge - 16, fromTop(thY), fontSansBold, 7, COLORS.white65);
    
    curY += tableHeaderHeight;

    // Table body
    for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        page.drawLine({ start: { x: MARGIN_SIDE, y: fromTop(curY) }, end: { x: rightEdge, y: fromTop(curY) }, color: COLORS.border, thickness: 0.5 });
        
        page.drawText(item.material_label, { x: MARGIN_SIDE + 18, y: fromTop(curY + 18), font: fontSansBold, size: 12, color: COLORS.navy });
        page.drawText(item.material_code, { x: MARGIN_SIDE + 18, y: fromTop(curY + 30), font: fontSans, size: 9, color: COLORS.muted });
        
        drawTextRight(page, `${item.confirmed_weight_kg.toFixed(2)} kg`, MARGIN_SIDE + c1 + c2 - 16, fromTop(curY + 24), fontMono, 11, COLORS.slate);
        drawTextRight(page, fmtAmount(item.rate_per_kg), MARGIN_SIDE + c1 + c2 + c3 - 16, fromTop(curY + 24), fontMono, 11, COLORS.amber);
        drawTextRight(page, fmtAmount(item.amount), rightEdge - 16, fromTop(curY + 24), fontMono, 12, COLORS.navy);

        curY += rowHeight;
    }

    // Table Footer
    page.drawLine({ start: { x: MARGIN_SIDE, y: fromTop(curY) }, end: { x: rightEdge, y: fromTop(curY) }, color: COLORS.border, thickness: 1 });
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), CONTENT_WIDTH, tableFooterHeight, 8, COLORS.bg, undefined, 0, {tl:false, tr:false, bl:true, br:true});
    
    page.drawText(`${lineItems.length} material type(s)  ·  Total collected weight: ${totalWeight.toFixed(2)} kg`, 
                 { x: MARGIN_SIDE + 18, y: fromTop(curY + 19), font: fontSans, size: 10, color: COLORS.slate });
    drawTextRight(page, fmtAmount(subtotal), rightEdge - 16, fromTop(curY + 19), fontSansBold, 12, COLORS.navy);
    
    curY += tableFooterHeight;
    // Outer border around whole table
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY - (tableHeaderHeight + tableRowsHeight + tableFooterHeight)), CONTENT_WIDTH, tableHeaderHeight + tableRowsHeight + tableFooterHeight, 8, undefined, COLORS.border, 0.5);

    curY += 26;

    // 2.5 Lower Grid
    const lwLeft = CONTENT_WIDTH - 284 - 20;
    page.drawText("ORDER DETAILS", { x: MARGIN_SIDE, y: fromTop(curY), font: fontSansBold, size: 7, color: COLORS.muted });
    page.drawText("AMOUNT", { x: rightEdge - 284, y: fromTop(curY), font: fontSansBold, size: 7, color: COLORS.muted });
    
    curY += 12;
    
    const detailsGridY = curY;
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), lwLeft, detailsHeight, 8, COLORS.bg, COLORS.border, 0.5);
    
    const dLeftData = [
       ["Order Reference", orderDisplayId],
       ["Invoice Number", invoiceNumber],
       ["Order Placed", `${formatDate(order.order_created_at)}`],
       ["Pickup Completed", `${formatDate(order.order_updated_at)}`],
       ["Total Weight", `${totalWeight.toFixed(2)} kg`],
       ["Materials Collected", `${lineItems.length} type(s)`],
       ["Payment Mode", "Cash on Pickup"]
    ];

    let rowY = curY;
    dLeftData.forEach((row, i) => {
        if (i > 0) page.drawLine({ start:{x:MARGIN_SIDE, y:fromTop(rowY)}, end:{x:MARGIN_SIDE+lwLeft, y:fromTop(rowY)}, color:COLORS.border, thickness:0.5 });
        page.drawText(row[0], { x: MARGIN_SIDE + 12, y: fromTop(rowY + 16), font: fontSans, size: 10, color: COLORS.muted });
        const valX = MARGIN_SIDE + lwLeft - 12;
        const col = i === 3 ? COLORS.teal : COLORS.navy;
        const font = (i < 5) ? fontMono : fontSansBold;
        drawTextRight(page, row[1], valX, fromTop(rowY + 16), font, 10, col);
        rowY += 24;
    });

    const dRightY = detailsGridY;
    const totalsH = 30 + 30 + 38;
    drawRoundedRect(page, rightEdge - 284, fromTop(dRightY), 284, totalsH, 8, COLORS.bg, COLORS.border, 0.5);
    page.drawText("Subtotal", { x: rightEdge - 284 + 16, y: fromTop(dRightY + 19), font: fontSans, size: 12, color: COLORS.slate });
    drawTextRight(page, fmtAmount(subtotal), rightEdge - 16, fromTop(dRightY + 19), fontMono, 12, COLORS.navy);
    
    page.drawLine({ start:{x:rightEdge-284, y:fromTop(dRightY+30)}, end:{x:rightEdge, y:fromTop(dRightY+30)}, color:COLORS.border, thickness:0.5 });
    page.drawText("Platform Fee", { x: rightEdge - 284 + 16, y: fromTop(dRightY + 30 + 19), font: fontSans, size: 12, color: COLORS.slate });
    drawTextRight(page, fmtAmount(platformFee), rightEdge - 16, fromTop(dRightY + 30 + 19), fontMono, 12, COLORS.navy);

    drawRoundedRect(page, rightEdge - 284, fromTop(dRightY + 60), 284, 38, 8, COLORS.navy, undefined, 0, {tl:false, tr:false, bl:true, br:true});
    page.drawText("Total Paid", { x: rightEdge - 284 + 16, y: fromTop(dRightY + 60 + 24), font: fontSansBold, size: 11, color: COLORS.white75 });
    drawTextRight(page, fmtAmount(totalAmount), rightEdge - 16, fromTop(dRightY + 60 + 26), fontMono, 18, COLORS.white);

    curY = Math.max(curY + detailsHeight, dRightY + totalsH) + 26;

    // 2.6 Banner
    drawRoundedRect(page, MARGIN_SIDE, fromTop(curY), CONTENT_WIDTH, bannerHeight, 8, COLORS.tealLight, COLORS.teal, 0.2);
    page.drawText("Payment Received by Seller", { x: MARGIN_SIDE + 24, y: fromTop(curY + 20), font: fontSansBold, size: 12, color: COLORS.teal });
    page.drawText(`Cash paid by ${sanitizeText(order.aggregator_name)} ${order.aggregator_business_name ? `— ${sanitizeText(order.aggregator_business_name)}` : ''}`, { x: MARGIN_SIDE + 24, y: fromTop(curY + 35), font: fontSans, size: 9.5, color: COLORS.slate });
    page.drawText(`${formatDate(order.order_updated_at)} at ${formatTime(order.order_updated_at)}  ·  Order ${orderDisplayId}`, { x: MARGIN_SIDE + 24, y: fromTop(curY + 47), font: fontSans, size: 9.5, color: COLORS.slate });

    // Banner right side: amount on the left, tick circle on the far right — no overlap
    const amountText = fmtAmount(totalAmount);
    const amountW = fontMono.widthOfTextAtSize(amountText, 24);
    const tickCX = rightEdge - 18;
    const tickCY = fromTop(curY + bannerHeight / 2);
    // Amount placed to the left of the tick circle with 14pt gap
    page.drawText(amountText, { x: tickCX - amountW - 22, y: fromTop(curY + bannerHeight / 2 + 9), font: fontMono, size: 24, color: COLORS.teal });
    // Tick circle
    page.drawCircle({ x: tickCX, y: tickCY, size: 12, color: COLORS.teal });
    page.drawLine({ start:{x: tickCX - 4, y: tickCY - 1 }, end:{x: tickCX - 1, y: tickCY - 4 }, color: COLORS.white, thickness: 1.8, lineCap: LineCapStyle.Round });
    page.drawLine({ start:{x: tickCX - 1, y: tickCY - 4 }, end:{x: tickCX + 5, y: tickCY + 4 }, color: COLORS.white, thickness: 1.8, lineCap: LineCapStyle.Round });

    // SECTION 3 — FOOTER
    drawRect(page, 0, fromTop(pageHeight - footerHeight), PAGE_WIDTH, footerHeight, COLORS.navy);
    
    const ftBrandX = MARGIN_SIDE;
    if (logoImage) {
      const ftLogoDims = logoImage.scaleToFit(footerHeight - 12, footerHeight - 16);
      page.drawImage(logoImage, {
        x: ftBrandX,
        y: fromTop(pageHeight - 6 - ftLogoDims.height),
        width: ftLogoDims.width,
        height: ftLogoDims.height,
      });
    } else {
      const fsW = fontSansBold.widthOfTextAtSize('S', 14);
      const fdW = fontSansBold.widthOfTextAtSize('.', 14);
      page.drawText('S', { x: ftBrandX, y: fromTop(pageHeight - 28), font: fontSansBold, size: 14, color: COLORS.white });
      page.drawText('.', { x: ftBrandX + fsW, y: fromTop(pageHeight - 28), font: fontSansBold, size: 14, color: COLORS.red });
      page.drawText('ortt', { x: ftBrandX + fsW + fdW, y: fromTop(pageHeight - 28), font: fontSansBold, size: 14, color: COLORS.white });
    }
    page.drawText('sortt.in · Hyderabad, India', { x: ftBrandX, y: fromTop(pageHeight - 12), font: fontSans, size: 9, color: COLORS.white36 });

    page.drawLine({ start:{x: 185, y: fromTop(pageHeight - 42)}, end:{x: 185, y: fromTop(pageHeight - 10)}, color: COLORS.white10, thickness:1 });
    page.drawLine({ start:{x: 400, y: fromTop(pageHeight - 42)}, end:{x: 400, y: fromTop(pageHeight - 10)}, color: COLORS.white10, thickness:1 });

    page.drawText('This is a system-generated invoice issued by Sortt.', { x: 200, y: fromTop(pageHeight - 26), font: fontSans, size: 9, color: COLORS.white34 });
    page.drawText('Please retain this document for your personal records.', { x: 200, y: fromTop(pageHeight - 14), font: fontSans, size: 9, color: COLORS.white34 });

    drawTextRight(page, "DISPUTES & SUPPORT", rightEdge, fromTop(pageHeight - 28), fontSansBold, 7, COLORS.white30);
    drawTextRight(page, "support@sortt.in", rightEdge, fromTop(pageHeight - 14), fontSans, 10, COLORS.white60);

    const pdfBuffer = await pdfDoc.save();

    console.log(`[Invoice] PDF generated (${pdfBuffer.length} bytes), uploading...`);

    const randomHex = crypto.randomBytes(8).toString('hex');
    const safeOrderNum = String(order.order_number || randomHex).replace(/[^a-zA-Z0-9_-]/g, '');
    const fileKey   = `invoices/${orderId}/${safeOrderNum}.pdf`;

    await storageProvider.uploadWithKey(Buffer.from(pdfBuffer), fileKey, process.env.R2_BUCKET_NAME);
    console.log(`[Invoice] Uploaded to ${fileKey}`);

    await query(
      `UPDATE invoices SET storage_path = $1 WHERE id = $2`,
      [fileKey, invoiceId]
    );

    console.log(`[Invoice] Done — order ${orderId} invoice stored at ${fileKey}`);
  } catch (err) {
    console.error(`[Invoice] GENERATION FAILED for order ${orderId}:`, err);
    Sentry.captureException(err);
    throw err;
  }
}

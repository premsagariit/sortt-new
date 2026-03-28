import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import puppeteer from 'puppeteer';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { storageProvider } from '../lib/storage';

// Strict sanitization to prevent XSS inside Puppeteer
const sanitizeText = (value: unknown): string =>
  sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const fmtAmount = (n: number) => `Rs. ${n.toFixed(2)}`;

// Formats: "27 Mar 2026"
const formatDate = (date: Date | string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// Formats: "10:30 AM"
const formatTime = (date: Date | string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }).toUpperCase();
};

/**
 * Loads a local TTF font and converts it to Base64 for Puppeteer injection
 */
const getBase64Font = (filename: string): string => {
  try {
    const fontPath = path.join(process.cwd(), 'assets', 'fonts', filename);
    const fontBuffer = fs.readFileSync(fontPath);
    return `data:font/ttf;base64,${fontBuffer.toString('base64')}`;
  } catch (error) {
    console.warn(`[Invoice] Warning: Could not load font ${filename}. Falling back to sans-serif.`);
    return '';
  }
};

export async function generateAndStoreInvoice(orderId: string): Promise<void> {
  try {
    console.log(`[Invoice] Starting professional generation for order ${orderId}`);

    // 1. Fetch Expanded Order Data
    const orderRes = await query(
      `SELECT o.id,
              o.order_number,
              o.order_display_id,
              o.confirmed_value,
              o.created_at,
              o.updated_at,
              o.pickup_address,
              u_seller.name AS seller_name,
              sp.account_type AS seller_profile_type,
              sp.locality AS seller_locality,
              sp.city_code AS seller_city_code,
              u_agg.name AS aggregator_name,
              ap.business_name AS aggregator_business_name,
              ap.operating_area AS aggregator_operating_area,
              ap.city_code AS aggregator_city_code,
              ap.aggregator_type,
              ap.kyc_status,
              COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'material_label', om.material_label,
                        'confirmed_weight_kg', om.confirmed_weight_kg,
                        'rate_per_kg', om.rate_per_kg,
                        'amount', om.amount
                    )
                ) FROM order_materials om WHERE om.order_id = o.id),
                '[]'::json
              ) AS line_items
       FROM orders o
       JOIN users u_seller ON o.seller_id = u_seller.id
       LEFT JOIN seller_profiles sp ON u_seller.id = sp.id
       JOIN users u_agg ON o.aggregator_id = u_agg.id
       LEFT JOIN aggregator_profiles ap ON u_agg.id = ap.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const data = orderRes.rows[0];
    const lineItems = data.line_items || [];

    // 2. Compute Financials & Fallbacks
    let subtotal = 0;
    let totalWeight = 0;
    let itemsHtml = '';

    for (const item of lineItems) {
      const weight = toNumber(item.confirmed_weight_kg);
      const rate = toNumber(item.rate_per_kg);
      const amt = toNumber(item.amount);
      
      subtotal += amt;
      totalWeight += weight;

      itemsHtml += `
        <tr>
          <td>
            <div class="material-name">${sanitizeText(item.material_label)}</div>
          </td>
          <td class="right"><span class="weight-val">${weight.toFixed(2)} kg</span></td>
          <td class="right"><span class="rate-val">${fmtAmount(rate)}</span></td>
          <td class="right">${fmtAmount(amt)}</td>
        </tr>
      `;
    }

    // Safety fallback
    if (subtotal === 0 && data.confirmed_value) {
      subtotal = toNumber(data.confirmed_value);
    }

    // 3. Construct the HTML String
    const dmSansBase64 = getBase64Font('DMSans-Regular.ttf');
    const dmMonoBase64 = getBase64Font('DMMono-Regular.ttf');
    
    // Address fallback if pickup_address column is null
    const displayAddress = sanitizeText(
      data.pickup_address || `${data.seller_locality}, ${data.seller_city_code}`
    );

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <style>
      /* Inject Local Fonts */
      @font-face {
        font-family: 'DM Sans';
        src: url('${dmSansBase64}') format('truetype');
        font-weight: 400;
      }
      @font-face {
        font-family: 'DM Mono';
        src: url('${dmMonoBase64}') format('truetype');
        font-weight: 400;
      }

      :root {
        --navy: #1C2E4A; --navy-soft: #2C4A72; --red: #C0392B; --amber: #B7791F;
        --amber-light: #FEF9EC; --teal: #1A6B63; --teal-light: #EAF5F4;
        --slate: #5C6B7A; --muted: #8E9BAA; --border: #DDE3EA; --bg: #F4F6F9;
        --surface: #FFFFFF;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--navy); padding: 40px; }
      .invoice-shell { width: 100%; max-width: 720px; background: var(--surface); border-radius: 16px; margin: 0 auto; overflow: hidden; }
      
      /* Header */
      .invoice-header { background: var(--navy); padding: 36px 40px 28px; position: relative; }
      .header-top { display: flex; justify-content: space-between; z-index: 1; position: relative; }
      .brand-name { font-size: 28px; font-weight: 700; color: #fff; }
      .brand-name span { color: var(--red); }
      .brand-tagline { font-size: 11px; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-top: 4px; }
      .invoice-badge { display: inline-block; background: var(--red); color: #fff; font-size: 10px; padding: 3px 10px; border-radius: 20px; margin-bottom: 6px; text-transform: uppercase; font-weight: bold; }
      .invoice-number { font-family: 'DM Mono', monospace; font-size: 18px; color: #fff; display: block; font-weight: bold; }
      .invoice-date { font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
      .header-divider { border-top: 1px solid rgba(255,255,255,0.10); margin: 24px 0 20px; border-bottom: none; border-left: none; border-right: none;}
      
      .header-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 40px; }
      .meta-item { display: flex; flex-direction: column; gap: 3px; }
      .meta-label { font-size: 10px; color: rgba(255,255,255,0.40); text-transform: uppercase; font-weight: bold;}
      .meta-value { font-family: 'DM Mono', monospace; font-size: 12.5px; color: rgba(255,255,255,0.85); }
      .meta-value.address { font-family: 'DM Sans', sans-serif; font-size: 12px; }
      
      .header-status-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
      .status-pill { background: var(--teal); color: #fff; font-size: 11px; padding: 5px 14px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }

      /* Body */
      .invoice-body { padding: 32px 40px; }
      .party-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
      .party-card { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; position: relative; }
      .party-card.seller { border-top: 3px solid var(--navy); }
      .party-card.aggregator { border-top: 3px solid var(--teal); }
      .party-role { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
      .party-sub-role { font-size: 11px; font-weight: bold; margin-bottom: 10px; color: var(--slate); }
      .party-card.seller .party-role { color: var(--navy); }
      .party-card.aggregator .party-role { color: var(--teal); }
      .party-name { font-size: 16px; font-weight: bold; color: var(--navy); }
      .party-detail { font-size: 12px; color: var(--slate); margin-top: 4px; line-height: 1.5; }

      .section-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
      .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
      
      /* Table */
      .items-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; }
      .items-table th { background: var(--navy); padding: 11px 12px; font-size: 10px; color: rgba(255,255,255,0.70); text-transform: uppercase; text-align: left; }
      .items-table th.right { text-align: right; }
      .items-table th:first-child { border-radius: 8px 0 0 8px; }
      .items-table th:last-child { border-radius: 0 8px 8px 0; }
      .items-table td { padding: 13px 12px; font-size: 13px; color: var(--navy); border-bottom: 1px solid var(--border); }
      .items-table td.right { text-align: right; font-family: 'DM Mono', monospace; }
      .material-name { font-size: 13.5px; font-weight: bold; }
      .weight-val { color: var(--slate); }
      .rate-val { color: var(--amber); }

      /* Totals */
      .totals-block { margin-left: auto; width: 280px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 28px; }
      .total-row { display: flex; justify-content: space-between; padding: 11px 18px; border-bottom: 1px solid var(--border); }
      .total-row:last-child { border-bottom: none; }
      .total-row.grand { background: var(--navy); padding: 14px 18px; color: #fff; }
      .total-row-label { font-size: 12px; color: var(--slate); }
      .total-row.grand .total-row-label { color: rgba(255,255,255,0.80); font-weight: bold; }
      .total-row-value { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: bold; }
      .total-row.grand .total-row-value { font-size: 18px; color: #fff; }

      /* Summary */
      .order-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
      .summary-cell { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
      .summary-cell.full-width { grid-column: 1 / -1; }
      .summary-cell-label { font-size: 10px; color: var(--muted); text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
      .summary-cell-value { font-size: 13px; font-weight: bold; }
      .summary-cell-value.mono { font-family: 'DM Mono', monospace; }
      .summary-cell-value.teal { color: var(--teal); }
      .summary-cell-value.amber { color: var(--amber); }

      /* Confirm Banner */
      .amount-confirm { background: var(--teal-light); border: 1px solid rgba(26,107,99,0.18); border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
      .amount-confirm-title { font-size: 13px; font-weight: bold; color: var(--teal); }
      .amount-confirm-sub { font-size: 11.5px; color: var(--slate); margin-top: 3px; }
      .amount-confirm-value { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: bold; color: var(--teal); }

      /* Footer */
      .invoice-footer { background: var(--bg); border-top: 1px solid var(--border); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
      .footer-brand { font-size: 12px; color: var(--muted); }
      .footer-brand strong { color: var(--navy); font-weight: bold; }
      .footer-legal { font-size: 10px; color: var(--muted); text-align: right; }
    </style>
    </head>
    <body>
    <div class="invoice-shell">
      <div class="invoice-header">
        <div class="header-top">
          <div>
            <div class="brand-name">S<span>.</span>ortt</div>
            <div class="brand-tagline">India's Scrap Marketplace · Hyderabad</div>
          </div>
          <div style="text-align: right;">
            <div class="invoice-badge">Order Invoice</div>
            <span class="invoice-number">INV-${new Date().getFullYear()}-${data.order_number || data.id.substring(0,6)}</span>
            <div class="invoice-date">${formatDate(new Date())}</div>
          </div>
        </div>
        <hr class="header-divider">
        <div class="header-meta">
          <div class="meta-item"><span class="meta-label">Order Reference</span><span class="meta-value">${sanitizeText(data.order_display_id)}</span></div>
          <div class="meta-item"><span class="meta-label">Invoice Number</span><span class="meta-value">INV-${new Date().getFullYear()}-${data.order_number || data.id.substring(0,6)}</span></div>
          <div class="meta-item"><span class="meta-label">Pickup Date</span><span class="meta-value">${formatDate(data.updated_at)}</span></div>
          <div class="meta-item"><span class="meta-label">Payment Mode</span><span class="meta-value">Cash on Pickup</span></div>
          <div class="meta-item" style="grid-column: 1 / -1;"><span class="meta-label">Pickup Address</span><span class="meta-value address">${displayAddress}</span></div>
        </div>
        <div class="header-status-row">
          <span style="font-size:11px; color:rgba(255,255,255,0.40); text-transform:uppercase; font-weight:bold;">Order Status</span>
          <div class="status-pill">Completed</div>
        </div>
      </div>

      <div class="invoice-body">
        <div class="party-row">
          <div class="party-card seller">
            <div class="party-role">Seller</div>
            <div class="party-sub-role">${sanitizeText(data.seller_profile_type || 'Scrap Seller')}</div>
            <div class="party-name">${sanitizeText(data.seller_name)}</div>
            <div class="party-detail">${sanitizeText(data.seller_locality)}, ${sanitizeText(data.seller_city_code)}<br>Sortt Verified Member</div>
          </div>
          <div class="party-card aggregator">
            <div class="party-role">Buyer</div>
            <div class="party-sub-role">${sanitizeText(data.aggregator_type || 'Scrap Aggregator')}</div>
            <div class="party-name">${sanitizeText(data.aggregator_name)}</div>
            <div class="party-detail">${sanitizeText(data.aggregator_business_name)}<br>${sanitizeText(data.kyc_status || 'KYC Verified')} · Sortt Certified</div>
          </div>
        </div>

        <div class="section-label">Collected Materials</div>
        <table class="items-table">
          <thead><tr><th>Material</th><th class="right">Weight (kg)</th><th class="right">Rate / kg</th><th class="right">Amount</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="totals-block">
          <div class="total-row"><span class="total-row-label">Subtotal</span><span class="total-row-value">${fmtAmount(subtotal)}</span></div>
          <div class="total-row"><span class="total-row-label">Platform Fee</span><span class="total-row-value">Rs. 0.00</span></div>
          <div class="total-row grand"><span class="total-row-label">Total Paid</span><span class="total-row-value">${fmtAmount(subtotal)}</span></div>
        </div>

        <div class="section-label">Order Summary</div>
        <div class="order-summary-grid">
          <div class="summary-cell"><div class="summary-cell-label">Materials</div><div class="summary-cell-value">${lineItems.length} type(s)</div></div>
          <div class="summary-cell"><div class="summary-cell-label">Total Weight</div><div class="summary-cell-value mono">${totalWeight.toFixed(2)} kg</div></div>
          <div class="summary-cell"><div class="summary-cell-label">Order Placed</div><div class="summary-cell-value mono">${formatDate(data.created_at)}</div></div>
          <div class="summary-cell"><div class="summary-cell-label">Pickup Completed</div><div class="summary-cell-value mono teal">${formatTime(data.updated_at)}</div></div>
          <div class="summary-cell full-width"><div class="summary-cell-label">Pickup Address</div><div class="summary-cell-value">${displayAddress}</div></div>
        </div>

        <div class="amount-confirm">
          <div>
            <div class="amount-confirm-title">Total Amount Paid to Seller</div>
            <div class="amount-confirm-sub">Cash collected by ${sanitizeText(data.aggregator_name)} · ${formatDate(data.updated_at)}</div>
          </div>
          <div class="amount-confirm-value">${fmtAmount(subtotal)}</div>
        </div>
      </div>

      <div class="invoice-footer">
        <div><div class="footer-brand"><strong>S.ortt</strong> · sortt.in</div></div>
        <div class="footer-legal">System-generated receipt.<br>For disputes, contact support@sortt.in</div>
      </div>
    </div>
    </body>
    </html>
    `;

    // 4. Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    await browser.close();

    console.log(`[Invoice] Professional PDF generated (${pdfBuffer.length} bytes), uploading...`);

    // 5. Upload to Cloudflare R2
    const randomHex = crypto.randomBytes(8).toString('hex');
    const fileKey = `invoices/${orderId}/${randomHex}.pdf`;

    await storageProvider.uploadWithKey(Buffer.from(pdfBuffer), fileKey, {
      contentType: 'application/pdf',
      metadata: { orderId, generatedAt: new Date().toISOString() },
    });

    console.log(`[Invoice] Successfully uploaded to ${fileKey}`);
  } catch (error) {
    console.error(`[Invoice] Generation failed for order ${orderId}:`, error);
    Sentry.captureException(error);
    throw error;
  }
}
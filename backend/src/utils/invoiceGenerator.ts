import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { storageProvider } from '../lib/storage';

/** Resolve the Chromium executable.
 *  Priority order:
 *  1. PUPPETEER_EXECUTABLE_PATH env var (manual override for any env)
 *  2. @sparticuz/chromium bundled binary (works on Azure App Service, Lambda, etc.)
 */
async function resolveBrowserExecutable(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // @sparticuz/chromium ships a pre-extracted Chromium binary — no post-install download needed.
  return chromium.executablePath();
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const sanitizeText = (value: unknown): string =>
  sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const fmtRs = (n: number) => `&#8377;${n.toFixed(2)}`;

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${dateStr}, ${timeStr}`;
};

// --------------------------------------------------------------------------
// HTML template builder — produces the full A4 invoice page
// --------------------------------------------------------------------------
function buildInvoiceHtml(data: {
  invoiceNumber: string;
  invoiceDate: string;
  orderDisplayId: string;        // e.g. #000011
  orderCreatedAt: string | null;
  orderCompletedAt: string | null;
  city: string;
  seller: { name: string; businessName: string; profileType: string; gstin: string | null; locality: string };
  aggregator: { name: string; businessName: string; operatingArea: string };
  lineItems: { materialLabel: string; materialCode: string; confirmedWeightKg: number; ratePerKg: number; amount: number }[];
  subtotal: number;
  platformFee: number;
  totalAmount: number;
}): string {
  const {
    invoiceNumber, invoiceDate, orderDisplayId, orderCreatedAt, orderCompletedAt,
    city, seller, aggregator, lineItems, subtotal, platformFee, totalAmount,
  } = data;

  const totalWeight = lineItems.reduce((s, i) => s + i.confirmedWeightKg, 0);
  const itemsHtml = lineItems.map(item => `
    <tr>
      <td>
        <div class="mat-name">${sanitizeText(item.materialLabel)}</div>
        <div class="mat-sub">${sanitizeText(item.materialCode)}</div>
      </td>
      <td><span class="w-val">${item.confirmedWeightKg.toFixed(2)} kg</span></td>
      <td><span class="r-val">${fmtRs(item.ratePerKg)}</span></td>
      <td><span class="a-val">${fmtRs(item.amount)}</span></td>
    </tr>
  `).join('');

  const sellerType = seller.profileType
    ? `Scrap Seller &nbsp;&middot;&nbsp; ${sanitizeText(seller.profileType)}`
    : 'Scrap Seller';
  const sellerDetail = [
    seller.locality ? sanitizeText(seller.locality) : '',
    'Sortt Verified Member',
  ].filter(Boolean).join('<br>');
  const sellerGstinRow = seller.gstin
    ? `<br><span style="font-size:10px;color:#8E9BAA;">GSTIN: ${sanitizeText(seller.gstin)}</span>`
    : '';

  const aggName = sanitizeText(aggregator.name);
  const aggBiz = aggregator.businessName ? ` <span style="font-size:11px;font-weight:400;color:#5C6B7A;">&nbsp;(${sanitizeText(aggregator.businessName)})</span>` : '';
  const aggDetail = [
    'KYC Verified &nbsp;&middot;&nbsp; Sortt Certified Partner',
    aggregator.operatingArea ? sanitizeText(aggregator.operatingArea) + ' Operating Area' : '',
  ].filter(Boolean).join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sortt — Order Invoice ${invoiceNumber}</title>
<style>/* Google Fonts omitted for server-side rendering — system fonts used */</style>
<style>

  :root {
    --navy:       #1C2E4A;
    --red:        #C0392B;
    --amber:      #B7791F;
    --amber-light:#FEF9EC;
    --teal:       #1A6B63;
    --teal-light: #EAF5F4;
    --slate:      #5C6B7A;
    --muted:      #8E9BAA;
    --border:     #DDE3EA;
    --bg:         #F4F6F9;
    --surface:    #FFFFFF;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #FFFFFF;
    color: var(--navy);
  }
  .invoice-shell {
    width: 210mm;
    min-height: 297mm;
    background: var(--surface);
    display: flex;
    flex-direction: column;
  }

  /* ── HEADER ── */
  .invoice-header {
    background: var(--navy);
    padding: 28px 36px 0;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .invoice-header::before {
    content:''; position:absolute; top:-70px; right:-70px;
    width:240px; height:240px; border-radius:50%;
    background:rgba(255,255,255,0.03);
  }
  .invoice-header::after {
    content:''; position:absolute; bottom:-50px; right:110px;
    width:150px; height:150px; border-radius:50%;
    background:rgba(255,255,255,0.02);
  }
  .header-brand-row {
    display:flex; align-items:flex-start; justify-content:space-between;
    position:relative; z-index:1; padding-bottom:22px;
  }
  .brand-name {
    font-size:34px; font-weight:700; color:#fff;
    letter-spacing:-1px; line-height:1;
  }
  .brand-name span { color:var(--red); }
  .brand-tagline {
    font-size:10px; color:rgba(255,255,255,0.40);
    letter-spacing:0.12em; text-transform:uppercase;
    margin-top:5px; font-weight:400;
  }
  .invoice-id-block { text-align:right; }
  .invoice-badge {
    display:inline-block; background:var(--red); color:#fff;
    font-size:9px; font-weight:700; letter-spacing:0.15em;
    text-transform:uppercase; padding:3px 12px; border-radius:20px; margin-bottom:7px;
  }
  .invoice-number {
    font-family:'Courier New',Courier,monospace; font-size:21px; font-weight:500;
    color:#fff; display:block; letter-spacing:0.02em;
  }
  .invoice-date-str {
    font-family:'Courier New',Courier,monospace; font-size:11px;
    color:rgba(255,255,255,0.48); display:block; margin-top:3px;
  }
  .header-meta-strip {
    display:grid; grid-template-columns:repeat(4,1fr);
    border-top:1px solid rgba(255,255,255,0.09);
    position:relative; z-index:1;
  }
  .meta-cell {
    padding:14px 20px 14px 0; border-right:1px solid rgba(255,255,255,0.07);
  }
  .meta-cell:not(:first-child) { padding-left:20px; }
  .meta-cell:last-child { border-right:none; }
  .meta-lbl {
    font-size:9px; color:rgba(255,255,255,0.36); letter-spacing:0.12em;
    text-transform:uppercase; font-weight:600; margin-bottom:4px;
  }
  .meta-val {
    font-family:'Courier New',Courier,monospace; font-size:11.5px;
    color:rgba(255,255,255,0.86); font-weight:400; line-height:1.4;
  }
  .header-address-row {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:24px; border-top:1px solid rgba(255,255,255,0.08);
    padding:14px 0 18px; position:relative; z-index:1;
  }
  .addr-lbl {
    font-size:9px; color:rgba(255,255,255,0.36); letter-spacing:0.12em;
    text-transform:uppercase; font-weight:600; margin-bottom:4px;
  }
  .addr-val { font-size:11.5px; color:rgba(255,255,255,0.78); line-height:1.5; }
  .status-pill {
    flex-shrink:0; background:var(--teal); color:#fff; font-size:10px;
    font-weight:700; letter-spacing:0.10em; text-transform:uppercase;
    padding:6px 16px; border-radius:20px; display:flex; align-items:center;
    gap:7px; margin-top:3px;
  }
  .status-pill::before {
    content:''; width:6px; height:6px; border-radius:50%;
    background:#5EFAD4; flex-shrink:0;
  }

  /* ── BODY ── */
  .invoice-body { padding:28px 36px 36px; flex:1; }
  .sec-head {
    font-size:9px; font-weight:700; letter-spacing:0.16em;
    text-transform:uppercase; color:var(--muted); margin-bottom:11px;
    display:flex; align-items:center; gap:10px;
  }
  .sec-head::after { content:''; flex:1; height:1px; background:var(--border); }
  .party-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:24px; }
  .party-card {
    background:var(--bg); border:1px solid var(--border);
    border-radius:10px; padding:16px 18px; display:flex; gap:13px; align-items:flex-start;
  }
  .party-card.seller { border-left:3px solid var(--navy); }
  .party-card.buyer  { border-left:3px solid var(--teal); }
  .p-icon {
    width:36px; height:36px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;
  }
  .party-card.seller .p-icon { background:rgba(28,46,74,0.08); }
  .party-card.buyer  .p-icon { background:var(--teal-light); }
  .p-role { font-size:9px; font-weight:700; letter-spacing:0.13em; text-transform:uppercase; margin-bottom:1px; }
  .party-card.seller .p-role { color:var(--navy); }
  .party-card.buyer  .p-role { color:var(--teal); }
  .p-type { font-size:10px; color:var(--muted); font-weight:400; margin-bottom:7px; }
  .p-name { font-size:15px; font-weight:700; color:var(--navy); line-height:1.2; margin-bottom:4px; }
  .p-detail { font-size:11px; color:var(--slate); line-height:1.55; }

  /* ── Items table ── */
  .table-wrap { border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:22px; }
  .items-table { width:100%; table-layout:fixed; border-collapse:collapse; }
  .items-table th {
    background:var(--navy); padding:10px 16px; font-size:9px; font-weight:600;
    letter-spacing:0.11em; text-transform:uppercase; color:rgba(255,255,255,0.62); text-align:left;
  }
  .items-table th:nth-child(1) { width:40%; }
  .items-table th:nth-child(2),.items-table th:nth-child(3),.items-table th:nth-child(4) { width:20%; text-align:right; }
  .items-table tbody tr { border-bottom:1px solid var(--border); }
  .items-table tbody tr:last-child { border-bottom:none; }
  .items-table tbody tr:nth-child(even) td { background:#FAFBFC; }
  .items-table td { padding:14px 16px; font-size:12.5px; color:var(--navy); vertical-align:middle; }
  .items-table td:nth-child(2),.items-table td:nth-child(3),.items-table td:nth-child(4) {
    text-align:right; font-family:'Courier New',Courier,monospace; font-size:12px; white-space:nowrap;
  }
  .mat-name { font-size:13px; font-weight:600; color:var(--navy); }
  .mat-sub  { font-size:10px; color:var(--muted); margin-top:2px; }
  .w-val    { color:var(--slate); }
  .r-val    { color:var(--amber); }
  .a-val    { color:var(--navy); font-weight:600; }
  .items-table tfoot tr { border-top:2px solid var(--border); }
  .items-table tfoot td { padding:12px 16px; font-size:12px; font-weight:600; color:var(--slate); }
  .items-table tfoot td:last-child {
    text-align:right; font-family:'Courier New',Courier,monospace; font-size:13px;
    color:var(--navy); font-weight:700;
  }

  /* ── Lower grid ── */
  .lower-grid { display:grid; grid-template-columns:1fr 240px; gap:14px; margin-bottom:22px; align-items:start; }
  .order-details-table { border:1px solid var(--border); border-radius:10px; overflow:hidden; width:100%; border-collapse:collapse; }
  .order-details-table tr { border-bottom:1px solid var(--border); }
  .order-details-table tr:last-child { border-bottom:none; }
  .order-details-table tr:nth-child(even) td { background:#FAFBFC; }
  .order-details-table td { padding:9px 16px; font-size:11.5px; vertical-align:top; }
  .order-details-table td:first-child { color:var(--muted); font-weight:500; width:45%; white-space:nowrap; }
  .order-details-table td:last-child  { color:var(--navy); font-weight:500; }
  .td-mono { font-family:'Courier New',Courier,monospace; font-size:11px; }
  .td-teal { color:var(--teal)!important; font-weight:600!important; }
  .totals-block { border:1px solid var(--border); border-radius:10px; overflow:hidden; }
  .t-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:11px 16px; border-bottom:1px solid var(--border); font-size:12px;
  }
  .t-row:last-child { border-bottom:none; }
  .t-row .lbl { color:var(--slate); }
  .t-row .val { font-family:'Courier New',Courier,monospace; font-size:12.5px; color:var(--navy); font-weight:500; }
  .t-row.grand { background:var(--navy); padding:14px 16px; }
  .t-row.grand .lbl { font-size:12px; font-weight:600; color:rgba(255,255,255,0.72); }
  .t-row.grand .val { font-size:21px; font-weight:700; color:#fff; }

  /* ── Payment banner ── */
  .payment-banner {
    background:var(--teal-light); border:1px solid rgba(26,107,99,0.18);
    border-radius:10px; padding:16px 24px; display:flex;
    align-items:center; justify-content:space-between; gap:20px;
  }
  .pb-title { font-size:13px; font-weight:700; color:var(--teal); }
  .pb-sub   { font-size:10.5px; color:var(--slate); margin-top:3px; }
  .pb-right { display:flex; align-items:center; gap:10px; }
  .pb-check {
    width:24px; height:24px; border-radius:50%; background:var(--teal);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .pb-amount { font-family:'Courier New',Courier,monospace; font-size:28px; font-weight:700; color:var(--teal); }

  /* ── FOOTER ── */
  .invoice-footer {
    background:var(--navy); padding:16px 36px; display:flex;
    align-items:center; justify-content:space-between; gap:20px;
    flex-shrink:0; margin-top:auto;
  }
  .ft-brand { font-size:15px; font-weight:700; color:#fff; letter-spacing:-0.3px; }
  .ft-brand span { color:var(--red); }
  .ft-sub { font-size:10px; color:rgba(255,255,255,0.38); margin-top:2px; letter-spacing:0.04em; }
  .ft-div { width:1px; height:32px; background:rgba(255,255,255,0.10); flex-shrink:0; }
  .ft-legal { font-size:10px; color:rgba(255,255,255,0.36); line-height:1.65; text-align:center; flex:1; }
  .ft-support { text-align:right; }
  .ft-sup-lbl { font-size:9px; color:rgba(255,255,255,0.32); letter-spacing:0.10em; text-transform:uppercase; font-weight:600; margin-bottom:3px; }
  .ft-sup-val { font-size:11px; color:rgba(255,255,255,0.62); }
</style>
</head>
<body>
<div class="invoice-shell">

  <!-- HEADER -->
  <div class="invoice-header">
    <div class="header-brand-row">
      <div>
        <div class="brand-name">S<span>.</span>ortt</div>
        <div class="brand-tagline">India's Scrap Marketplace &nbsp;&middot;&nbsp; ${sanitizeText(city)}</div>
      </div>
      <div class="invoice-id-block">
        <div class="invoice-badge">Order Invoice</div>
        <span class="invoice-number">${sanitizeText(invoiceNumber)}</span>
        <span class="invoice-date-str">${sanitizeText(invoiceDate)}</span>
      </div>
    </div>

    <div class="header-meta-strip">
      <div class="meta-cell">
        <div class="meta-lbl">Order Reference</div>
        <div class="meta-val">${sanitizeText(orderDisplayId)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-lbl">Pickup Date &amp; Time</div>
        <div class="meta-val">${sanitizeText(formatDateTime(orderCompletedAt))}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-lbl">Payment Mode</div>
        <div class="meta-val">Cash on Pickup</div>
      </div>
      <div class="meta-cell">
        <div class="meta-lbl">City</div>
        <div class="meta-val">${sanitizeText(city)}</div>
      </div>
    </div>

    <div class="header-address-row">
      <div>
        <div class="addr-lbl">Pickup Location</div>
        <div class="addr-val">${seller.locality ? sanitizeText(seller.locality) + ', ' : ''}${sanitizeText(city)}</div>
      </div>
      <div class="status-pill">Completed</div>
    </div>
  </div>

  <!-- BODY -->
  <div class="invoice-body">

    <!-- PARTIES -->
    <div class="sec-head">Transaction Parties</div>
    <div class="party-row">
      <div class="party-card seller">
        <div class="p-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7" r="4" stroke="#1C2E4A" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="#1C2E4A" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="p-info">
          <div class="p-role">Seller</div>
          <div class="p-type">${sellerType}</div>
          <div class="p-name">${sanitizeText(seller.name)}</div>
          <div class="p-detail">${sellerDetail}${sellerGstinRow}</div>
        </div>
      </div>

      <div class="party-card buyer">
        <div class="p-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l1-5h16l1 5" stroke="#1A6B63" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" stroke="#1A6B63" stroke-width="1.8"/>
            <path d="M5 11v8h14v-8" stroke="#1A6B63" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M9 19v-4h6v4" stroke="#1A6B63" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="p-info">
          <div class="p-role">Buyer</div>
          <div class="p-type">Scrap Aggregator &nbsp;&middot;&nbsp; Verified Shop</div>
          <div class="p-name">${aggName}${aggBiz}</div>
          <div class="p-detail">${aggDetail}</div>
        </div>
      </div>
    </div>

    <!-- COLLECTED MATERIALS -->
    <div class="sec-head">Collected Materials</div>
    <div class="table-wrap">
      <table class="items-table">
        <thead>
          <tr>
            <th>Material</th>
            <th style="text-align:right;">Confirmed Weight</th>
            <th style="text-align:right;">Rate per kg</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="color:var(--slate);font-weight:500;font-size:11.5px;">
              Total &mdash; ${lineItems.length} material type${lineItems.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; ${totalWeight.toFixed(2)} kg collected
            </td>
            <td>${fmtRs(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ORDER DETAILS + TOTALS -->
    <div class="lower-grid">
      <div>
        <div class="sec-head">Order Details</div>
        <table class="order-details-table">
          <tbody>
            <tr><td>Order Reference</td><td class="td-mono">${sanitizeText(orderDisplayId)}</td></tr>
            <tr><td>Invoice Number</td><td class="td-mono">${sanitizeText(invoiceNumber)}</td></tr>
            <tr><td>Order Placed</td><td class="td-mono">${sanitizeText(formatDateTime(orderCreatedAt))}</td></tr>
            <tr><td>Pickup Completed</td><td class="td-mono td-teal">${sanitizeText(formatDateTime(orderCompletedAt))}</td></tr>
            <tr><td>Total Weight</td><td class="td-mono">${totalWeight.toFixed(2)} kg</td></tr>
            <tr><td>Materials Count</td><td>${lineItems.length} material type${lineItems.length !== 1 ? 's' : ''}</td></tr>
            <tr><td>Payment Mode</td><td>Cash on Pickup</td></tr>
            ${seller.locality ? `<tr><td>Pickup Locality</td><td>${sanitizeText(seller.locality)}, ${sanitizeText(city)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div>
        <div class="sec-head">Amount</div>
        <div class="totals-block">
          <div class="t-row">
            <span class="lbl">Subtotal</span>
            <span class="val">${fmtRs(subtotal)}</span>
          </div>
          <div class="t-row">
            <span class="lbl">Platform Fee</span>
            <span class="val">${fmtRs(platformFee)}</span>
          </div>
          <div class="t-row grand">
            <span class="lbl">Total Paid</span>
            <span class="val">${fmtRs(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PAYMENT BANNER -->
    <div class="payment-banner">
      <div>
        <div class="pb-title">Payment Received by Seller</div>
        <div class="pb-sub">
          Cash paid by ${aggName}${aggregator.businessName ? ` (${sanitizeText(aggregator.businessName)})` : ''} &nbsp;&middot;&nbsp; ${sanitizeText(formatDate(orderCompletedAt))}
        </div>
      </div>
      <div class="pb-right">
        <div class="pb-check">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="pb-amount">${fmtRs(totalAmount)}</span>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="invoice-footer">
    <div>
      <div class="ft-brand">S<span>.</span>ortt</div>
      <div class="ft-sub">sortt.in &nbsp;&middot;&nbsp; India</div>
    </div>
    <div class="ft-div"></div>
    <div class="ft-legal">
      This is a system-generated invoice from Sortt.<br>
      Please retain this document for your records.
    </div>
    <div class="ft-div"></div>
    <div class="ft-support">
      <div class="ft-sup-lbl">Disputes &amp; Support</div>
      <div class="ft-sup-val">support@sortt.in</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// Main export — fetch order data, build HTML, render to PDF, upload to R2
// --------------------------------------------------------------------------
export async function generateAndStoreInvoice(orderId: string): Promise<void> {
  let browser: Awaited<ReturnType<typeof puppeteerCore.launch>> | null = null;

  try {
    console.log(`[Invoice] Starting professional generation for order ${orderId}`);

    const orderRes = await query(
      `SELECT o.id,
              o.order_number,
              o.confirmed_value,
              o.created_at        AS order_created_at,
              o.updated_at        AS order_updated_at,
              u_seller.name       AS seller_name,
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
                    'material_label',      mt.label_en,
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
       GROUP BY o.id, u_seller.name, sp.profile_type, sp.business_name, sp.gstin, sp.locality, sp.city_code,
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

    const numericPart = String(order.order_number || '').padStart(6, '0');
    const orderDisplayId = `#${numericPart}`;
    const invoiceNumber  = `INV-${new Date().getFullYear()}-${numericPart}`;
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
    const platformFee  = 0; // free during MVP
    const totalAmount  = Number((subtotal + platformFee).toFixed(2));

    const city = sanitizeText(order.aggregator_city_code || order.seller_city_code || 'India');

    // ── Persist DB record ──
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

    console.log(`[Invoice] DB record created id=${invoiceId}, generating PDF via Puppeteer...`);

    // ── Build HTML & render PDF ──
    const html = buildInvoiceHtml({
      invoiceNumber,
      invoiceDate,
      orderDisplayId,
      orderCreatedAt:   order.order_created_at ?? null,
      orderCompletedAt: order.order_updated_at ?? null,
      city,
      seller: {
        name:        sanitizeText(order.seller_name),
        businessName: sanitizeText(order.seller_business_name),
        profileType:  sanitizeText(order.profile_type),
        gstin:        sellerGstin,
        locality:     sanitizeText(order.seller_locality),
      },
      aggregator: {
        name:          sanitizeText(order.aggregator_name),
        businessName:  sanitizeText(order.aggregator_business_name),
        operatingArea: sanitizeText(order.aggregator_operating_area),
      },
      lineItems: lineItems.map((i: { material_label: string; material_code: string; confirmed_weight_kg: number; rate_per_kg: number; amount: number }) => ({
        materialLabel:      i.material_label,
        materialCode:       i.material_code,
        confirmedWeightKg: i.confirmed_weight_kg,
        ratePerKg:         i.rate_per_kg,
        amount:            i.amount,
      })),
      subtotal,
      platformFee,
      totalAmount,
    });

    const executablePath = await resolveBrowserExecutable();
    browser = await puppeteerCore.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
      defaultViewport: { width: 1200, height: 1754 }, // A4 @ 144 dpi
      headless: true,
      executablePath,
    });

    const page = await browser.newPage();

    // Block external network requests (Google Fonts, analytics, etc.) to prevent hangs.
    // All assets are now inlined or use system fonts.
    await page.setRequestInterception(true);
    page.on('request', (req: import('puppeteer-core').HTTPRequest) => {
      const url = req.url();
      // Abort requests to external domains — only allow data URIs and about:blank
      if (url.startsWith('http://') || url.startsWith('https://')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Use domcontentloaded — no external resources to wait for
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    console.log(`[Invoice] PDF generated (${pdfBuffer.length} bytes), uploading...`);

    // ── Upload to R2 ──
    const randomHex = crypto.randomBytes(8).toString('hex');
    const fileKey   = `invoices/${orderId}/${randomHex}.pdf`;

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
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

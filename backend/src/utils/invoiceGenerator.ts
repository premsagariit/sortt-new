import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { storageProvider } from '../lib/storage';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const sanitizeText = (value: unknown): string =>
  sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export async function generateAndStoreInvoice(orderId: string): Promise<void> {
  try {
    const orderRes = await query(
      `SELECT o.id,
              o.order_number,
              o.confirmed_value,
              u_seller.name AS seller_name,
              sp.profile_type,
              sp.business_name AS seller_business_name,
              sp.gstin AS seller_gstin,
              sp.locality AS seller_locality,
              sp.city_code AS seller_city_code,
              u_agg.name AS aggregator_name,
              ap.business_name AS aggregator_business_name,
              ap.operating_area AS aggregator_operating_area,
              ap.city_code AS aggregator_city_code,
              COALESCE(
                json_agg(
                  json_build_object(
                    'material_code', oi.material_code,
                    'material_label', mt.label_en,
                    'confirmed_weight_kg', COALESCE(oi.confirmed_weight_kg, 0),
                    'rate_per_kg', COALESCE(oi.rate_per_kg, 0),
                    'amount', COALESCE(oi.amount, 0)
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
      return;
    }

    const order = orderRes.rows[0];
    const confirmedTotal = toNumber(order.confirmed_value);
    const sellerGstin = order.seller_gstin ? String(order.seller_gstin).trim().toUpperCase() : null;

    if (!sellerGstin && confirmedTotal <= 50000) {
      return;
    }

    if (sellerGstin && !GSTIN_REGEX.test(sellerGstin)) {
      Sentry.captureMessage(`Invalid GSTIN for order ${orderId}: ${sellerGstin}`, 'warning');
      return;
    }

    const orderDisplayId = `#${String(order.order_number || '').padStart(6, '0')}`;
    const numericPart = orderDisplayId.replace('#', '').padStart(6, '0');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${numericPart}`;

    const lineItemsRaw = Array.isArray(order.line_items) ? order.line_items : [];
    const lineItems = lineItemsRaw.map((item: any) => ({
      material_code: sanitizeText(item.material_code),
      material_label: sanitizeText(item.material_label || item.material_code),
      confirmed_weight_kg: toNumber(item.confirmed_weight_kg),
      rate_per_kg: toNumber(item.rate_per_kg),
      amount: toNumber(item.amount),
    }));

    const subtotal = lineItems.reduce((sum: number, item: any) => sum + toNumber(item.amount), 0) || confirmedTotal;
    const cgst = Number((subtotal * 0.09).toFixed(2));
    const sgst = Number((subtotal * 0.09).toFixed(2));
    const totalAmount = Number((subtotal + cgst + sgst).toFixed(2));

    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      seller: {
        name: sanitizeText(order.seller_name),
        profile_type: sanitizeText(order.profile_type),
        business_name: sanitizeText(order.seller_business_name),
        gstin: sellerGstin,
        locality: sanitizeText(order.seller_locality),
        city_code: sanitizeText(order.seller_city_code),
      },
      aggregator: {
        name: sanitizeText(order.aggregator_name),
        business_name: sanitizeText(order.aggregator_business_name),
        operating_area: sanitizeText(order.aggregator_operating_area),
        city_code: sanitizeText(order.aggregator_city_code),
      },
      line_items: lineItems,
      subtotal,
      cgst_9_percent: cgst,
      sgst_9_percent: sgst,
      total_amount: totalAmount,
      order_display_id: orderDisplayId,
    };

    const insertRes = await query(
      `INSERT INTO invoices (order_id, seller_gstin, aggregator_details, total_amount, invoice_data)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
       ON CONFLICT (order_id) DO UPDATE SET
         seller_gstin = EXCLUDED.seller_gstin,
         aggregator_details = EXCLUDED.aggregator_details,
         total_amount = EXCLUDED.total_amount,
         invoice_data = EXCLUDED.invoice_data
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
      return;
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    let y = 800;
    const draw = (text: string, x: number, size = 11) => {
      page.drawText(sanitizeText(text), { x, y, size, font });
      y -= size + 6;
    };

    draw(`${sanitizeText(process.env.APP_NAME || 'APP')} TAX INVOICE`, 40, 16);
    draw(`Invoice: ${invoiceNumber}`, 40);
    draw(`Date: ${invoiceData.invoice_date}`, 40);
    y -= 4;
    draw(`Seller: ${invoiceData.seller.name}`, 40);
    draw(`Seller GSTIN: ${invoiceData.seller.gstin || 'N/A'}`, 40);
    draw(`Aggregator: ${invoiceData.aggregator.name}`, 40);
    draw(`Aggregator Business: ${invoiceData.aggregator.business_name || 'N/A'}`, 40);
    y -= 8;
    draw('Line Items', 40, 12);

    for (const item of lineItems) {
      draw(
        `${item.material_label} | ${item.confirmed_weight_kg.toFixed(2)} kg | ₹${item.rate_per_kg.toFixed(2)}/kg | ₹${item.amount.toFixed(2)}`,
        40,
        10
      );
    }

    y -= 8;
    draw(`Subtotal: ₹${subtotal.toFixed(2)}`, 40);
    draw(`CGST 9%: ₹${cgst.toFixed(2)}`, 40);
    draw(`SGST 9%: ₹${sgst.toFixed(2)}`, 40);
    draw(`Total: ₹${totalAmount.toFixed(2)}`, 40, 12);

    const pdfBytes = await pdf.save();

    const randomHex = crypto.randomBytes(8).toString('hex');
    const fileKey = `invoices/${orderId}/${randomHex}.pdf`;

    await storageProvider.uploadWithKey(Buffer.from(pdfBytes), fileKey, process.env.R2_BUCKET_NAME);

    await query(
      `UPDATE invoices SET storage_path = $1 WHERE id = $2`,
      [fileKey, invoiceId]
    );
  } catch (err) {
    Sentry.captureException(err);
  }
}

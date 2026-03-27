// Quick test: can we generate a PDF with the rupee symbol using pdf-lib + Helvetica?
const { PDFDocument, StandardFonts } = require('pdf-lib');

async function test() {
  try {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    // This should fail: ₹ is not in the Helvetica (Latin-1) charset
    page.drawText('Total: ₹175.00', { x: 40, y: 700, size: 12, font });
    
    const bytes = await pdf.save();
    console.log('PDF generated OK, size:', bytes.length);
  } catch (err) {
    console.error('PDF generation FAILED:', err.message);
    console.error('This confirms the rupee symbol bug in invoiceGenerator.ts');
  }
}

test();

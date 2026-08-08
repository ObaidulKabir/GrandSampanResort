import PDFDocument = require('pdfkit');

export type InvoiceData = {
  invoiceNo: string;
  issuedAt: Date;
  bookingId: string;
  buyerName: string;
  buyerEmail: string;
  buyerContact: string;
  buyerNid: string;
  buyerAddress: string;
  planName: string;
  planId: string;
  suiteId: string;
  totalPrice: number;
  depositAmount: number;
  depositMethod: string;
  depositReference: string;
  currency?: string;
};

function money(amount: number, currency = 'BDT') {
  const n = Math.round(Number(amount) || 0);
  return `${currency} ${n.toLocaleString('en-BD')}`;
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    cheque: 'Cheque',
    cash_payorder: 'Cash / pay order',
    online_transfer: 'Online bank transfer',
  };
  return map[method] || method || '—';
}

/** Build a simple deposit invoice PDF buffer. */
export function buildDepositInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = data.currency || 'BDT';

    doc.fontSize(20).text('Grand Sampan Resort', { align: 'left' });
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#444').text('Investment share plan — deposit invoice');
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(12).text(`Invoice: ${data.invoiceNo}`);
    doc.fontSize(10).text(`Issued: ${data.issuedAt.toISOString().slice(0, 10)}`);
    doc.text(`Booking: ${data.bookingId}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Bill to');
    doc.fontSize(10).fillColor('#222');
    doc.text(data.buyerName || '—');
    doc.text(data.buyerEmail || '—');
    doc.text(data.buyerContact || '—');
    if (data.buyerNid) doc.text(`NID: ${data.buyerNid}`);
    if (data.buyerAddress) doc.text(data.buyerAddress, { width: 280 });
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(12).text('Plan details');
    doc.fontSize(10).fillColor('#222');
    doc.text(`Plan: ${data.planName || data.planId}`);
    doc.text(`Plan ID: ${data.planId}`);
    doc.text(`Unit: ${data.suiteId}`);
    doc.text(`Total plan price: ${money(data.totalPrice, currency)}`);
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(12).text('Deposit (booking amount)');
    doc.fontSize(10).fillColor('#222');
    doc.text(`Amount: ${money(data.depositAmount, currency)}`);
    doc.text(`Method: ${methodLabel(data.depositMethod)}`);
    doc.text(`Reference: ${data.depositReference || '—'}`);
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor('#000').text(`Amount due / received: ${money(data.depositAmount, currency)}`, {
      underline: false,
    });
    doc.moveDown(2);

    doc.fontSize(9).fillColor('#666').text(
      'This invoice acknowledges the 10% booking deposit for the share plan above. Remaining balance follows the agreed payment schedule (downpayment and installments). For questions contact admin@grandsampanresort.com.',
      { width: 500 }
    );

    doc.end();
  });
}

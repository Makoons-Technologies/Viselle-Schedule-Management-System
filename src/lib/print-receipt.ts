import { formatCurrency } from '@/lib/utils';
import type { ReceiptSnapshot } from '@/types/api';

function copyHtml(receipt: ReceiptSnapshot, label: string): string {
  const lines = receipt.lineItems
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.description)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}</td><td class="amt">${formatCurrency(line.lineTotalCents)}</td></tr>`,
    )
    .join('');
  return `
    <section class="copy">
      <p class="label">${escapeHtml(label)}</p>
      <h1>${escapeHtml(receipt.organizationName)}</h1>
      <p class="muted">${escapeHtml(receipt.customerName)}</p>
      <table>${lines}</table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="amt">${formatCurrency(receipt.subtotalCents)}</td></tr>
        <tr><td>Tip</td><td class="amt">${formatCurrency(receipt.tipCents)}</td></tr>
        <tr class="total"><td>Total</td><td class="amt">${formatCurrency(receipt.totalCents)}</td></tr>
      </table>
      <p class="muted">${new Date(receipt.paidAt).toLocaleString()}</p>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Opens a compact customer + merchant receipt in a print window. */
export function printReceiptCopies(receipt: ReceiptSnapshot): boolean {
  const popup = window.open('', '_blank', 'width=420,height=720');
  if (!popup) return false;
  popup.document.write(`<!doctype html>
<html>
<head>
  <title>Receipt</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 16px; color: #1c1917; }
    .copy { max-width: 280px; margin: 0 auto 24px; }
    .label { letter-spacing: 0.14em; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    h1 { font-size: 18px; margin: 4px 0 2px; }
    .muted { color: #78716c; font-size: 12px; margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 3px 0; vertical-align: top; }
    .amt { text-align: right; white-space: nowrap; }
    .totals { margin-top: 8px; border-top: 1px solid #d6d3d1; }
    .total { font-weight: 700; font-size: 15px; }
    @media print { .copy + .copy { break-before: page; } }
  </style>
</head>
<body>
  ${copyHtml(receipt, 'Customer copy')}
  ${copyHtml(receipt, 'Merchant copy')}
</body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

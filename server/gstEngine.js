/**
 * GST Calculation & Compliance Engine for Tamil Nadu Grocery Stores
 * State Code: 33 (Tamil Nadu)
 */

const TN_STATE_CODE = '33';

/**
 * Calculates GST components for an item
 * @param {Object} params
 * @param {number} params.unitPrice - Unit price
 * @param {number} params.quantity - Quantity
 * @param {number} params.discountPercent - Discount percent (0-100)
 * @param {number} params.gstRate - Total GST rate (0, 5, 12, 18, 28)
 * @param {boolean} params.isTaxInclusive - Whether price includes GST (Standard in Grocery MRP)
 * @param {string} params.placeOfSupply - Customer State Code (Default '33')
 */
function calculateItemGst({
  unitPrice,
  quantity,
  discountPercent = 0,
  gstRate = 0,
  isTaxInclusive = true,
  placeOfSupply = '33'
}) {
  const isInterState = placeOfSupply && !placeOfSupply.startsWith(TN_STATE_CODE);
  
  // Gross line amount before tax breakdown
  const linePrice = unitPrice * quantity;
  const discountAmount = Number(((linePrice * discountPercent) / 100).toFixed(2));
  const effectiveLineTotal = Number((linePrice - discountAmount).toFixed(2));

  let taxableValue = 0;
  let totalTax = 0;

  if (isTaxInclusive) {
    if (gstRate === 0) {
      taxableValue = effectiveLineTotal;
      totalTax = 0;
    } else {
      // Back-calculate taxable value: Taxable = Gross / (1 + Rate / 100)
      taxableValue = Number((effectiveLineTotal / (1 + (gstRate / 100))).toFixed(2));
      totalTax = Number((effectiveLineTotal - taxableValue).toFixed(2));
    }
  } else {
    // Tax exclusive: Tax = Taxable * Rate / 100
    taxableValue = effectiveLineTotal;
    totalTax = Number(((taxableValue * gstRate) / 100).toFixed(2));
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = gstRate;
    igstAmount = totalTax;
  } else {
    // Intra-state (Within Tamil Nadu): Equal split of CGST and SGST
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    // Handle odd cents/paise split precisely
    cgstAmount = Number((totalTax / 2).toFixed(2));
    sgstAmount = Number((totalTax - cgstAmount).toFixed(2));
  }

  const finalTotal = isTaxInclusive
    ? effectiveLineTotal
    : Number((taxableValue + totalTax).toFixed(2));

  return {
    linePrice,
    discountAmount,
    taxableValue,
    gstRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    total: finalTotal
  };
}

/**
 * Calculates complete bill totals with rounding off as per Section 170 CGST Act
 */
function calculateBillTotals(items, options = {}) {
  let subtotalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalDiscount = 0;
  let grossAmount = 0;

  for (const item of items) {
    subtotalTaxable += Number(item.taxable_value || 0);
    totalCgst += Number(item.cgst_amount || 0);
    totalSgst += Number(item.sgst_amount || 0);
    totalIgst += Number(item.igst_amount || 0);
    totalDiscount += Number(item.discount_amount || 0);
    grossAmount += Number(item.total || 0);
  }

  subtotalTaxable = Number(subtotalTaxable.toFixed(2));
  totalCgst = Number(totalCgst.toFixed(2));
  totalSgst = Number(totalSgst.toFixed(2));
  totalIgst = Number(totalIgst.toFixed(2));
  totalDiscount = Number(totalDiscount.toFixed(2));
  grossAmount = Number(grossAmount.toFixed(2));

  // Additional bill-level discount if any
  const billDiscount = Number(options.additionalDiscount || 0);
  const netBeforeRound = Math.max(0, grossAmount - billDiscount);

  // Round off to nearest rupee
  const roundedGrandTotal = Math.round(netBeforeRound);
  const roundOff = Number((roundedGrandTotal - netBeforeRound).toFixed(2));

  return {
    subtotalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax: Number((totalCgst + totalSgst + totalIgst).toFixed(2)),
    totalDiscount: Number((totalDiscount + billDiscount).toFixed(2)),
    grossAmount,
    roundOff,
    grandTotal: roundedGrandTotal
  };
}

/**
 * Generate HSN summary table required on GST Invoices
 */
function generateHsnSummary(items) {
  const summaryMap = {};

  for (const item of items) {
    const hsn = item.hsn_code || 'OTHER';
    const rate = item.gst_rate || 0;
    const key = `${hsn}_${rate}`;

    if (!summaryMap[key]) {
      summaryMap[key] = {
        hsn_code: hsn,
        gst_rate: rate,
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_tax: 0,
        total_value: 0
      };
    }

    summaryMap[key].taxable_value += Number(item.taxable_value || 0);
    summaryMap[key].cgst_amount += Number(item.cgst_amount || 0);
    summaryMap[key].sgst_amount += Number(item.sgst_amount || 0);
    summaryMap[key].igst_amount += Number(item.igst_amount || 0);
    summaryMap[key].total_tax += Number((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0));
    summaryMap[key].total_value += Number(item.total || 0);
  }

  // Format to 2 decimal places
  return Object.values(summaryMap).map(row => ({
    hsn_code: row.hsn_code,
    gst_rate: row.gst_rate,
    taxable_value: Number(row.taxable_value.toFixed(2)),
    cgst_amount: Number(row.cgst_amount.toFixed(2)),
    sgst_amount: Number(row.sgst_amount.toFixed(2)),
    igst_amount: Number(row.igst_amount.toFixed(2)),
    total_tax: Number(row.total_tax.toFixed(2)),
    total_value: Number(row.total_value.toFixed(2))
  }));
}

/**
 * Formats amount into Indian numbering system: 1,23,456.78
 */
function formatIndianCurrency(amount) {
  const num = Number(amount || 0).toFixed(2);
  const [integerPart, decimalPart] = num.split('.');
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedInt = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree 
    : lastThree;
  return `₹ ${formattedInt}.${decimalPart}`;
}

/**
 * Number to Words in Indian English (e.g. for A4 Tax Invoice footer)
 */
function numberToWordsINR(amount) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num) {
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  }

  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';
  return `${inWords(rounded)} Rupees Only`;
}

module.exports = {
  TN_STATE_CODE,
  calculateItemGst,
  calculateBillTotals,
  generateHsnSummary,
  formatIndianCurrency,
  numberToWordsINR
};

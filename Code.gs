/**
 * KAILU CREATION — Google Sheets + Email order receiver.
 * 1. Create a Google Sheet and copy its ID.
 * 2. Paste this code in Extensions > Apps Script.
 * 3. Set STORE_EMAIL and SHEET_ID below.
 * 4. Deploy as Web app; Execute as Me; Who has access: Anyone.
 * 5. Copy the /exec URL into GOOGLE_SCRIPT_URL in the website's script.js.
 */
const STORE_EMAIL = "YOUR_EMAIL@example.com";
const SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "Orders";

function doGet() {
  return ContentService.createTextOutput("KAILU CREATION order endpoint is running.");
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const required = ["customerName", "size", "houseBuilding", "roadArea", "pincode", "city", "state", "total", "items"];
    const missing = required.filter(k => !String(p[k] || "").trim());
    if (missing.length) return output_({ok:false, message:"Missing fields: " + missing.join(", ")});
    if (!/^\d{6}$/.test(String(p.pincode))) return output_({ok:false, message:"Invalid pincode"});

    const items = JSON.parse(p.items);
    const orderId = "KC-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
    const timestamp = new Date();
    const itemSummary = items.map(i => `${i.productName} | Size ${i.size} | Qty ${i.quantity} | ₹${i.lineTotal}`).join("\n");
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["Timestamp","Order ID","Customer Name","Items","Size","House No. / Building","Road / Area / Colony","Pincode","City","State","Payment Method","Total (INR)","Order Status"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      timestamp, orderId, safeCell_(p.customerName), itemSummary, p.size,
      safeCell_(p.houseBuilding), safeCell_(p.roadArea), p.pincode,
      safeCell_(p.city), safeCell_(p.state), "Cash on Delivery (COD)",
      Number(p.total), "New"
    ]);

    const body = [
      "New order received for KAILU CREATION", "",
      "Order ID: " + orderId,
      "Customer: " + p.customerName,
      "Items:", itemSummary, "",
      "Size: " + p.size,
      "House No. / Building Name: " + p.houseBuilding,
      "Road Name / Area / Colony: " + p.roadArea,
      "Pincode: " + p.pincode,
      "City: " + p.city,
      "State: " + p.state,
      "Payment: Cash on Delivery (COD)",
      "Total: ₹" + p.total, "",
      "Please confirm stock, delivery and COD availability."
    ].join("\n");
    if (STORE_EMAIL && STORE_EMAIL.indexOf("@") > 0 && STORE_EMAIL !== "YOUR_EMAIL@example.com") {
      MailApp.sendEmail(STORE_EMAIL, `New KAILU CREATION order ${orderId} — ₹${p.total}`, body);
    }
    return output_({ok:true, orderId});
  } catch (err) {
    console.error(err);
    return output_({ok:false, message:String(err)});
  }
}

function safeCell_(value) {
  const s = String(value || "");
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function output_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure data folder exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'grocery_gst.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency & speed
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS subgroups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    hsn_code TEXT NOT NULL,
    unit TEXT DEFAULT 'kg',
    cost_price REAL DEFAULT 0,
    selling_price REAL NOT NULL,
    mrp REAL,
    discount_percent REAL DEFAULT 0,
    gst_rate REAL NOT NULL DEFAULT 5,
    cess_rate REAL DEFAULT 0,
    stock_quantity REAL DEFAULT 100,
    min_stock_alert REAL DEFAULT 10,
    is_loose_item INTEGER DEFAULT 0,
    is_quick_item INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    state_code TEXT DEFAULT '33',
    credit_balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_gstin TEXT,
    place_of_supply TEXT DEFAULT '33-Tamil Nadu',
    is_inter_state INTEGER DEFAULT 0,
    payment_mode TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    subtotal_taxable REAL NOT NULL,
    total_cgst REAL NOT NULL,
    total_sgst REAL NOT NULL,
    total_igst REAL DEFAULT 0,
    total_cess REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    round_off REAL DEFAULT 0,
    grand_total REAL NOT NULL,
    received_amount REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    notes TEXT,
    bill_type TEXT DEFAULT 'tax_invoice',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER,
    barcode TEXT,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    mrp REAL,
    discount_percent REAL DEFAULT 0,
    taxable_value REAL NOT NULL,
    gst_rate REAL NOT NULL,
    cgst_rate REAL NOT NULL,
    cgst_amount REAL NOT NULL,
    sgst_rate REAL NOT NULL,
    sgst_amount REAL NOT NULL,
    igst_rate REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    cess_rate REAL DEFAULT 0,
    cess_amount REAL DEFAULT 0,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    invoice_id INTEGER,
    type TEXT NOT NULL, -- 'debit' (credit purchase), 'credit' (payment received)
    amount REAL NOT NULL,
    notes TEXT,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' or 'user'
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure bill_type column exists on invoices table
try {
  db.exec("ALTER TABLE invoices ADD COLUMN bill_type TEXT DEFAULT 'tax_invoice';");
} catch (e) {
  // Column already exists
}

// Migration: Ensure subgroup_id column exists on products table
try {
  db.exec("ALTER TABLE products ADD COLUMN subgroup_id INTEGER REFERENCES subgroups(id);");
} catch (e) {
  // Column already exists
}

// Seed default users (Root, Admin, Staff)
const userCount = db.prepare('SELECT count(*) as count FROM users').get();
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)');
  insertUser.run('root', 'root123', 'root', 'Master Root Admin');
  insertUser.run('admin', 'admin123', 'admin', 'Administrator');
  insertUser.run('user', 'user123', 'user', 'Billing Staff');
} else {
  // Ensure root user exists
  const rootExists = db.prepare('SELECT id FROM users WHERE username = ?').get('root');
  if (!rootExists) {
    db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('root', 'root123', 'root', 'Master Root Admin');
  }
}

// Seed default settings if empty
const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const defaultSettings = [
    ['shop_name_en', ''],
    ['shop_name_ta', ''],
    ['gstin', ''],
    ['fssai_no', ''],
    ['address_en', ''],
    ['address_ta', ''],
    ['phone', ''],
    ['email', ''],
    ['state', 'Tamil Nadu'],
    ['state_code', '33'],
    ['bill_prefix', 'BILL/'],
    ['next_bill_number', '1001'],
    ['upi_id', ''],
    ['thermal_printer_width', '80mm'],
    ['default_language', 'ta'], // 'ta' or 'en'
    ['print_language', 'bilingual'], // 'bilingual', 'ta', 'en'
    ['print_mode', 'thermal'], // 'thermal' or 'a4'
    ['tax_inclusive_pricing', '1'], // 1: Prices include GST, 0: Prices exclude GST
    ['receipt_tagline_ta', ''],
    ['receipt_tagline_en', ''],
    ['receipt_footer_ta', 'நன்றி! மீண்டும் வருக!'],
    ['receipt_footer_en', 'Thank you! Visit again!'],
    ['terms_ta', ''],
    ['terms_en', '']
  ];

  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }
} else {
  // Wipe any previously seeded dummy shop details so the user can configure their own
  const dummyValues = [
    'SRI MURUGAN SUPERMARKET & GROCERIES',
    'ஸ்ரீ முருகன் சூப்பர் மார்க்கெட் & மளிகை',
    '33AAAPL1234F1Z8',
    '12423005000123',
    'No. 128, Bazaar Street, Madurai, Tamil Nadu - 625001',
    'எண். 128, பஜார் வீதி, மதுரை, தமிழ்நாடு - 625001',
    '9443322110 / 0452-2345678',
    'srimuruganstore.mdu@gmail.com',
    'murugangrocery@sbi',
    'தரமான மளிகைப் பொருட்கள், நியாயமான விலை!',
    'Quality Groceries at Honest Prices!',
    'எங்களுடன் வாங்கியதற்கு மிக்க நன்றி! மீண்டும் வருக!',
    'Thank you for shopping with us! Please visit again!',
    '1. வாங்கிய பொருட்கள் 3 நாட்களுக்குள் ரசீதுடன் மாற்றிக்கொள்ளலாம். 2. பிரித்த உணவுப் பொருட்கள் திரும்பப் பெறப்பட மாட்டாது.',
    '1. Goods once sold can be exchanged within 3 days with bill. 2. Opened food items will not be accepted.'
  ];

  const wipeStmt = db.prepare('UPDATE settings SET value = \'\' WHERE value = ?');
  for (const val of dummyValues) {
    wipeStmt.run(val);
  }
  db.prepare('UPDATE settings SET value = \'BILL/\' WHERE key = \'bill_prefix\' AND value = \'SM/26-27/\'').run();
}

// Seed default categories if empty
const catCount = db.prepare('SELECT count(*) as count FROM categories').get();
if (catCount.count === 0) {
  const defaultCats = [
    { en: 'Rice & Grains', ta: 'அரிசி & தானியங்கள்', icon: 'Wheat' },
    { en: 'Pulses & Dals', ta: 'பருப்பு வகைகள்', icon: 'Nut' },
    { en: 'Spices & Masala', ta: 'மசாலா & பொடிகள்', icon: 'Flame' },
    { en: 'Edible Oils & Ghee', ta: 'எண்ணெய் & நெய்', icon: 'Droplets' },
    { en: 'Dairy & Milk', ta: 'பால் & பால் பொருட்கள்', icon: 'Milk' },
    { en: 'Sugar & Salt', ta: 'சர்க்கரை, வெல்லம் & உப்பு', icon: 'Sparkles' },
    { en: 'Tea & Coffee', ta: 'டீ, காபி & பானங்கள்', icon: 'Coffee' },
    { en: 'Snacks & Biscuits', ta: 'பிஸ்கட் & தின்பண்டங்கள்', icon: 'Cookie' },
    { en: 'Cleaning & Soaps', ta: 'சோப்பு & துப்புரவு', icon: 'Sparkle' },
    { en: 'Pooja Items', ta: 'பூஜை பொருட்கள்', icon: 'Flame' },
    { en: 'Fresh Produce', ta: 'காய்கறி & பழங்கள்', icon: 'Apple' },
    { en: 'Other Essentials', ta: 'பிற தேவைகள்', icon: 'Package' }
  ];

  const insertCat = db.prepare('INSERT INTO categories (name_en, name_ta, icon) VALUES (?, ?, ?)');
  for (const c of defaultCats) {
    insertCat.run(c.en, c.ta, c.icon);
  }
}

// Seed default subgroups if empty
const subgCount = db.prepare('SELECT count(*) as count FROM subgroups').get();
if (subgCount.count === 0) {
  const defaultSubgroups = [
    { en: 'Masala Items', ta: 'மசாலா பொருட்கள்', cat: 3 },
    { en: 'Toothpaste & Oral Care', ta: 'பற்பசை & வாய் சுகாதாரம்', cat: 9 },
    { en: 'Soaps & Shampoos', ta: 'சோப்புகள் & ஷாம்பூ', cat: 9 },
    { en: 'Dals & Pulses', ta: 'பருப்பு வகைகள்', cat: 2 },
    { en: 'Edible Oils & Ghee', ta: 'சமையல் எண்ணெய் & நெய்', cat: 4 },
    { en: 'Rice & Grains', ta: 'அரிசி & தானியங்கள்', cat: 1 },
    { en: 'Biscuits & Snacks', ta: 'பிஸ்கட் & தின்பண்டங்கள்', cat: 8 },
    { en: 'Tea & Coffee', ta: 'டீ & காபி தூள்', cat: 7 },
    { en: 'Cleaning & Detergents', ta: 'சலவை & துப்புரவு பொருட்கள்', cat: 9 },
    { en: 'Pooja Items', ta: 'பூஜை பொருட்கள்', cat: 10 },
    { en: 'Spices & Condiments', ta: 'மளிகை நறுமணப் பொருட்கள்', cat: 3 },
    { en: 'Cool Drinks & Beverages', ta: 'குளிர்பானங்கள் & ஜூஸ்', cat: 7 }
  ];

  const insertSubg = db.prepare('INSERT INTO subgroups (name_en, name_ta, category_id) VALUES (?, ?, ?)');
  for (const sg of defaultSubgroups) {
    insertSubg.run(sg.en, sg.ta, sg.cat);
  }
}

// Seed comprehensive pre-loaded Tamil Nadu Grocery Catalog if empty
const prodCount = db.prepare('SELECT count(*) as count FROM products').get();
if (prodCount.count === 0) {
  const groceryItems = [
    // Grains & Rice (HSN 1006 - 0% if loose/unbranded, 5% if branded/packaged)
    { barcode: '8901001', en: 'Ponni Boiled Rice (Loose)', ta: 'பொன்னி புழுங்கல் அரிசி (சில்லறை)', cat: 1, hsn: '1006', unit: 'kg', cost: 52, price: 60, mrp: 65, gst: 0, stock: 350, loose: 1, quick: 1 },
    { barcode: '8901002', en: 'Ponni Raw Rice (Loose)', ta: 'பொன்னி பச்சரிசி', cat: 1, hsn: '1006', unit: 'kg', cost: 54, price: 62, mrp: 68, gst: 0, stock: 250, loose: 1, quick: 1 },
    { barcode: '8901003', en: 'Idli Rice (Loose)', ta: 'இட்லி அரிசி', cat: 1, hsn: '1006', unit: 'kg', cost: 38, price: 45, mrp: 50, gst: 0, stock: 300, loose: 1, quick: 1 },
    { barcode: '8901004', en: 'Seeraga Samba Rice', ta: 'சீரக சம்பா அரிசி', cat: 1, hsn: '1006', unit: 'kg', cost: 110, price: 130, mrp: 145, gst: 5, stock: 120, loose: 1, quick: 1 },
    { barcode: '8901005', en: 'Basmati Rice Premium (1kg Pkt)', ta: 'பாஸ்மதி அரிசி (1 கிலோ)', cat: 1, hsn: '1006', unit: 'pkt', cost: 140, price: 175, mrp: 190, gst: 5, stock: 50, loose: 0, quick: 0 },
    { barcode: '8901006', en: 'Wheat Flour / Atta (Loose)', ta: 'கோதுமை மாவு (சில்லறை)', cat: 1, hsn: '1101', unit: 'kg', cost: 36, price: 44, mrp: 50, gst: 0, stock: 150, loose: 1, quick: 1 },
    { barcode: '8901007', en: 'Aashirvaad Shudh Chakki Atta 5kg', ta: 'ஆசீர்வாத் ஆட்டா 5 கிலோ', cat: 1, hsn: '1101', unit: 'pkt', cost: 245, price: 285, mrp: 310, gst: 5, stock: 40, loose: 0, quick: 1 },
    { barcode: '8901008', en: 'Rava / Sooji (Loose)', ta: 'ரவை (சில்லறை)', cat: 1, hsn: '1103', unit: 'kg', cost: 38, price: 46, mrp: 52, gst: 0, stock: 100, loose: 1, quick: 0 },
    { barcode: '8901009', en: 'Maida (Loose)', ta: 'மைதா மாவு', cat: 1, hsn: '1101', unit: 'kg', cost: 36, price: 44, mrp: 50, gst: 0, stock: 80, loose: 1, quick: 0 },
    { barcode: '8901010', en: 'Ragi Flour / Kezhvaragu', ta: 'கேழ்வரகு மாவு / ராகி', cat: 1, hsn: '1102', unit: 'kg', cost: 42, price: 52, mrp: 60, gst: 0, stock: 75, loose: 1, quick: 0 },

    // Pulses & Dals (HSN 0713)
    { barcode: '8902001', en: 'Toor Dal First Quality (Loose)', ta: 'துவரம் பருப்பு முதல் தரம்', cat: 2, hsn: '0713', unit: 'kg', cost: 142, price: 165, mrp: 180, gst: 0, stock: 200, loose: 1, quick: 1 },
    { barcode: '8902002', en: 'Urad Dal Gundu / Whole (Loose)', ta: 'உளுந்தம் பருப்பு (உருண்டு)', cat: 2, hsn: '0713', unit: 'kg', cost: 118, price: 138, mrp: 150, gst: 0, stock: 180, loose: 1, quick: 1 },
    { barcode: '8902003', en: 'Moong Dal / Paasi Paruppu', ta: 'பாசிப் பருப்பு', cat: 2, hsn: '0713', unit: 'kg', cost: 105, price: 125, mrp: 135, gst: 0, stock: 120, loose: 1, quick: 1 },
    { barcode: '8902004', en: 'Chana Dal / Kadalai Paruppu', ta: 'கடலைப் பருப்பு', cat: 2, hsn: '0713', unit: 'kg', cost: 82, price: 98, mrp: 110, gst: 0, stock: 150, loose: 1, quick: 1 },
    { barcode: '8902005', en: 'Fried Gram / Pottu Kadalai', ta: 'பொட்டுக் கடலை / பொரி கடலை', cat: 2, hsn: '0713', unit: 'kg', cost: 95, price: 115, mrp: 130, gst: 5, stock: 100, loose: 1, quick: 1 },
    { barcode: '8902006', en: 'Green Gram / Paasi Payaru', ta: 'பச்சைப் பயறு', cat: 2, hsn: '0713', unit: 'kg', cost: 100, price: 120, mrp: 135, gst: 0, stock: 90, loose: 1, quick: 0 },
    { barcode: '8902007', en: 'Black Chana / Karuppu Konda Kadalai', ta: 'கருப்பு கொண்டைக்கடலை', cat: 2, hsn: '0713', unit: 'kg', cost: 78, price: 92, mrp: 105, gst: 0, stock: 110, loose: 1, quick: 0 },
    { barcode: '8902008', en: 'White Chana / Kabuli Chana', ta: 'வெள்ளை கொண்டைக்கடலை', cat: 2, hsn: '0713', unit: 'kg', cost: 125, price: 150, mrp: 165, gst: 0, stock: 85, loose: 1, quick: 0 },
    { barcode: '8902009', en: 'Horse Gram / Kollu', ta: 'கொள்ளு', cat: 2, hsn: '0713', unit: 'kg', cost: 65, price: 80, mrp: 90, gst: 0, stock: 60, loose: 1, quick: 0 },

    // Edible Oils & Ghee (HSN 1515, 0405 - 5% / 12%)
    { barcode: '8903001', en: 'Gingelly Oil / Nallennai (Idhayam 1L)', ta: 'இதயம் நல்லெண்ணெய் 1 லிட்டர்', cat: 4, hsn: '1515', unit: 'pkt', cost: 385, price: 420, mrp: 440, gst: 5, stock: 45, loose: 0, quick: 1 },
    { barcode: '8903002', en: 'Groundnut Oil / Kadalai Ennai 1L', ta: 'கடலை எண்ணெய் 1 லிட்டர்', cat: 4, hsn: '1515', unit: 'ltr', cost: 175, price: 195, mrp: 210, gst: 5, stock: 60, loose: 1, quick: 1 },
    { barcode: '8903003', en: 'Gold Winner Refined Sunflower Oil 1L', ta: 'கோல்ட் வின்னர் எண்ணெய் 1 லிட்டர்', cat: 4, hsn: '1512', unit: 'pkt', cost: 118, price: 135, mrp: 145, gst: 5, stock: 80, loose: 0, quick: 1 },
    { barcode: '8903004', en: 'Pure Cow Ghee / Pasu Nei (GRB 500ml)', ta: 'ஜிஆர்பி பசு நெய் 500 மி.லி', cat: 4, hsn: '0405', unit: 'pcs', cost: 345, price: 395, mrp: 415, gst: 12, stock: 35, loose: 0, quick: 1 },
    { barcode: '8903005', en: 'Pure Coconut Oil / Thengai Ennai 1L', ta: 'தூய தேங்காய் எண்ணெய் 1 லிட்டர்', cat: 4, hsn: '1513', unit: 'ltr', cost: 210, price: 245, mrp: 260, gst: 5, stock: 50, loose: 1, quick: 0 },
    { barcode: '8903006', en: 'Castor Oil / Vilakku Ennai 200ml', ta: 'விளக்கு எண்ணெய் 200 மி.லி', cat: 4, hsn: '1515', unit: 'pcs', cost: 55, price: 68, mrp: 75, gst: 5, stock: 30, loose: 0, quick: 0 },

    // Spices & Masala (HSN 0910, 0904, 2103)
    { barcode: '8904001', en: 'Aachi Chilli Powder 100g', ta: 'ஆச்சி மிளகாய் தூள் 100 கி', cat: 3, hsn: '0904', unit: 'pkt', cost: 36, price: 44, mrp: 48, gst: 5, stock: 90, loose: 0, quick: 1 },
    { barcode: '8904002', en: 'Sakthi Sambar Powder 100g', ta: 'சக்தி சாம்பார் பொடி 100 கி', cat: 3, hsn: '0910', unit: 'pkt', cost: 38, price: 46, mrp: 50, gst: 5, stock: 85, loose: 0, quick: 1 },
    { barcode: '8904003', en: 'Turmeric Powder / Manjal Thool 100g', ta: 'மஞ்சள் தூள் 100 கி', cat: 3, hsn: '0910', unit: 'pkt', cost: 24, price: 32, mrp: 35, gst: 5, stock: 110, loose: 0, quick: 1 },
    { barcode: '8904004', en: 'Coriander Seeds / Kothamalli (Loose)', ta: 'கொத்தமல்லி விதை / தனியா', cat: 3, hsn: '0909', unit: 'kg', cost: 115, price: 140, mrp: 155, gst: 5, stock: 70, loose: 1, quick: 0 },
    { barcode: '8904005', en: 'Cumin Seeds / Seeragam (Loose)', ta: 'சீரகம் (சில்லறை)', cat: 3, hsn: '0909', unit: 'kg', cost: 260, price: 310, mrp: 340, gst: 5, stock: 50, loose: 1, quick: 1 },
    { barcode: '8904006', en: 'Mustard Seeds / Kadugu (Loose)', ta: 'கடுகு (சில்லறை)', cat: 3, hsn: '0910', unit: 'kg', cost: 85, price: 105, mrp: 120, gst: 5, stock: 80, loose: 1, quick: 1 },
    { barcode: '8904007', en: 'Fenugreek / Vendhayam (Loose)', ta: 'வெந்தயம் (சில்லறை)', cat: 3, hsn: '0910', unit: 'kg', cost: 88, price: 108, mrp: 125, gst: 5, stock: 65, loose: 1, quick: 0 },
    { barcode: '8904008', en: 'Black Pepper / Milagu (Loose)', ta: 'கருப்பு மிளகு (சில்லறை)', cat: 3, hsn: '0904', unit: 'kg', cost: 620, price: 720, mrp: 780, gst: 5, stock: 40, loose: 1, quick: 0 },
    { barcode: '8904009', en: 'Cardamom / Elakkai 50g', ta: 'ஏலக்காய் 50 கி', cat: 3, hsn: '0908', unit: 'pkt', cost: 140, price: 175, mrp: 195, gst: 5, stock: 45, loose: 0, quick: 0 },
    { barcode: '8904010', en: 'Dry Red Chilli (Guntur/Sannam)', ta: 'காய்ந்த மிளகாய் (குண்டூர்)', cat: 3, hsn: '0904', unit: 'kg', cost: 210, price: 250, mrp: 275, gst: 5, stock: 90, loose: 1, quick: 1 },
    { barcode: '8904011', en: 'Tamarind / Puli (Cleaned loose)', ta: 'நாட்டு புளி (சுத்தம் செய்தது)', cat: 3, hsn: '0813', unit: 'kg', cost: 130, price: 160, mrp: 175, gst: 5, stock: 120, loose: 1, quick: 1 },
    { barcode: '8904012', en: 'Asafoetida / LG Perungayam 50g', ta: 'எல்.ஜி பெருங்காயம் 50 கி', cat: 3, hsn: '0910', unit: 'pcs', cost: 58, price: 68, mrp: 72, gst: 5, stock: 80, loose: 0, quick: 1 },

    // Sugar, Jaggery & Salt
    { barcode: '8905001', en: 'White Sugar (Loose)', ta: 'வெள்ளை சர்க்கரை (சில்லறை)', cat: 6, hsn: '1701', unit: 'kg', cost: 38, price: 44, mrp: 48, gst: 5, stock: 400, loose: 1, quick: 1 },
    { barcode: '8905002', en: 'Country Jaggery / Nattu Vellam', ta: 'நாட்டு வெல்லம் (உருண்டை)', cat: 6, hsn: '1701', unit: 'kg', cost: 55, price: 68, mrp: 75, gst: 5, stock: 150, loose: 1, quick: 1 },
    { barcode: '8905003', en: 'Nattu Sakkarai / Brown Sugar', ta: 'நாட்டு சர்க்கரை', cat: 6, hsn: '1701', unit: 'kg', cost: 68, price: 82, mrp: 95, gst: 5, stock: 100, loose: 1, quick: 1 },
    { barcode: '8905004', en: 'Tata Crystal Salt / Kal Uppu 1kg', ta: 'டாடா கல் உப்பு 1 கிலோ', cat: 6, hsn: '2501', unit: 'pkt', cost: 11, price: 15, mrp: 16, gst: 0, stock: 200, loose: 0, quick: 1 },
    { barcode: '8905005', en: 'Tata Iodized Free Flow Salt 1kg', ta: 'டாடா தூள் உப்பு 1 கிலோ', cat: 6, hsn: '2501', unit: 'pkt', cost: 23, price: 28, mrp: 30, gst: 0, stock: 180, loose: 0, quick: 1 },

    // Tea & Coffee (HSN 0902, 0901)
    { barcode: '8906001', en: '3 Roses Tea 250g', ta: '3 ரோசஸ் டீ தூள் 250 கி', cat: 7, hsn: '0902', unit: 'pkt', cost: 135, price: 155, mrp: 165, gst: 5, stock: 60, loose: 0, quick: 1 },
    { barcode: '8906002', en: 'AVT Premium Tea 250g', ta: 'ஏவிடி பிரீமியம் டீ 250 கி', cat: 7, hsn: '0902', unit: 'pkt', cost: 120, price: 140, mrp: 150, gst: 5, stock: 55, loose: 0, quick: 1 },
    { barcode: '8906003', en: 'Narasus Udhayam Coffee 200g', ta: 'நரசுஸ் உதயம் காபி தூள் 200 கி', cat: 7, hsn: '0901', unit: 'pkt', cost: 115, price: 135, mrp: 145, gst: 5, stock: 45, loose: 0, quick: 1 },
    { barcode: '8906004', en: 'Bru Instant Coffee 50g Jar', ta: 'புரூ இன்ஸ்டன்ட் காபி 50 கி', cat: 7, hsn: '2101', unit: 'pcs', cost: 105, price: 120, mrp: 130, gst: 18, stock: 40, loose: 0, quick: 0 },

    // Dairy & Milk
    { barcode: '8907001', en: 'Aavin Toned Milk 500ml (Blue)', ta: 'ஆவின் சமன்படுத்திய பால் 500 மி.லி', cat: 5, hsn: '0401', unit: 'pkt', cost: 21, price: 22, mrp: 22, gst: 0, stock: 60, loose: 0, quick: 1 },
    { barcode: '8907002', en: 'Aavin Full Cream Milk 500ml (Orange)', ta: 'ஆவின் நிறை கொழுப்பு பால் 500 மி.லி', cat: 5, hsn: '0401', unit: 'pkt', cost: 28, price: 30, mrp: 30, gst: 0, stock: 40, loose: 0, quick: 1 },
    { barcode: '8907003', en: 'Amul Butter 100g', ta: 'அமுல் வெண்ணெய் 100 கி', cat: 5, hsn: '0405', unit: 'pcs', cost: 51, price: 58, mrp: 60, gst: 12, stock: 35, loose: 0, quick: 0 },

    // Cleaning, Soaps & Detergents (HSN 3401, 3402 - 18%)
    { barcode: '8908001', en: 'Hamam Neem Soap 100g', ta: 'ஹமாம் வேப்பிலை சோப் 100 கி', cat: 9, hsn: '3401', unit: 'pcs', cost: 36, price: 42, mrp: 45, gst: 18, stock: 80, loose: 0, quick: 1 },
    { barcode: '8908002', en: 'Surf Excel Quick Wash 1kg', ta: 'சர்ப் எக்செல் சோப்புத்தூள் 1 கிலோ', cat: 9, hsn: '3402', unit: 'pkt', cost: 132, price: 155, mrp: 165, gst: 18, stock: 50, loose: 0, quick: 1 },
    { barcode: '8908003', en: 'Vim Dishwash Bar 200g', ta: 'விம் பாத்திரம் கழுவும் சோப் 200 கி', cat: 9, hsn: '3401', unit: 'pcs', cost: 17, price: 21, mrp: 22, gst: 18, stock: 120, loose: 0, quick: 1 },
    { barcode: '8908004', en: 'Rin Detergent Bar 250g', ta: 'ரின் துணி சோப் 250 கி', cat: 9, hsn: '3401', unit: 'pcs', cost: 24, price: 29, mrp: 30, gst: 18, stock: 100, loose: 0, quick: 1 },
    { barcode: '8908005', en: 'Comfort Fabric Conditioner 200ml', ta: 'கம்ஃபோர்ட் 200 மி.லி', cat: 9, hsn: '3809', unit: 'pcs', cost: 52, price: 62, mrp: 65, gst: 18, stock: 40, loose: 0, quick: 0 },

    // Pooja & Misc
    { barcode: '8909001', en: 'Cycle Pure Agarbatti 3in1', ta: 'சைக்கிள் அகர்பத்தி 3in1', cat: 10, hsn: '3307', unit: 'pkt', cost: 38, price: 48, mrp: 50, gst: 12, stock: 75, loose: 0, quick: 1 },
    { barcode: '8909002', en: 'Camphor / Karpooram 50g Box', ta: 'சூடம் / கற்பூரம் 50 கி டப்பா', cat: 10, hsn: '2914', unit: 'pcs', cost: 42, price: 55, mrp: 60, gst: 18, stock: 65, loose: 0, quick: 1 },
    { barcode: '8909003', en: 'Pooja Oil / Deepam Ennai 1L', ta: 'தீபம் எண்ணெய் 1 லிட்டர்', cat: 10, hsn: '1518', unit: 'pkt', cost: 95, price: 115, mrp: 125, gst: 5, stock: 50, loose: 0, quick: 1 },
    { barcode: '8909004', en: 'Gopuram Kumkum 50g', ta: 'கோபுரம் குங்குமம் 50 கி', cat: 10, hsn: '3304', unit: 'pcs', cost: 20, price: 28, mrp: 30, gst: 18, stock: 60, loose: 0, quick: 0 },

    // Snacks & Biscuits (HSN 1905 - 18%)
    { barcode: '8910001', en: 'Parle-G Glucose Biscuit 250g', ta: 'பார்லே-ஜி பிஸ்கட் 250 கி', cat: 8, hsn: '1905', unit: 'pkt', cost: 24, price: 28, mrp: 30, gst: 18, stock: 90, loose: 0, quick: 1 },
    { barcode: '8910002', en: 'Britannia Good Day Butter 200g', ta: 'குட் டே பட்டர் பிஸ்கட் 200 கி', cat: 8, hsn: '1905', unit: 'pkt', cost: 38, price: 46, mrp: 50, gst: 18, stock: 70, loose: 0, quick: 1 },
    { barcode: '8910003', en: 'Madras Mixture 200g Pkt', ta: 'மெட்ராஸ் மிக்சர் 200 கி', cat: 8, hsn: '2106', unit: 'pkt', cost: 45, price: 58, mrp: 65, gst: 12, stock: 45, loose: 0, quick: 1 }
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      barcode, name_en, name_ta, category_id, hsn_code, unit,
      cost_price, selling_price, mrp, discount_percent, gst_rate,
      cess_rate, stock_quantity, min_stock_alert, is_loose_item, is_quick_item
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of groceryItems) {
    insertProd.run(
      p.barcode, p.en, p.ta, p.cat, p.hsn, p.unit,
      p.cost, p.price, p.mrp, 0, p.gst,
      0, p.stock, 10, p.loose, p.quick
    );
  }
}

// Seed default sample walk-in customer
const custCount = db.prepare('SELECT count(*) as count FROM customers').get();
if (custCount.count === 0) {
  const insertCust = db.prepare('INSERT INTO customers (name, phone, address, gstin, state_code) VALUES (?, ?, ?, ?, ?)');
  insertCust.run('Retail Cash Customer / ரொக்க வாடிக்கையாளர்', '9999999999', 'Madurai', '', '33');
  insertCust.run('Vignesh Hotel & Sweets (B2B)', '9842112233', '12, South Veli St, Madurai', '33AAACB9876Q1Z2', '33');
  insertCust.run('Ramasamy Chettiar (Regular Credit)', '9443198765', '45, West Masi St, Madurai', '', '33');
}

module.exports = db;

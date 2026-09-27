const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'dairy.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin', -- 'official_admin' (only one), 'admin'
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milk_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_per_liter REAL NOT NULL,
      fat_snf TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      admin_id TEXT DEFAULT 'admin_1',
      society TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      house_no TEXT,
      default_milk_type_id TEXT NOT NULL,
      default_quantity_liters REAL NOT NULL DEFAULT 1.0,
      custom_price_per_liter REAL DEFAULT NULL,
      default_milk_type_2_id TEXT DEFAULT NULL,
      default_quantity_2_liters REAL DEFAULT 0.0,
      custom_price_2_per_liter REAL DEFAULT NULL,
      delivery_time_slot TEXT DEFAULT 'Morning Shift',
      billing_cycle_start_day INTEGER DEFAULT 1,
      preferred_payment_mode TEXT DEFAULT 'cash',
      upi_id TEXT,
      outstanding_balance REAL DEFAULT 0.0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins (id),
      FOREIGN KEY (default_milk_type_id) REFERENCES milk_types (id),
      FOREIGN KEY (default_milk_type_2_id) REFERENCES milk_types (id)
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      milk_type_id TEXT NOT NULL,
      quantity_liters REAL NOT NULL,
      price_per_liter REAL NOT NULL,
      status TEXT NOT NULL, -- 'delivered', 'absent', 'custom'
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(customer_id, delivery_date, milk_type_id),
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (milk_type_id) REFERENCES milk_types (id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      cycle_start_date TEXT NOT NULL,
      cycle_end_date TEXT NOT NULL,
      billing_date TEXT NOT NULL,
      total_liters REAL NOT NULL,
      total_delivery_days INTEGER NOT NULL,
      current_cycle_amount REAL NOT NULL,
      previous_due_balance REAL NOT NULL DEFAULT 0.0,
      total_amount_payable REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0.0,
      balance_remaining REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      last_reminded_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      bill_id TEXT,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_ref TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    );

    CREATE TABLE IF NOT EXISTS otp_sessions (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      expires_at TEXT NOT NULL,
      verified INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dairy_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Ensure milk_types exist
  seedMilkTypes();

  // Ensure Only ONE Official Admin exists
  seedOfficialAdmin();

  // Ensure settings
  seedSettings();

  // Seed Real Customer Data
  seedRealCustomers();
}

function seedMilkTypes() {
  const insertMilk = db.prepare(`
    INSERT OR REPLACE INTO milk_types (id, name, price_per_liter, fat_snf, description, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  insertMilk.run('buffalo_pure', 'Pure Buffalo Milk', 60.0, '6.5% Fat, 9.0% SNF', 'Rich Creamy Buffalo Milk (₹60/L)');
  insertMilk.run('cow_standard', 'Fresh Cow Milk', 56.0, '3.8% Fat, 8.5% SNF', 'Pure Homogenized Cow Milk (₹56/L)');
  insertMilk.run('special_rich', 'Special Buffalo Rich Milk', 66.0, '7.0% Fat, 9.2% SNF', 'Premium Rich Buffalo Milk (₹66/L)');
  insertMilk.run('desi_gir_cow', 'Desi Gir Cow A2 Milk', 85.0, '4.5% Fat, 8.8% SNF', 'Organic Vedic A2 Milk (₹85/L)');
}

function seedOfficialAdmin() {
  // Clear any old admins and ensure ONLY ONE Official Admin exists
  db.prepare('DELETE FROM admins WHERE id != ?').run('admin_1');
  const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get('admin_1');

  if (!existing) {
    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, name, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'admin_1',
      'admin1',
      'admin1@dairyflow.com',
      'Dairy@2026',
      'Official Admin',
      'official_admin',
      '+91 98765 00001'
    );
  } else {
    db.prepare(`
      UPDATE admins 
      SET username = 'admin1',
          password_hash = 'Dairy@2026',
          name = COALESCE(name, 'Official Admin'),
          role = 'official_admin'
      WHERE id = 'admin_1'
    `).run();
  }
}

function seedSettings() {
  const insertSetting = db.prepare('INSERT OR REPLACE INTO dairy_settings (key, value) VALUES (?, ?)');
  insertSetting.run('dairy_name', 'DairyFlow Milk Distribution');
  insertSetting.run('dairy_phone', '+91 98765 43210');
  insertSetting.run('dairy_upi_id', 'dairyflow@okhdfcbank');
  insertSetting.run('default_billing_reminder_day', '10');
  insertSetting.run('advance_reminder_days', '2');
}

function seedRealCustomers() {
  // Clear previous customer data to load exact latest user specification
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM deliveries').run();
  db.prepare('DELETE FROM bills').run();
  db.prepare('DELETE FROM customers').run();

  const insertCust = db.prepare(`
    INSERT INTO customers (
      id, admin_id, society, name, phone, email, address, house_no,
      default_milk_type_id, default_quantity_liters, custom_price_per_liter,
      default_milk_type_2_id, default_quantity_2_liters, custom_price_2_per_liter,
      delivery_time_slot, billing_cycle_start_day, preferred_payment_mode,
      upi_id, outstanding_balance, status, created_at
    )
    VALUES (?, 'admin_1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Morning Shift', 1, ?, ?, ?, 'active', datetime('now'))
  `);

  // EXACT REAL CUSTOMER DATA PROVIDED BY USER FOR ADMIN 1:
  // 1. Safar Villa :- (Morning Shift)
  // 305 (Aug Bill Paid) (Cash) (1Lit/Day) (1860 Paid Via Cash)
  insertCust.run(
    'cust_sv_305', 'Safar Villa', 'Safar Villa 305', '+91 98201 30500', 'safar305@gmail.com',
    'Safar Villa, Block A', '305', 'buffalo_pure', 1.0, 60.0, null, 0.0, null, 'cash', '', 0.0
  );

  // 504 (Aug Bill Pending) (1.5 Lit/Day) (2,790 Pending)
  insertCust.run(
    'cust_sv_504', 'Safar Villa', 'Safar Villa 504', '+91 98201 50400', 'safar504@gmail.com',
    'Safar Villa, Block B', '504', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 2790.0
  );

  // 2. Oscar Enclave :- (Morning Shift)
  // B-102 (Aug Bill Paid) (Cash) (1.5Lit/Day) (2790 Paid Via Cash)
  insertCust.run(
    'cust_oe_b102', 'Oscar Enclave', 'Oscar Enclave B-102', '+91 98202 10200', 'oscar102@gmail.com',
    'Oscar Enclave, Main Wing', 'B-102', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 0.0
  );

  // 3. Asho palav Resident :- (Morning Shift)
  // D-202 :- (1Li/Day Buffalo Milk :- 60Rs.) (Aug Bill Pending) (1860 Amount Is Pending)
  insertCust.run(
    'cust_ap_d202', 'Asho palav Resident', 'Asho Palav D-202', '+91 98203 20200', 'asho202@gmail.com',
    'Asho Palav Resident, Sector 1', 'D-202', 'buffalo_pure', 1.0, 60.0, null, 0.0, null, 'cash', '', 1860.0
  );

  // C-302 :- (1 Lit/Day Cow Milk :- 56Rs , 1 Lit/Day Buffalo Milk :- 60Rs.) (Aug Bill Was Pending)
  // (Cow Milk Pending :- 1736) (Buffalo Milk Pending :- 1860) (Total Pending Amount:- 3596)
  insertCust.run(
    'cust_ap_c302', 'Asho palav Resident', 'Asho Palav C-302', '+91 98203 30200', 'asho302@gmail.com',
    'Asho Palav Resident, Sector 1', 'C-302',
    'cow_standard', 1.0, 56.0,          // Milk 1: Cow Milk 1L @ 56Rs
    'buffalo_pure', 1.0, 60.0,          // Milk 2: Buffalo Milk 1L @ 60Rs
    'cash', '', 3596.0
  );

  // 4. Gulmohar Bangalow :- (Morning Shift)
  // Home No - 26 (Aug Bill Amount Pending) (1 Lit/Day Buffalo Milk :- 60Rs.) (1860 Is Pending)
  insertCust.run(
    'cust_gb_26', 'Gulmohar Bangalow', 'Gulmohar Bangalow 26', '+91 98205 02600', 'gulmohar26@gmail.com',
    'Gulmohar Bangalow, Green Lane', 'Home No - 26', 'buffalo_pure', 1.0, 60.0, null, 0.0, null, 'cash', '', 1860.0
  );

  // 5. Jk Sarita :- (Morning Shift)
  // Home No - 40 (Pending) (1.5Lit / Day , 60 Rs.) (2790 Is Pending Aug)
  insertCust.run(
    'cust_jk_40', 'Jk Sarita', 'Jk Sarita Home 40', '+91 98206 04000', 'jksarita40@gmail.com',
    'Jk Sarita Complex', 'Home No - 40', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 2790.0
  );

  // Home No - 33 (Pending) (1.5Lit / Day , 66 Rs.) (3069 Is Pending Aug)
  insertCust.run(
    'cust_jk_33', 'Jk Sarita', 'Jk Sarita Home 33', '+91 98206 03300', 'jksarita33@gmail.com',
    'Jk Sarita Complex', 'Home No - 33', 'special_rich', 1.5, 66.0, null, 0.0, null, 'cash', '', 3069.0
  );

  // Home No - 31 (Paid Cash) (1.5Lit / Day , 60 Rs.) (Paid Via Cash 2790)
  insertCust.run(
    'cust_jk_31', 'Jk Sarita', 'Jk Sarita Home 31', '+91 98206 03100', 'jksarita31@gmail.com',
    'Jk Sarita Complex', 'Home No - 31', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 0.0
  );

  // 6. Dwarika Village :- (Morning Shift)
  // Wing F - 1103 (Pending) (1.5Lit / Day , 60 Rs.) (Pending Bill Amount 2790)
  insertCust.run(
    'cust_dv_f1103', 'Dwarika Village', 'Dwarika Village Wing F - 1103', '+91 98207 11030', 'dwarikaf@gmail.com',
    'Dwarika Village, Sector 4', 'Wing F - 1103', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 2790.0
  );

  // Wing - G - 1103 (Paid) (1.5Lit / Day , 60 Rs.) (Paid Via Cash 2790)
  insertCust.run(
    'cust_dv_g1103', 'Dwarika Village', 'Dwarika Village Wing G - 1103', '+91 98207 21030', 'dwarikag@gmail.com',
    'Dwarika Village, Sector 4', 'Wing - G - 1103', 'buffalo_pure', 1.5, 60.0, null, 0.0, null, 'cash', '', 0.0
  );

  // Seed deliveries and payments for August and September
  seedDeliveriesAndPayments();
}

function seedDeliveriesAndPayments() {
  const customers = db.prepare('SELECT * FROM customers').all();
  const insertDelivery = db.prepare(`
    INSERT OR REPLACE INTO deliveries (id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // 1. SEED AUGUST 2026 DELIVERIES (Aug 1 to Aug 31 - exactly 31 days)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-08-${dayStr}`;

    customers.forEach(cust => {
      // Primary milk delivery
      const d1Id = `del_${cust.id}_${dateStr}_1`;
      const price1 = cust.custom_price_per_liter || (cust.default_milk_type_id === 'cow_standard' ? 56 : (cust.default_milk_type_id === 'special_rich' ? 66 : 60));
      insertDelivery.run(d1Id, cust.id, dateStr, cust.default_milk_type_id, cust.default_quantity_liters, price1, 'delivered', 'Morning Shift delivery');

      // Secondary milk delivery (for customers with two types of milk, e.g. C-302)
      if (cust.default_milk_type_2_id && cust.default_quantity_2_liters > 0) {
        const d2Id = `del_${cust.id}_${dateStr}_2`;
        const price2 = cust.custom_price_2_per_liter || (cust.default_milk_type_2_id === 'cow_standard' ? 56 : (cust.default_milk_type_2_id === 'special_rich' ? 66 : 60));
        insertDelivery.run(d2Id, cust.id, dateStr, cust.default_milk_type_2_id, cust.default_quantity_2_liters, price2, 'delivered', 'Morning Shift 2nd Milk delivery');
      }
    });
  }

  // 2. SEED AUGUST CASH PAYMENTS FOR PAID CUSTOMERS
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, customer_id, payment_date, amount, payment_mode, transaction_ref, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Safar Villa 305: 1860 Paid Via Cash
  insertPayment.run('pay_sv_305_aug', 'cust_sv_305', '2026-08-31', 1860.0, 'cash', 'CASH_REC_305', 'August Bill Paid in Full via Cash');

  // Oscar Enclave B-102: 2790 Paid Via Cash
  insertPayment.run('pay_oe_b102_aug', 'cust_oe_b102', '2026-08-31', 2790.0, 'cash', 'CASH_REC_B102', 'August Bill Paid in Full via Cash');

  // Jk Sarita Home No - 31: 2790 Paid Via Cash
  insertPayment.run('pay_jk_31_aug', 'cust_jk_31', '2026-08-31', 2790.0, 'cash', 'CASH_REC_JK31', 'August Bill Paid in Full via Cash');

  // Dwarika Village Wing - G - 1103: 2790 Paid Via Cash
  insertPayment.run('pay_dv_g1103_aug', 'cust_dv_g1103', '2026-08-31', 2790.0, 'cash', 'CASH_REC_DVG1103', 'August Bill Paid in Full via Cash');

  // 3. SEED SEPTEMBER 2026 DELIVERIES (Sept 1 to Sept 27)
  for (let day = 1; day <= 27; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-09-${dayStr}`;

    customers.forEach(cust => {
      const d1Id = `del_${cust.id}_${dateStr}_1`;
      const price1 = cust.custom_price_per_liter || (cust.default_milk_type_id === 'cow_standard' ? 56 : (cust.default_milk_type_id === 'special_rich' ? 66 : 60));
      insertDelivery.run(d1Id, cust.id, dateStr, cust.default_milk_type_id, cust.default_quantity_liters, price1, 'delivered', 'Morning Shift delivery');

      if (cust.default_milk_type_2_id && cust.default_quantity_2_liters > 0) {
        const d2Id = `del_${cust.id}_${dateStr}_2`;
        const price2 = cust.custom_price_2_per_liter || (cust.default_milk_type_2_id === 'cow_standard' ? 56 : (cust.default_milk_type_2_id === 'special_rich' ? 66 : 60));
        insertDelivery.run(d2Id, cust.id, dateStr, cust.default_milk_type_2_id, cust.default_quantity_2_liters, price2, 'delivered', 'Morning Shift 2nd Milk delivery');
      }
    });
  }
}

initDb();

module.exports = {
  db,
  initDb,
  seedMilkTypes,
  seedOfficialAdmin,
  seedRealCustomers,
  seedDeliveriesAndPayments
};

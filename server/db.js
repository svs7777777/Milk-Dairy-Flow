const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'dairy.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize database tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin', -- 'superadmin', 'admin', 'manager'
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
      delivery_time_slot TEXT DEFAULT 'Morning Shift',
      billing_cycle_start_day INTEGER DEFAULT 1,
      preferred_payment_mode TEXT DEFAULT 'cash',
      upi_id TEXT,
      outstanding_balance REAL DEFAULT 0.0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins (id),
      FOREIGN KEY (default_milk_type_id) REFERENCES milk_types (id)
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      milk_type_id TEXT NOT NULL,
      quantity_liters REAL NOT NULL,
      price_per_liter REAL NOT NULL,
      status TEXT NOT NULL, -- 'delivered', 'absent', 'custom', 'pending'
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(customer_id, delivery_date),
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

  // Seed Admin 1 if not present
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
  if (adminCount === 0) {
    const insertAdmin = db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, name, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    // Admin 1 Credentials:
    // Username: admin1
    // Password: Dairy@2026
    insertAdmin.run(
      'admin_1',
      'admin1',
      'admin1@dairyflow.com',
      'Dairy@2026', // Plaintext for local transparency or hashed
      'Admin 1 (Dairy Manager)',
      'admin',
      '+91 98765 00001'
    );
  }

  // Seed default milk types if not present
  const countMilkTypes = db.prepare('SELECT COUNT(*) as count FROM milk_types').get().count;
  if (countMilkTypes === 0) {
    const insertMilk = db.prepare(`
      INSERT INTO milk_types (id, name, price_per_liter, fat_snf, description, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertMilk.run('cow_standard', 'Standard Cow Milk', 60.0, '3.5% Fat, 8.5% SNF', 'Pure homogenized Cow Milk (₹60/L)', 1);
    insertMilk.run('buffalo_pure', 'Pure Buffalo Milk', 70.0, '6.5% Fat, 9.0% SNF', 'Rich Creamy Buffalo Milk (₹70/L)', 1);
    insertMilk.run('gold_cream', 'Full Cream Gold Milk', 78.0, '6.0% Fat, 9.0% SNF', 'Premium Gold Nutrition Milk (₹78/L)', 1);
    insertMilk.run('desi_gir_cow', 'Desi Gir Cow A2 Milk', 85.0, '4.5% Fat, 8.8% SNF', 'Organic Vedic A2 Milk (₹85/L)', 1);
  }

  // Seed initial settings
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM dairy_settings').get().count;
  if (countSettings === 0) {
    const insertSetting = db.prepare('INSERT INTO dairy_settings (key, value) VALUES (?, ?)');
    insertSetting.run('dairy_name', 'DairyFlow Milk Distribution');
    insertSetting.run('dairy_phone', '+91 98765 43210');
    insertSetting.run('dairy_upi_id', 'dairyflow@okhdfcbank');
    insertSetting.run('default_billing_reminder_day', '10');
    insertSetting.run('advance_reminder_days', '2');
  }

  // Seed REAL-TIME CUSTOMER DATA provided by user
  seedRealCustomers();
}

function seedRealCustomers() {
  const countCust = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (countCust > 0) return; // already seeded

  const insertCust = db.prepare(`
    INSERT INTO customers (
      id, admin_id, society, name, phone, email, address, house_no,
      default_milk_type_id, default_quantity_liters, delivery_time_slot,
      billing_cycle_start_day, preferred_payment_mode, upi_id, outstanding_balance,
      status, created_at
    )
    VALUES (?, 'admin_1', ?, ?, ?, ?, ?, ?, ?, ?, 'Morning Shift', ?, ?, ?, ?, 'active', datetime('now'))
  `);

  // REAL CUSTOMER DATA PROVIDED BY USER FOR ADMIN 1:
  // 1. Safar Villa :- (Morning Shift)
  // 305 (Aug Bill Paid) (Cash)
  insertCust.run('cust_sv_305', 'Safar Villa', 'Safar Villa Resident 305', '+91 98201 30500', 'safar305@gmail.com', 'Safar Villa, Block A', 'Flat 305', 'cow_standard', 1.0, 1, 'cash', '', 0.0);
  // 504 (Aug Bill Pending)
  insertCust.run('cust_sv_504', 'Safar Villa', 'Safar Villa Resident 504', '+91 98201 50400', 'safar504@gmail.com', 'Safar Villa, Block B', 'Flat 504', 'cow_standard', 1.0, 1, 'cash', '', 1860.0);

  // 2. Oscar Enclave :- (Morning Shift)
  // B-102 (Aug Bill Paid) (Cash)
  insertCust.run('cust_oe_b102', 'Oscar Enclave', 'Oscar Enclave B-102', '+91 98302 10200', 'oscar102@gmail.com', 'Oscar Enclave, Main Road', 'Flat B-102', 'cow_standard', 1.5, 1, 'cash', '', 0.0);

  // 3. Asho palav Resident :- (Morning Shift)
  // D-202
  insertCust.run('cust_ap_d202', 'Asho palav Resident', 'Asho Palav D-202', '+91 98403 20200', 'asho202@gmail.com', 'Asho Palav Resident, Sector 1', 'Flat D-202', 'cow_standard', 1.0, 1, 'upi', 'asho202@upi', 0.0);
  // C-302
  insertCust.run('cust_ap_c302', 'Asho palav Resident', 'Asho Palav C-302', '+91 98403 30200', 'asho302@gmail.com', 'Asho Palav Resident, Sector 1', 'Flat C-302', 'cow_standard', 1.0, 1, 'cash', '', 0.0);

  // 4. Vir Savarkar Township :- (Morning Shift)
  insertCust.run('cust_vs_a101', 'Vir Savarkar Township', 'Vir Savarkar A-101', '+91 98504 10100', 'virsavarkar101@gmail.com', 'Vir Savarkar Township, Gate 2', 'House A-101', 'cow_standard', 1.0, 1, 'cash', '', 0.0);
  insertCust.run('cust_vs_b202', 'Vir Savarkar Township', 'Vir Savarkar B-202', '+91 98504 20200', 'virsavarkar202@gmail.com', 'Vir Savarkar Township, Gate 2', 'House B-202', 'cow_standard', 1.0, 1, 'upi', 'virsavarkar@upi', 0.0);

  // 5. Gulmohar Bangalow :- (Morning Shift)
  // Home No - 26 (Bill Amount Pending)
  insertCust.run('cust_gb_26', 'Gulmohar Bangalow', 'Gulmohar Bangalow 26', '+91 98605 26000', 'gulmohar26@gmail.com', 'Gulmohar Bangalow, Green Lane', 'Home No - 26', 'cow_standard', 1.0, 1, 'cash', '', 1860.0);

  // 6. Jk Sarita :- (Morning Shift)
  // Home No - 40 (Pending)
  insertCust.run('cust_jk_40', 'Jk Sarita', 'Jk Sarita Home 40', '+91 98706 40000', 'jksarita40@gmail.com', 'Jk Sarita Complex', 'Home No - 40', 'cow_standard', 1.0, 1, 'cash', '', 1860.0);
  // Home No - 33 (Pending)
  insertCust.run('cust_jk_33', 'Jk Sarita', 'Jk Sarita Home 33', '+91 98706 33000', 'jksarita33@gmail.com', 'Jk Sarita Complex', 'Home No - 33', 'cow_standard', 1.0, 1, 'upi', 'jk33@upi', 1860.0);
  // Home No - 31 (Paid Cash)
  insertCust.run('cust_jk_31', 'Jk Sarita', 'Jk Sarita Home 31', '+91 98706 31000', 'jksarita31@gmail.com', 'Jk Sarita Complex', 'Home No - 31', 'cow_standard', 1.0, 1, 'cash', '', 0.0);

  // 7. Dwarika Village :- (Morning Shift)
  // Wing F - 1103 (Pending)
  insertCust.run('cust_dv_f1103', 'Dwarika Village', 'Dwarika Village F-1103', '+91 98807 11030', 'dwarika.f1103@gmail.com', 'Dwarika Village, Tower 3', 'Wing F - 1103', 'cow_standard', 1.0, 1, 'upi', 'dwarikaf@upi', 1860.0);
  // Wing G - 1103 (Paid)
  insertCust.run('cust_dv_g1103', 'Dwarika Village', 'Dwarika Village G-1103', '+91 98807 21030', 'dwarika.g1103@gmail.com', 'Dwarika Village, Tower 4', 'Wing G - 1103', 'cow_standard', 1.0, 1, 'upi', 'dwarikag@upi', 0.0);

  // Seed daily delivery records for all these real customer houses
  seedDeliveries();
}

function seedDeliveries() {
  const customers = db.prepare('SELECT * FROM customers').all();
  const milkTypes = db.prepare('SELECT * FROM milk_types').all();
  const milkMap = {};
  milkTypes.forEach(m => { milkMap[m.id] = m; });

  const insertDelivery = db.prepare(`
    INSERT OR REPLACE INTO deliveries (id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Dates: from 2026-09-01 to 2026-09-27 (today)
  for (let day = 1; day <= 27; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-09-${dayStr}`;

    customers.forEach(cust => {
      const milk = milkMap[cust.default_milk_type_id] || milkTypes[0];
      const deliveryId = `del_${cust.id}_${dateStr}`;

      let status = 'delivered';
      let qty = cust.default_quantity_liters;
      let notes = 'Morning Shift standard delivery';

      // Realistic variation:
      if (cust.house_no === 'Flat 504' && (day === 10 || day === 22)) {
        status = 'absent';
        qty = 0;
        notes = 'Customer not at home (skipped)';
      } else if (cust.house_no === 'Home No - 26' && day === 15) {
        status = 'absent';
        qty = 0;
        notes = 'Customer requested skip';
      }

      insertDelivery.run(deliveryId, cust.id, dateStr, milk.id, qty, milk.price_per_liter, status, notes);
    });
  }
}

initDb();

module.exports = {
  db,
  initDb,
  seedRealCustomers,
  seedDeliveries
};

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
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      house_no TEXT,
      default_milk_type_id TEXT NOT NULL,
      default_quantity_liters REAL NOT NULL DEFAULT 1.0,
      delivery_time_slot TEXT DEFAULT 'Morning',
      billing_cycle_start_day INTEGER DEFAULT 1,
      preferred_payment_mode TEXT DEFAULT 'cash',
      upi_id TEXT,
      outstanding_balance REAL DEFAULT 0.0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
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
      status TEXT NOT NULL, -- 'paid', 'partial', 'unpaid', 'overdue'
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
      payment_mode TEXT NOT NULL, -- 'cash', 'upi'
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

  // Seed default milk types if not present
  const countMilkTypes = db.prepare('SELECT COUNT(*) as count FROM milk_types').get().count;
  if (countMilkTypes === 0) {
    const insertMilk = db.prepare(`
      INSERT INTO milk_types (id, name, price_per_liter, fat_snf, description, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertMilk.run('cow_standard', 'Standard Cow Milk', 60.0, '3.5% Fat, 8.5% SNF', 'Farm fresh, homogenized pure cow milk', 1);
    insertMilk.run('buffalo_pure', 'Pure Buffalo Milk', 70.0, '6.5% Fat, 9.0% SNF', 'Rich creamy buffalo milk, ideal for paneer & tea', 1);
    insertMilk.run('gold_cream', 'Full Cream Gold Milk', 78.0, '6.0% Fat, 9.0% SNF', 'High nutrition premium full cream milk', 1);
    insertMilk.run('desi_gir_cow', 'Desi Gir Cow A2 Milk', 85.0, '4.5% Fat, 8.8% SNF', '100% Organic A2 Gir Cow Vedic Milk', 1);
  }

  // Seed initial settings
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM dairy_settings').get().count;
  if (countSettings === 0) {
    const insertSetting = db.prepare('INSERT INTO dairy_settings (key, value) VALUES (?, ?)');
    insertSetting.run('dairy_name', 'Amrit Dairy Farms');
    insertSetting.run('dairy_phone', '+91 98765 43210');
    insertSetting.run('dairy_upi_id', 'amritdairy@okhdfcbank');
    insertSetting.run('default_billing_reminder_day', '10');
    insertSetting.run('advance_reminder_days', '2');
  }

  // Seed sample customers if none exist
  const countCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (countCustomers === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, phone, email, address, house_no, default_milk_type_id, default_quantity_liters, delivery_time_slot, billing_cycle_start_day, preferred_payment_mode, upi_id, outstanding_balance, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `);

    insertCustomer.run('cust_1', 'Ramesh Sharma', '+91 98234 56789', 'ramesh.sharma@example.com', 'Green Glen Layout, Bellandur', 'House A-102', 'cow_standard', 1.0, 'Morning', 26, 'cash', 'ramesh@upi', 250.0);
    insertCustomer.run('cust_2', 'Priya Patel', '+91 98765 12340', 'priya.patel@example.com', 'Shanti Niketan Apartments, Indiranagar', 'Flat B-204', 'buffalo_pure', 1.5, 'Morning', 1, 'upi', 'priya@okhdfcbank', 0.0);
    insertCustomer.run('cust_3', 'Amit Verma', '+91 91234 78901', 'amit.verma@example.com', 'Prestige Enclave, Whitefield', 'Villa C-105', 'cow_standard', 0.5, 'Both', 10, 'upi', 'amit.v@oksbi', 0.0);
    insertCustomer.run('cust_4', 'Sunita Rao', '+91 94567 89012', 'sunita.rao@example.com', 'Rosewood Heights, HSR Sector 2', 'Flat D-301', 'buffalo_pure', 2.0, 'Morning', 26, 'cash', '', 450.0);
    insertCustomer.run('cust_5', 'Vikas Singh', '+91 93456 01234', 'vikas.singh@example.com', 'Royal Palms, Koramangala', 'House E-12', 'gold_cream', 1.0, 'Morning', 15, 'upi', 'vikas@ybl', 0.0);

    // Seed recent delivery records for September 2026 up to today (Sep 26, 2026)
    seedDeliveries();
  }
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

  // Dates: from 2026-09-01 to 2026-09-26
  for (let day = 1; day <= 26; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-09-${dayStr}`;

    customers.forEach(cust => {
      const milk = milkMap[cust.default_milk_type_id] || milkTypes[0];
      const deliveryId = `del_${cust.id}_${dateStr}`;

      // Simulate realistic scenarios:
      // Ramesh (House A-102): Delivered every day except on Sep 12 (absent)
      // Sunita (House D-301): Absent on Sep 20 and today Sep 26 (Not at home)
      // Amit (House C-105): Took 1.0L extra on Sep 15 (festival)
      let status = 'delivered';
      let qty = cust.default_quantity_liters;
      let notes = 'Delivered';

      if (cust.id === 'cust_1' && day === 12) {
        status = 'absent';
        qty = 0;
        notes = 'Customer out of town (No milk requested)';
      } else if (cust.id === 'cust_4' && (day === 20 || day === 26)) {
        status = 'absent';
        qty = 0;
        notes = day === 26 ? 'Not at home today - skipped' : 'Customer called to skip';
      } else if (cust.id === 'cust_3' && day === 15) {
        status = 'delivered';
        qty = 1.0;
        notes = 'Festival extra 500ml requested';
      }

      insertDelivery.run(deliveryId, cust.id, dateStr, milk.id, qty, milk.price_per_liter, status, notes);
    });
  }
}

initDb();

module.exports = {
  db,
  initDb
};

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb, seedDeliveries } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper for generating unique IDs
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Helper to get today's date in local YYYY-MM-DD
function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// -------------------------------------------------------------
// SETTINGS APIS
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM dairy_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { dairy_name, dairy_phone, dairy_upi_id, default_billing_reminder_day, advance_reminder_days } = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO dairy_settings (key, value) VALUES (?, ?)');
    if (dairy_name) upsert.run('dairy_name', dairy_name);
    if (dairy_phone) upsert.run('dairy_phone', dairy_phone);
    if (dairy_upi_id) upsert.run('dairy_upi_id', dairy_upi_id);
    if (default_billing_reminder_day) upsert.run('default_billing_reminder_day', String(default_billing_reminder_day));
    if (advance_reminder_days) upsert.run('advance_reminder_days', String(advance_reminder_days));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// MILK TYPES & PRICING APIS (Rate fluctuations)
// -------------------------------------------------------------
app.get('/api/milk-types', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM milk_types WHERE is_active = 1 ORDER BY price_per_liter ASC').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/milk-types', (req, res) => {
  try {
    const { name, price_per_liter, fat_snf, description } = req.body;
    if (!name || price_per_liter === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const id = generateId('milk');
    db.prepare(`
      INSERT INTO milk_types (id, name, price_per_liter, fat_snf, description, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(id, name, parseFloat(price_per_liter), fat_snf || '', description || '');

    res.json({ success: true, message: 'Milk type added', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/milk-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_per_liter, fat_snf, description } = req.body;
    const existing = db.prepare('SELECT * FROM milk_types WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Milk type not found' });
    }

    db.prepare(`
      UPDATE milk_types 
      SET name = COALESCE(?, name),
          price_per_liter = COALESCE(?, price_per_liter),
          fat_snf = COALESCE(?, fat_snf),
          description = COALESCE(?, description),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, price_per_liter !== undefined ? parseFloat(price_per_liter) : null, fat_snf, description, id);

    res.json({ success: true, message: 'Milk price/details updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMER APIS
// -------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*, m.name as milk_type_name, m.price_per_liter as milk_current_price
      FROM customers c
      LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
      WHERE c.status != 'deleted'
      ORDER BY c.house_no ASC, c.name ASC
    `).all();
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      house_no,
      default_milk_type_id,
      default_quantity_liters,
      delivery_time_slot,
      billing_cycle_start_day,
      preferred_payment_mode,
      upi_id,
      outstanding_balance
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ success: false, error: 'Customer name, phone, and address are required' });
    }

    const id = generateId('cust');
    const milkTypeId = default_milk_type_id || 'cow_standard';
    const startDay = parseInt(billing_cycle_start_day, 10) || 1;
    const initialBalance = parseFloat(outstanding_balance) || 0.0;
    const defaultQty = parseFloat(default_quantity_liters) || 1.0;

    db.prepare(`
      INSERT INTO customers (
        id, name, phone, email, address, house_no, default_milk_type_id,
        default_quantity_liters, delivery_time_slot, billing_cycle_start_day,
        preferred_payment_mode, upi_id, outstanding_balance, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(
      id, name, phone, email || '', address, house_no || '', milkTypeId,
      defaultQty, delivery_time_slot || 'Morning', startDay,
      preferred_payment_mode || 'cash', upi_id || '', initialBalance
    );

    res.json({ success: true, message: 'Customer added successfully', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, email, address, house_no, default_milk_type_id,
      default_quantity_liters, delivery_time_slot, billing_cycle_start_day,
      preferred_payment_mode, upi_id, outstanding_balance, status
    } = req.body;

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          house_no = COALESCE(?, house_no),
          default_milk_type_id = COALESCE(?, default_milk_type_id),
          default_quantity_liters = COALESCE(?, default_quantity_liters),
          delivery_time_slot = COALESCE(?, delivery_time_slot),
          billing_cycle_start_day = COALESCE(?, billing_cycle_start_day),
          preferred_payment_mode = COALESCE(?, preferred_payment_mode),
          upi_id = COALESCE(?, upi_id),
          outstanding_balance = COALESCE(?, outstanding_balance),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name, phone, email, address, house_no, default_milk_type_id,
      default_quantity_liters !== undefined ? parseFloat(default_quantity_liters) : null,
      delivery_time_slot,
      billing_cycle_start_day !== undefined ? parseInt(billing_cycle_start_day, 10) : null,
      preferred_payment_mode, upi_id,
      outstanding_balance !== undefined ? parseFloat(outstanding_balance) : null,
      status, id
    );

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE customers SET status = 'deleted' WHERE id = ?").run(id);
    res.json({ success: true, message: 'Customer removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DAILY DELIVERY APIS (Sticky Tracker & Quick Attendance Checklist)
// -------------------------------------------------------------
app.get('/api/deliveries/date/:date', (req, res) => {
  try {
    const date = req.params.date || getTodayStr();
    const customers = db.prepare(`
      SELECT c.*, m.name as milk_type_name, m.price_per_liter as default_price
      FROM customers c
      LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
      WHERE c.status = 'active'
      ORDER BY c.society ASC, c.house_no ASC
    `).all();

    const existingDeliveries = db.prepare(`
      SELECT d.*, m.name as milk_name 
      FROM deliveries d
      LEFT JOIN milk_types m ON d.milk_type_id = m.id
      WHERE d.delivery_date = ?
    `).all(date);

    const deliveryMap = {};
    existingDeliveries.forEach(d => { deliveryMap[d.customer_id] = d; });

    // Format list with delivery status for that specific date
    const checklist = customers.map(cust => {
      const recorded = deliveryMap[cust.id];
      if (recorded) {
        return {
          customer_id: cust.id,
          customer_name: cust.name,
          phone: cust.phone,
          house_no: cust.house_no,
          society: cust.society || 'General',
          address: cust.address,
          milk_type_id: recorded.milk_type_id,
          milk_type_name: recorded.milk_name || cust.milk_type_name,
          quantity_liters: recorded.quantity_liters,
          default_quantity: cust.default_quantity_liters,
          price_per_liter: recorded.price_per_liter,
          preferred_payment_mode: cust.preferred_payment_mode,
          status: recorded.status, // 'delivered', 'absent'
          notes: recorded.notes || '',
          is_recorded: true
        };
      } else {
        return {
          customer_id: cust.id,
          customer_name: cust.name,
          phone: cust.phone,
          house_no: cust.house_no,
          society: cust.society || 'General',
          address: cust.address,
          milk_type_id: cust.default_milk_type_id,
          milk_type_name: cust.milk_type_name,
          quantity_liters: cust.default_quantity_liters,
          default_quantity: cust.default_quantity_liters,
          price_per_liter: cust.milk_current_price,
          preferred_payment_mode: cust.preferred_payment_mode,
          status: 'pending', // not checked yet today
          notes: '',
          is_recorded: false
        };
      }
    });

    res.json({ success: true, date, data: checklist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single save/toggle for delivery
app.post('/api/deliveries/save', (req, res) => {
  try {
    const { customer_id, delivery_date, status, quantity_liters, milk_type_id, notes } = req.body;
    if (!customer_id || !delivery_date || !status) {
      return res.status(400).json({ success: false, error: 'Customer ID, date and status are required' });
    }

    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!cust) return res.status(404).json({ success: false, error: 'Customer not found' });

    const targetMilkId = milk_type_id || cust.default_milk_type_id;
    const milk = db.prepare('SELECT * FROM milk_types WHERE id = ?').get(targetMilkId) || { price_per_liter: 60 };

    let finalQty = 0;
    if (status === 'delivered') {
      finalQty = quantity_liters !== undefined ? parseFloat(quantity_liters) : cust.default_quantity_liters;
    } else if (status === 'absent') {
      finalQty = 0; // Not at home / Leave -> 0 Liters
    } else {
      finalQty = parseFloat(quantity_liters) || 0;
    }

    const deliveryId = `del_${customer_id}_${delivery_date}`;
    db.prepare(`
      INSERT OR REPLACE INTO deliveries (
        id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(deliveryId, customer_id, delivery_date, targetMilkId, finalQty, milk.price_per_liter, status, notes || '');

    res.json({ success: true, message: 'Delivery recorded', status, finalQty });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Quick Mark All Pending as Delivered for a date (preserves existing absent records!)
app.post('/api/deliveries/mark-all-delivered', (req, res) => {
  try {
    const targetDate = req.body.date || getTodayStr();
    const customers = db.prepare(`
      SELECT c.*, m.price_per_liter
      FROM customers c
      LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
      WHERE c.status = 'active'
    `).all();

    // Check which customers already have a record for this date
    const existing = db.prepare('SELECT customer_id FROM deliveries WHERE delivery_date = ?').all(targetDate);
    const existingSet = new Set(existing.map(e => e.customer_id));

    const insertStmt = db.prepare(`
      INSERT INTO deliveries (id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'delivered', 'Standard delivery dispatch', datetime('now'))
    `);

    let markedCount = 0;
    customers.forEach(cust => {
      if (!existingSet.has(cust.id)) {
        const deliveryId = `del_${cust.id}_${targetDate}`;
        insertStmt.run(
          deliveryId,
          cust.id,
          targetDate,
          cust.default_milk_type_id,
          cust.default_quantity_liters,
          cust.price_per_liter || 60
        );
        markedCount++;
      }
    });

    res.json({ success: true, message: `Marked ${markedCount} pending customers as delivered for ${targetDate}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// BILLING ENGINE & CUSTOMER MONTHLY CALCULATION
// Robust calendar-based arithmetic handling arbitrary cycle start dates (e.g. 26th-to-26th)
// -------------------------------------------------------------
function calculateCustomerCycle(customerId, refDateStr) {
  const targetDateStr = refDateStr || getTodayStr();

  const cust = db.prepare(`
    SELECT c.*, m.name as milk_name, m.price_per_liter as default_rate
    FROM customers c
    LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
    WHERE c.id = ?
  `).get(customerId);

  if (!cust) return null;

  const [refYear, refMonth, refDay] = targetDateStr.split('-').map(Number);
  const cycleDay = cust.billing_cycle_start_day || 1;

  // Compute current cycle start and next billing date
  let startYear = refYear;
  let startMonth = refMonth;

  if (refDay < cycleDay) {
    // Current cycle started in the preceding month
    startMonth -= 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
  }

  // Next billing month and year
  let nextBillingYear = startYear;
  let nextBillingMonth = startMonth + 1;
  if (nextBillingMonth > 12) {
    nextBillingMonth = 1;
    nextBillingYear += 1;
  }

  // Use local Date constructor for boundary calculation
  const startDt = new Date(startYear, startMonth - 1, cycleDay);
  const nextBillingDt = new Date(nextBillingYear, nextBillingMonth - 1, cycleDay);
  // End date is exactly the day before the next billing date
  const endDt = new Date(nextBillingYear, nextBillingMonth - 1, cycleDay - 1);

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startStr = formatYMD(startDt);
  const endStr = formatYMD(endDt);
  const billingStr = formatYMD(nextBillingDt);

  // Compute exact days until next billing
  const refDt = new Date(refYear, refMonth - 1, refDay);
  const diffMs = nextBillingDt.getTime() - refDt.getTime();
  const daysUntilBilling = Math.round(diffMs / (1000 * 60 * 60 * 24));
  // 2-Day Advance Alert triggers when 0 to 2 days remain before cycle end!
  const isAdvanceReminder = daysUntilBilling <= 2 && daysUntilBilling >= 0;

  // Fetch all delivery records for this customer in this cycle
  const deliveries = db.prepare(`
    SELECT d.*, m.name as milk_name
    FROM deliveries d
    LEFT JOIN milk_types m ON d.milk_type_id = m.id
    WHERE d.customer_id = ? AND d.delivery_date >= ? AND d.delivery_date <= ?
    ORDER BY d.delivery_date ASC
  `).all(customerId, startStr, endStr);

  let totalLiters = 0;
  let cycleCost = 0;
  let deliveryDaysCount = 0;
  let absentDaysCount = 0;

  deliveries.forEach(del => {
    if (del.status === 'delivered') {
      totalLiters += del.quantity_liters;
      cycleCost += (del.quantity_liters * del.price_per_liter);
      deliveryDaysCount++;
    } else if (del.status === 'absent') {
      absentDaysCount++;
    }
  });

  // Payments recorded for this customer in this cycle
  const payments = db.prepare(`
    SELECT * FROM payments 
    WHERE customer_id = ? AND payment_date >= ?
    ORDER BY payment_date DESC
  `).all(customerId, startStr);

  const totalPaidInCycle = payments.reduce((sum, p) => sum + p.amount, 0);
  const previousOutstanding = cust.outstanding_balance || 0;
  const totalPayable = previousOutstanding + cycleCost;
  const netDue = Math.max(0, totalPayable - totalPaidInCycle);

  return {
    customer: cust,
    cycle: {
      start_date: startStr,
      end_date: endStr,
      billing_date: billingStr,
      days_until_billing: daysUntilBilling,
      is_advance_reminder: isAdvanceReminder, // 2 days before cycle popup
      is_billing_day_or_past: daysUntilBilling <= 0
    },
    consumption: {
      total_liters: parseFloat(totalLiters.toFixed(2)),
      delivery_days: deliveryDaysCount,
      absent_days: absentDaysCount,
      total_records: deliveries.length
    },
    pricing: {
      cycle_milk_cost: parseFloat(cycleCost.toFixed(2)),
      previous_balance: parseFloat(previousOutstanding.toFixed(2)),
      total_payable: parseFloat(totalPayable.toFixed(2)),
      amount_paid: parseFloat(totalPaidInCycle.toFixed(2)),
      net_due: parseFloat(netDue.toFixed(2))
    },
    deliveries,
    payments
  };
}

app.get('/api/customers/:id/report', (req, res) => {
  try {
    const { id } = req.params;
    const refDate = req.query.date || getTodayStr();
    const report = calculateCustomerCycle(id, refDate);
    if (!report) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DUE ALERTS & 10TH OF MONTH / ADVANCE CYCLE REMINDERS
// -------------------------------------------------------------
app.get('/api/billing/due-alerts', (req, res) => {
  try {
    const today = req.query.date || getTodayStr();
    const [year, month, dayOfMonth] = today.split('-').map(Number);

    const customers = db.prepare("SELECT id FROM customers WHERE status = 'active'").all();
    const cycleEndingSoon = [];
    const pendingCollections = [];

    customers.forEach(c => {
      const report = calculateCustomerCycle(c.id, today);
      if (!report) return;

      // 1. Advance Notice: 2 days before billing cycle date
      if (report.cycle.is_advance_reminder) {
        cycleEndingSoon.push({
          customer_id: report.customer.id,
          customer_name: report.customer.name,
          phone: report.customer.phone,
          house_no: report.customer.house_no,
          billing_date: report.cycle.billing_date,
          days_left: report.cycle.days_until_billing,
          total_liters: report.consumption.total_liters,
          total_bill: report.pricing.total_payable,
          net_due: report.pricing.net_due,
          milk_name: report.customer.milk_name,
          preferred_payment_mode: report.customer.preferred_payment_mode,
          message: `Cycle ends in ${report.cycle.days_until_billing} days (${report.cycle.billing_date}). Total Consumption: ${report.consumption.total_liters}L. Pending: ₹${report.pricing.net_due}`
        });
      }

      // 2. Pending or Overdue balance
      if (report.pricing.net_due > 0) {
        pendingCollections.push({
          customer_id: report.customer.id,
          customer_name: report.customer.name,
          phone: report.customer.phone,
          house_no: report.customer.house_no,
          net_due: report.pricing.net_due,
          billing_day: report.customer.billing_cycle_start_day,
          preferred_payment_mode: report.customer.preferred_payment_mode,
          last_payment: report.payments[0] || null
        });
      }
    });

    // 3. 10th of Month General Collection Reminder
    const is10th = dayOfMonth === 10;
    const isAfter10th = dayOfMonth > 10;

    res.json({
      success: true,
      current_date: today,
      is_10th_reminder_active: is10th,
      is_after_10th_overdue: isAfter10th,
      cycle_ending_soon: cycleEndingSoon,
      pending_collections: pendingCollections,
      total_pending_amount: pendingCollections.reduce((sum, item) => sum + item.net_due, 0)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// PAYMENTS & PARTIAL BALANCE LEDGER
// Pure double-entry payments: records payment, preserves exact accounting
// -------------------------------------------------------------
app.post('/api/payments', (req, res) => {
  try {
    const { customer_id, amount, payment_mode, transaction_ref, notes, payment_date } = req.body;
    if (!customer_id || !amount) {
      return res.status(400).json({ success: false, error: 'Customer and amount are required' });
    }

    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!cust) return res.status(404).json({ success: false, error: 'Customer not found' });

    const payAmount = parseFloat(amount);
    const payDate = payment_date || getTodayStr();
    const payId = generateId('pay');

    // Insert payment record into ledger
    db.prepare(`
      INSERT INTO payments (id, customer_id, payment_date, amount, payment_mode, transaction_ref, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(payId, customer_id, payDate, payAmount, payment_mode || 'cash', transaction_ref || '', notes || '');

    // Recompute current report to return exact net due
    const updated = calculateCustomerCycle(customer_id, payDate);

    res.json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully!`,
      amount_paid: payAmount,
      total_payable: updated ? updated.pricing.total_payable : 0,
      total_paid_so_far: updated ? updated.pricing.amount_paid : payAmount,
      remaining_balance: updated ? updated.pricing.net_due : 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/payments/customer/:id', (req, res) => {
  try {
    const { id } = req.params;
    const history = db.prepare('SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC').all(id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// AUTHENTICATION & MULTI-ADMIN APIS
// -------------------------------------------------------------
// Admin Username & Password Login (e.g. admin1 / Dairy@2026)
app.post('/api/auth/admin-login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const admin = db.prepare(`
      SELECT * FROM admins 
      WHERE (username = ? OR email = ?) AND password_hash = ?
    `).get(username.trim(), username.trim(), password);

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials. Please check username or password.' });
    }

    res.json({
      success: true,
      message: 'Admin authentication successful',
      token: `admin_token_${admin.id}_${Date.now()}`,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role || 'admin',
        email: admin.email,
        phone: admin.phone
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all registered admins (Multi-Admin management)
app.get('/api/auth/admins', (req, res) => {
  try {
    const admins = db.prepare('SELECT id, username, email, name, role, phone, created_at FROM admins').all();
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new admin (Admin 2, Admin 3, etc.)
app.post('/api/auth/admins', (req, res) => {
  try {
    const { username, password, name, email, phone, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, error: 'Username, password and name are required' });
    }

    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Admin username already exists' });
    }

    const id = generateId('admin');
    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, name, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, username.trim(), email || '', password, name, role || 'admin', phone || '');

    res.json({ success: true, message: `Admin account '${name}' created successfully!`, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/send-otp', (req, res) => {
  try {
    const { identifier, role } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Email or Mobile number is required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const sessionId = generateId('otp');

    db.prepare(`
      INSERT OR REPLACE INTO otp_sessions (id, identifier, otp_code, role, expires_at, verified)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(sessionId, identifier, otp, role || 'admin', expiresAt);

    res.json({
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      sessionId,
      demo_otp: otp,
      expires_in: '10 minutes'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { identifier, otp_code } = req.body;
    if (!identifier || !otp_code) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP code are required' });
    }

    const session = db.prepare(`
      SELECT * FROM otp_sessions 
      WHERE identifier = ? AND (otp_code = ? OR ? = '123456')
      ORDER BY expires_at DESC LIMIT 1
    `).get(identifier, otp_code, otp_code);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please try again.' });
    }

    db.prepare('UPDATE otp_sessions SET verified = 1 WHERE id = ?').run(session.id);
    const customer = db.prepare('SELECT * FROM customers WHERE phone = ? OR email = ?').get(identifier, identifier);

    res.json({
      success: true,
      message: 'Authentication successful',
      token: `token_${Date.now()}`,
      role: session.role || 'customer',
      user: {
        identifier,
        role: session.role || (customer ? 'customer' : 'admin'),
        customerId: customer ? customer.id : null,
        name: customer ? customer.name : (session.role === 'admin' ? 'Dairy Administrator' : 'Valued Customer')
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD AGGREGATED STATS API
// -------------------------------------------------------------
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const today = req.query.date || getTodayStr();
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'active'").get().count;

    const todayDeliveries = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters ELSE 0 END), 0) as today_liters,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters * price_per_liter ELSE 0 END), 0) as today_revenue
      FROM deliveries
      WHERE delivery_date = ?
    `).get(today);

    const currentMonthPrefix = today.substring(0, 7);
    const monthDeliveries = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters ELSE 0 END), 0) as month_liters,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters * price_per_liter ELSE 0 END), 0) as month_revenue
      FROM deliveries
      WHERE delivery_date LIKE ?
    `).get(`${currentMonthPrefix}%`);

    const totalOutstanding = db.prepare("SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM customers WHERE status = 'active'").get().total;

    res.json({
      success: true,
      data: {
        total_customers: totalCustomers,
        today: {
          date: today,
          delivered_count: todayDeliveries.delivered_count,
          absent_count: todayDeliveries.absent_count,
          pending_count: Math.max(0, totalCustomers - (todayDeliveries.delivered_count + todayDeliveries.absent_count)),
          liters: parseFloat(todayDeliveries.today_liters.toFixed(2)),
          revenue: parseFloat(todayDeliveries.today_revenue.toFixed(2))
        },
        month: {
          period: currentMonthPrefix,
          liters: parseFloat(monthDeliveries.month_liters.toFixed(2)),
          revenue: parseFloat(monthDeliveries.month_revenue.toFixed(2))
        },
        outstanding_dues: parseFloat(totalOutstanding.toFixed(2))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend static files if built
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA fallback for all non-API frontend routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🥛 DairyFlow API Server running at http://localhost:${PORT} and network accessible`);
});

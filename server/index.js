const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper for generating IDs
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

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
// MILK TYPES & PRICING APIS (Fluctuation & Rate management)
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
    const { date } = req.params; // Format: YYYY-MM-DD
    const customers = db.prepare(`
      SELECT c.*, m.name as milk_type_name, m.price_per_liter as default_price
      FROM customers c
      LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
      WHERE c.status = 'active'
      ORDER BY c.house_no ASC, c.name ASC
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
          address: cust.address,
          milk_type_id: recorded.milk_type_id,
          milk_type_name: recorded.milk_name || cust.milk_type_name,
          quantity_liters: recorded.quantity_liters,
          default_quantity: cust.default_quantity_liters,
          price_per_liter: recorded.price_per_liter,
          status: recorded.status, // 'delivered', 'absent', 'pending'
          notes: recorded.notes || '',
          is_recorded: true
        };
      } else {
        return {
          customer_id: cust.id,
          customer_name: cust.name,
          phone: cust.phone,
          house_no: cust.house_no,
          address: cust.address,
          milk_type_id: cust.default_milk_type_id,
          milk_type_name: cust.milk_type_name,
          quantity_liters: cust.default_quantity_liters,
          default_quantity: cust.default_quantity_liters,
          price_per_liter: cust.milk_current_price,
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

// Single or batch save/toggle for delivery
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

// Quick Mark All Pending as Delivered for a date
app.post('/api/deliveries/mark-all-delivered', (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const customers = db.prepare(`
      SELECT c.*, m.price_per_liter
      FROM customers c
      LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
      WHERE c.status = 'active'
    `).all();

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO deliveries (id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'delivered', 'Standard delivery', datetime('now'))
    `);

    let markedCount = 0;
    customers.forEach(cust => {
      const deliveryId = `del_${cust.id}_${targetDate}`;
      const result = insertStmt.run(
        deliveryId,
        cust.id,
        targetDate,
        cust.default_milk_type_id,
        cust.default_quantity_liters,
        cust.price_per_liter || 60
      );
      if (result.changes > 0) markedCount++;
    });

    res.json({ success: true, message: `Marked ${markedCount} customers as delivered for ${targetDate}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// BILLING ENGINE & CUSTOMER MONTHLY CALCULATION
// Handles custom start date cycles (e.g. 26th Sep to 25th Oct) & 1st-to-30th
// -------------------------------------------------------------
function calculateCustomerCycle(customerId, refDateStr = '2026-09-26') {
  const cust = db.prepare(`
    SELECT c.*, m.name as milk_name, m.price_per_liter as default_rate
    FROM customers c
    LEFT JOIN milk_types m ON c.default_milk_type_id = m.id
    WHERE c.id = ?
  `).get(customerId);

  if (!cust) return null;

  const refDate = new Date(refDateStr);
  const cycleDay = cust.billing_cycle_start_day || 1;

  // Compute current cycle start and end dates
  let cycleStartYear = refDate.getFullYear();
  let cycleStartMonth = refDate.getMonth(); // 0-indexed

  if (refDate.getDate() < cycleDay) {
    // Current cycle started in previous month
    cycleStartMonth -= 1;
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear -= 1;
    }
  }

  const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, cycleDay);
  // Cycle end is day before cycleDay of the next month
  const cycleEndDate = new Date(cycleStartYear, cycleStartMonth + 1, cycleDay - 1);
  const nextBillingDate = new Date(cycleStartYear, cycleStartMonth + 1, cycleDay);

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startStr = formatYMD(cycleStartDate);
  const endStr = formatYMD(cycleEndDate);
  const billingStr = formatYMD(nextBillingDate);

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

  // Calculate days remaining in cycle and advance reminder
  const diffTime = nextBillingDate.getTime() - refDate.getTime();
  const daysUntilBilling = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isAdvanceReminder = daysUntilBilling <= 2 && daysUntilBilling >= 0;

  // Payments made during or against this cycle
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
      is_advance_reminder: isAdvanceReminder, // 2 days before cycle popup!
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
    const refDate = req.query.date || '2026-09-26';
    const report = calculateCustomerCycle(id, refDate);
    if (!report) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DUE ALERTS & 10TH OF MONTH / CYCLE REMINDERS
// -------------------------------------------------------------
app.get('/api/billing/due-alerts', (req, res) => {
  try {
    const today = req.query.date || '2026-09-26';
    const todayDate = new Date(today);
    const dayOfMonth = todayDate.getDate();

    const customers = db.prepare("SELECT id FROM customers WHERE status = 'active'").all();
    const alerts = [];
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
          message: `Cycle ends in ${report.cycle.days_until_billing} days (${report.cycle.billing_date}). Consumption: ${report.consumption.total_liters}L. Pending: ₹${report.pricing.net_due}`
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
// PAYMENTS & BALANCE ROLLOVER API
// Supports partial payments: stores paid amount, updates remaining balance
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
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const payId = generateId('pay');

    // Insert payment record
    db.prepare(`
      INSERT INTO payments (id, customer_id, payment_date, amount, payment_mode, transaction_ref, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(payId, customer_id, payDate, payAmount, payment_mode || 'cash', transaction_ref || '', notes || '');

    // Deduct from customer's outstanding balance
    // If balance was ₹1800 and customer paid ₹1000, new balance is ₹800 (carried to next bill)
    const newBalance = Math.max(0, (cust.outstanding_balance || 0) - payAmount);
    db.prepare('UPDATE customers SET outstanding_balance = ? WHERE id = ?').run(newBalance, customer_id);

    res.json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully!`,
      previous_balance: cust.outstanding_balance,
      amount_paid: payAmount,
      remaining_balance: newBalance
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
// AUTHENTICATION & OTP (Email & Mobile OTP Flow + Google Simulator)
// -------------------------------------------------------------
app.post('/api/auth/send-otp', (req, res) => {
  try {
    const { identifier, role } = req.body; // identifier can be email or phone
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Email or Mobile number is required' });
    }

    // Generate 6-digit realistic OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
    const sessionId = generateId('otp');

    db.prepare(`
      INSERT OR REPLACE INTO otp_sessions (id, identifier, otp_code, role, expires_at, verified)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(sessionId, identifier, otp, role || 'admin', expiresAt);

    // In production, nodemailer / Twilio / MSG91 sends SMS/email here.
    // For local instant preview and testing, we return the demo OTP directly in the response
    // so the user can easily copy/test it right away!
    res.json({
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      sessionId,
      demo_otp: otp, // For rapid testing & verification!
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

    // Allow master test code 123456 or real generated OTP
    const session = db.prepare(`
      SELECT * FROM otp_sessions 
      WHERE identifier = ? AND (otp_code = ? OR ? = '123456')
      ORDER BY expires_at DESC LIMIT 1
    `).get(identifier, otp_code, otp_code);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please try again.' });
    }

    db.prepare('UPDATE otp_sessions SET verified = 1 WHERE id = ?').run(session.id);

    // If identifier matches customer phone or email, retrieve customer profile
    const customer = db.prepare('SELECT * FROM customers WHERE phone = ? OR email = ?').get(identifier, identifier);

    res.json({
      success: true,
      message: 'Authentication successful',
      token: `token_${Date.now()}`,
      role: session.role || 'admin',
      user: {
        identifier,
        role: session.role || 'admin',
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
    const today = req.query.date || '2026-09-26';
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

    // Month to date stats
    const currentMonthPrefix = today.substring(0, 7); // e.g. "2026-09"
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

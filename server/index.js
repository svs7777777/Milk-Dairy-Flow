const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./db');

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
// MILK TYPES & PRICING APIS (Admin can change rates anytime)
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

    res.json({ success: true, message: 'Milk type added successfully', id });
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

    res.json({ success: true, message: `Rate for ${name || existing.name} updated to ₹${price_per_liter}/L` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMER APIS (Supports Two Types of Milk per Customer)
// -------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*, 
        m1.name as milk_type_name, 
        COALESCE(c.custom_price_per_liter, m1.price_per_liter) as milk_current_price,
        m2.name as milk_type_2_name,
        COALESCE(c.custom_price_2_per_liter, m2.price_per_liter) as milk_2_current_price
      FROM customers c
      LEFT JOIN milk_types m1 ON c.default_milk_type_id = m1.id
      LEFT JOIN milk_types m2 ON c.default_milk_type_2_id = m2.id
      WHERE c.status != 'deleted'
      ORDER BY c.society ASC, c.house_no ASC
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
      society,
      house_no,
      default_milk_type_id,
      default_quantity_liters,
      custom_price_per_liter,
      default_milk_type_2_id,
      default_quantity_2_liters,
      custom_price_2_per_liter,
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
    const milkTypeId = default_milk_type_id || 'buffalo_pure';
    const startDay = parseInt(billing_cycle_start_day, 10) || 1;
    const initialBalance = parseFloat(outstanding_balance) || 0.0;
    const defaultQty = parseFloat(default_quantity_liters) || 1.0;
    const customPrice = custom_price_per_liter ? parseFloat(custom_price_per_liter) : null;
    const milkType2Id = default_milk_type_2_id || null;
    const defaultQty2 = parseFloat(default_quantity_2_liters) || 0.0;
    const customPrice2 = custom_price_2_per_liter ? parseFloat(custom_price_2_per_liter) : null;

    db.prepare(`
      INSERT INTO customers (
        id, society, name, phone, email, address, house_no,
        default_milk_type_id, default_quantity_liters, custom_price_per_liter,
        default_milk_type_2_id, default_quantity_2_liters, custom_price_2_per_liter,
        delivery_time_slot, billing_cycle_start_day, preferred_payment_mode,
        upi_id, outstanding_balance, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(
      id, society || 'General', name, phone, email || '', address, house_no || '',
      milkTypeId, defaultQty, customPrice,
      milkType2Id, defaultQty2, customPrice2,
      delivery_time_slot || 'Morning Shift', startDay,
      preferred_payment_mode || 'cash', upi_id || '', initialBalance
    );

    res.json({ success: true, message: 'Customer registered successfully', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, email, address, society, house_no,
      default_milk_type_id, default_quantity_liters, custom_price_per_liter,
      default_milk_type_2_id, default_quantity_2_liters, custom_price_2_per_liter,
      delivery_time_slot, billing_cycle_start_day,
      preferred_payment_mode, upi_id, outstanding_balance, status
    } = req.body;

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          society = COALESCE(?, society),
          house_no = COALESCE(?, house_no),
          default_milk_type_id = COALESCE(?, default_milk_type_id),
          default_quantity_liters = COALESCE(?, default_quantity_liters),
          custom_price_per_liter = ?,
          default_milk_type_2_id = ?,
          default_quantity_2_liters = COALESCE(?, default_quantity_2_liters),
          custom_price_2_per_liter = ?,
          delivery_time_slot = COALESCE(?, delivery_time_slot),
          billing_cycle_start_day = COALESCE(?, billing_cycle_start_day),
          preferred_payment_mode = COALESCE(?, preferred_payment_mode),
          upi_id = COALESCE(?, upi_id),
          outstanding_balance = COALESCE(?, outstanding_balance),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name, phone, email, address, society, house_no,
      default_milk_type_id,
      default_quantity_liters !== undefined ? parseFloat(default_quantity_liters) : null,
      custom_price_per_liter !== undefined ? (custom_price_per_liter ? parseFloat(custom_price_per_liter) : null) : null,
      default_milk_type_2_id || null,
      default_quantity_2_liters !== undefined ? parseFloat(default_quantity_2_liters) : null,
      custom_price_2_per_liter !== undefined ? (custom_price_2_per_liter ? parseFloat(custom_price_2_per_liter) : null) : null,
      delivery_time_slot,
      billing_cycle_start_day !== undefined ? parseInt(billing_cycle_start_day, 10) : null,
      preferred_payment_mode, upi_id,
      outstanding_balance !== undefined ? parseFloat(outstanding_balance) : null,
      status, id
    );

    res.json({ success: true, message: 'Customer profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE customers SET status = 'deleted' WHERE id = ?").run(id);
    res.json({ success: true, message: 'Customer archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DAILY DELIVERY APIS (Supports Two Types of Milk per Delivery)
// -------------------------------------------------------------
app.get('/api/deliveries/date/:date', (req, res) => {
  try {
    const date = req.params.date || getTodayStr();
    const customers = db.prepare(`
      SELECT c.*, 
        m1.name as milk_type_name, 
        COALESCE(c.custom_price_per_liter, m1.price_per_liter) as milk_current_price,
        m2.name as milk_type_2_name,
        COALESCE(c.custom_price_2_per_liter, m2.price_per_liter) as milk_2_current_price
      FROM customers c
      LEFT JOIN milk_types m1 ON c.default_milk_type_id = m1.id
      LEFT JOIN milk_types m2 ON c.default_milk_type_2_id = m2.id
      WHERE c.status = 'active'
      ORDER BY c.society ASC, c.house_no ASC
    `).all();

    const existingDeliveries = db.prepare(`
      SELECT d.*, m.name as milk_name 
      FROM deliveries d
      LEFT JOIN milk_types m ON d.milk_type_id = m.id
      WHERE d.delivery_date = ?
    `).all(date);

    // Map by customer_id and milk_type_id
    const deliveryMap = {};
    existingDeliveries.forEach(d => {
      if (!deliveryMap[d.customer_id]) deliveryMap[d.customer_id] = {};
      deliveryMap[d.customer_id][d.milk_type_id] = d;
    });

    const checklist = customers.map(cust => {
      const rec1 = deliveryMap[cust.id] ? deliveryMap[cust.id][cust.default_milk_type_id] : null;
      const rec2 = cust.default_milk_type_2_id && deliveryMap[cust.id] ? deliveryMap[cust.id][cust.default_milk_type_2_id] : null;

      const hasMultipleMilk = Boolean(cust.default_milk_type_2_id && cust.default_quantity_2_liters > 0);

      // Primary Milk Item
      const item1 = {
        milk_type_id: cust.default_milk_type_id,
        milk_name: cust.milk_type_name || 'Buffalo Milk',
        quantity_liters: rec1 ? rec1.quantity_liters : cust.default_quantity_liters,
        default_quantity: cust.default_quantity_liters,
        price_per_liter: rec1 ? rec1.price_per_liter : cust.milk_current_price,
        status: rec1 ? rec1.status : 'pending',
        notes: rec1?.notes || ''
      };

      // Secondary Milk Item (if applicable)
      const item2 = hasMultipleMilk ? {
        milk_type_id: cust.default_milk_type_2_id,
        milk_name: cust.milk_type_2_name || 'Cow Milk',
        quantity_liters: rec2 ? rec2.quantity_liters : cust.default_quantity_2_liters,
        default_quantity: cust.default_quantity_2_liters,
        price_per_liter: rec2 ? rec2.price_per_liter : cust.milk_2_current_price,
        status: rec2 ? rec2.status : 'pending',
        notes: rec2?.notes || ''
      } : null;

      // Overall status
      let overallStatus = 'pending';
      if (item1.status === 'delivered' && (!item2 || item2.status === 'delivered')) {
        overallStatus = 'delivered';
      } else if (item1.status === 'absent' && (!item2 || item2.status === 'absent')) {
        overallStatus = 'absent';
      } else if (rec1 || rec2) {
        overallStatus = item1.status;
      }

      const totalLiters = (item1.status === 'delivered' ? item1.quantity_liters : 0) +
                          (item2 && item2.status === 'delivered' ? item2.quantity_liters : 0);

      return {
        customer_id: cust.id,
        customer_name: cust.name,
        phone: cust.phone,
        house_no: cust.house_no,
        society: cust.society || 'General',
        address: cust.address,
        has_multiple_milk: hasMultipleMilk,
        item1,
        item2,
        // Legacy compatibility fields
        milk_type_id: item1.milk_type_id,
        milk_type_name: hasMultipleMilk ? `${item1.milk_name} + ${item2.milk_name}` : item1.milk_name,
        quantity_liters: totalLiters,
        default_quantity: cust.default_quantity_liters + (cust.default_quantity_2_liters || 0),
        price_per_liter: item1.price_per_liter,
        preferred_payment_mode: cust.preferred_payment_mode,
        status: overallStatus,
        notes: item1.notes,
        is_recorded: Boolean(rec1 || rec2)
      };
    });

    res.json({ success: true, date, data: checklist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single save/toggle for delivery (supports specifying milk_type_id)
app.post('/api/deliveries/save', (req, res) => {
  try {
    const { customer_id, delivery_date, status, quantity_liters, milk_type_id, notes } = req.body;
    if (!customer_id || !delivery_date || !status) {
      return res.status(400).json({ success: false, error: 'Customer ID, date and status are required' });
    }

    const cust = db.prepare(`
      SELECT c.*, 
        m1.price_per_liter as p1, 
        m2.price_per_liter as p2 
      FROM customers c
      LEFT JOIN milk_types m1 ON c.default_milk_type_id = m1.id
      LEFT JOIN milk_types m2 ON c.default_milk_type_2_id = m2.id
      WHERE c.id = ?
    `).get(customer_id);

    if (!cust) return res.status(404).json({ success: false, error: 'Customer not found' });

    const targetMilkId = milk_type_id || cust.default_milk_type_id;

    // Determine correct price
    let targetPrice = 60.0;
    if (targetMilkId === cust.default_milk_type_id) {
      targetPrice = cust.custom_price_per_liter || cust.p1 || 60.0;
    } else if (targetMilkId === cust.default_milk_type_2_id) {
      targetPrice = cust.custom_price_2_per_liter || cust.p2 || 56.0;
    } else {
      const milk = db.prepare('SELECT price_per_liter FROM milk_types WHERE id = ?').get(targetMilkId);
      targetPrice = milk ? milk.price_per_liter : 60.0;
    }

    let finalQty = 0;
    if (status === 'delivered') {
      if (quantity_liters !== undefined) {
        finalQty = parseFloat(quantity_liters);
      } else {
        finalQty = (targetMilkId === cust.default_milk_type_2_id) ? cust.default_quantity_2_liters : cust.default_quantity_liters;
      }
    } else if (status === 'absent') {
      finalQty = 0;
    } else {
      finalQty = parseFloat(quantity_liters) || 0;
    }

    const deliveryId = `del_${customer_id}_${delivery_date}_${targetMilkId}`;
    db.prepare(`
      INSERT OR REPLACE INTO deliveries (
        id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(deliveryId, customer_id, delivery_date, targetMilkId, finalQty, targetPrice, status, notes || '');

    res.json({ success: true, message: 'Delivery recorded', status, finalQty, milk_type_id: targetMilkId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark All Pending as Delivered for a date
app.post('/api/deliveries/mark-all-delivered', (req, res) => {
  try {
    const targetDate = req.body.date || getTodayStr();
    const customers = db.prepare(`
      SELECT c.*, 
        m1.price_per_liter as p1, 
        m2.price_per_liter as p2 
      FROM customers c
      LEFT JOIN milk_types m1 ON c.default_milk_type_id = m1.id
      LEFT JOIN milk_types m2 ON c.default_milk_type_2_id = m2.id
      WHERE c.status = 'active'
    `).all();

    const existing = db.prepare('SELECT customer_id, milk_type_id FROM deliveries WHERE delivery_date = ?').all(targetDate);
    const existingSet = new Set(existing.map(e => `${e.customer_id}_${e.milk_type_id}`));

    const insertStmt = db.prepare(`
      INSERT INTO deliveries (id, customer_id, delivery_date, milk_type_id, quantity_liters, price_per_liter, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'delivered', 'Standard delivery dispatch', datetime('now'))
    `);

    let markedCount = 0;
    customers.forEach(cust => {
      // Primary milk
      const key1 = `${cust.id}_${cust.default_milk_type_id}`;
      if (!existingSet.has(key1)) {
        const d1Id = `del_${cust.id}_${targetDate}_1`;
        const price1 = cust.custom_price_per_liter || cust.p1 || 60.0;
        insertStmt.run(d1Id, cust.id, targetDate, cust.default_milk_type_id, cust.default_quantity_liters, price1);
        markedCount++;
      }

      // Secondary milk (if customer has two types of milk)
      if (cust.default_milk_type_2_id && cust.default_quantity_2_liters > 0) {
        const key2 = `${cust.id}_${cust.default_milk_type_2_id}`;
        if (!existingSet.has(key2)) {
          const d2Id = `del_${cust.id}_${targetDate}_2`;
          const price2 = cust.custom_price_2_per_liter || cust.p2 || 56.0;
          insertStmt.run(d2Id, cust.id, targetDate, cust.default_milk_type_2_id, cust.default_quantity_2_liters, price2);
          markedCount++;
        }
      }
    });

    res.json({ success: true, message: `Dispatched deliveries for all customers for ${targetDate}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// BILLING ENGINE & CUSTOMER MONTHLY CALCULATION
// Full itemized breakdown by milk type & custom calendar cycle
// -------------------------------------------------------------
function calculateCustomerCycle(customerId, refDateStr) {
  const targetDateStr = refDateStr || getTodayStr();

  const cust = db.prepare(`
    SELECT c.*, 
      m1.name as milk_name, 
      COALESCE(c.custom_price_per_liter, m1.price_per_liter) as default_rate,
      m2.name as milk_2_name,
      COALESCE(c.custom_price_2_per_liter, m2.price_per_liter) as default_rate_2
    FROM customers c
    LEFT JOIN milk_types m1 ON c.default_milk_type_id = m1.id
    LEFT JOIN milk_types m2 ON c.default_milk_type_2_id = m2.id
    WHERE c.id = ?
  `).get(customerId);

  if (!cust) return null;

  const [refYear, refMonth, refDay] = targetDateStr.split('-').map(Number);
  const cycleDay = cust.billing_cycle_start_day || 1;

  let startYear = refYear;
  let startMonth = refMonth;

  if (refDay < cycleDay) {
    startMonth -= 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
  }

  let nextBillingYear = startYear;
  let nextBillingMonth = startMonth + 1;
  if (nextBillingMonth > 12) {
    nextBillingMonth = 1;
    nextBillingYear += 1;
  }

  const startDt = new Date(startYear, startMonth - 1, cycleDay);
  const nextBillingDt = new Date(nextBillingYear, nextBillingMonth - 1, cycleDay);
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

  const refDt = new Date(refYear, refMonth - 1, refDay);
  const diffMs = nextBillingDt.getTime() - refDt.getTime();
  const daysUntilBilling = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isAdvanceReminder = daysUntilBilling <= 2 && daysUntilBilling >= 0;

  // Deliveries in this cycle
  const deliveries = db.prepare(`
    SELECT d.*, m.name as milk_name
    FROM deliveries d
    LEFT JOIN milk_types m ON d.milk_type_id = m.id
    WHERE d.customer_id = ? AND d.delivery_date >= ? AND d.delivery_date <= ?
    ORDER BY d.delivery_date ASC, d.milk_type_id ASC
  `).all(customerId, startStr, endStr);

  let totalLiters = 0;
  let cycleCost = 0;
  let deliveryDaysCount = 0;
  let absentDaysCount = 0;

  // Breakdown by milk type (e.g. Cow Milk vs Buffalo Milk)
  const milkBreakdownMap = {};

  deliveries.forEach(del => {
    if (del.status === 'delivered') {
      totalLiters += del.quantity_liters;
      const itemCost = del.quantity_liters * del.price_per_liter;
      cycleCost += itemCost;
      deliveryDaysCount++;

      if (!milkBreakdownMap[del.milk_type_id]) {
        milkBreakdownMap[del.milk_type_id] = {
          milk_type_id: del.milk_type_id,
          milk_name: del.milk_name || 'Milk',
          liters: 0,
          price_per_liter: del.price_per_liter,
          amount: 0
        };
      }
      milkBreakdownMap[del.milk_type_id].liters += del.quantity_liters;
      milkBreakdownMap[del.milk_type_id].amount += itemCost;
    } else if (del.status === 'absent') {
      absentDaysCount++;
    }
  });

  const milkBreakdown = Object.values(milkBreakdownMap).map(m => ({
    ...m,
    liters: parseFloat(m.liters.toFixed(2)),
    amount: parseFloat(m.amount.toFixed(2))
  }));

  // Payments in this cycle
  const payments = db.prepare(`
    SELECT * FROM payments 
    WHERE customer_id = ? AND payment_date >= ? AND payment_date <= ?
    ORDER BY payment_date DESC
  `).all(customerId, startStr, endStr);

  const totalPaidInCycle = payments.reduce((sum, p) => sum + p.amount, 0);
  // August is the baseline month so its prior due is 0; subsequent months inherit August pending
  const previousOutstanding = startStr.startsWith('2026-08') ? 0.0 : (cust.outstanding_balance || 0.0);
  const totalPayable = previousOutstanding + cycleCost;
  const netDue = Math.max(0, totalPayable - totalPaidInCycle);

  return {
    customer: cust,
    cycle: {
      start_date: startStr,
      end_date: endStr,
      billing_date: billingStr,
      days_until_billing: daysUntilBilling,
      is_advance_reminder: isAdvanceReminder,
      is_billing_day_or_past: daysUntilBilling <= 0
    },
    consumption: {
      total_liters: parseFloat(totalLiters.toFixed(2)),
      delivery_days: deliveryDaysCount,
      absent_days: absentDaysCount,
      total_records: deliveries.length,
      milk_breakdown: milkBreakdown
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

// Due Alerts & Advance Cycle Reminders
app.get('/api/billing/due-alerts', (req, res) => {
  try {
    const today = req.query.date || getTodayStr();
    const customers = db.prepare("SELECT id FROM customers WHERE status = 'active'").all();
    const cycleEndingSoon = [];
    const pendingCollections = [];

    customers.forEach(c => {
      const report = calculateCustomerCycle(c.id, today);
      if (!report) return;

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

      if (report.pricing.net_due > 0) {
        pendingCollections.push({
          customer_id: report.customer.id,
          customer_name: report.customer.name,
          phone: report.customer.phone,
          house_no: report.customer.house_no,
          society: report.customer.society,
          net_due: report.pricing.net_due,
          total_payable: report.pricing.total_payable,
          amount_paid: report.pricing.amount_paid,
          preferred_payment_mode: report.customer.preferred_payment_mode
        });
      }
    });

    res.json({
      success: true,
      data: {
        date: today,
        advance_alerts_count: cycleEndingSoon.length,
        advance_alerts: cycleEndingSoon,
        pending_collections_count: pendingCollections.length,
        pending_collections: pendingCollections
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Payments
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

    db.prepare(`
      INSERT INTO payments (id, customer_id, payment_date, amount, payment_mode, transaction_ref, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(payId, customer_id, payDate, payAmount, payment_mode || 'cash', transaction_ref || '', notes || '');

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
// Single Official Admin can add other admins; All admins can change their name
// -------------------------------------------------------------
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

// List all admins
app.get('/api/auth/admins', (req, res) => {
  try {
    const admins = db.prepare('SELECT id, username, email, name, role, phone, created_at FROM admins').all();
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Official Admin creates a new secondary Admin
app.post('/api/auth/admins', (req, res) => {
  try {
    const { username, password, name, email, phone, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, error: 'Username, password, and name are required' });
    }

    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username.trim());
    if (existing) {
      return res.status(400).json({ success: false, error: 'Admin username already taken' });
    }

    const id = generateId('admin');
    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, name, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, username.trim(), email || '', password, name.trim(), role || 'admin', phone || '');

    res.json({ success: true, message: `Admin account '${name}' created successfully!`, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ALL ADMINS CAN CHANGE THEIR NAME (Profile update)
app.put('/api/auth/admins/:id/name', (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Admin name cannot be empty' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    db.prepare(`
      UPDATE admins 
      SET name = ?,
          phone = COALESCE(?, phone),
          email = COALESCE(?, email)
      WHERE id = ?
    `).run(name.trim(), phone || null, email || null, id);

    const updated = db.prepare('SELECT id, username, email, name, role, phone FROM admins WHERE id = ?').get(id);

    res.json({
      success: true,
      message: `Admin name updated to '${name.trim()}'`,
      user: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Official Admin deletes secondary admin
app.delete('/api/auth/admins/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'admin_1') {
      return res.status(400).json({ success: false, error: 'Cannot delete the primary Official Admin account.' });
    }
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);
    res.json({ success: true, message: 'Admin account removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send OTP
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
    `).run(sessionId, identifier, otp, role || 'customer', expiresAt);

    res.json({
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      session_id: sessionId,
      demo_otp: otp
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { identifier, otp_code } = req.body;
    if (!identifier || !otp_code) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP code are required' });
    }

    const session = db.prepare(`
      SELECT * FROM otp_sessions 
      WHERE identifier = ? AND otp_code = ? AND verified = 0
      ORDER BY expires_at DESC LIMIT 1
    `).get(identifier, otp_code);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
    }

    db.prepare('UPDATE otp_sessions SET verified = 1 WHERE id = ?').run(session.id);

    // Find customer by phone
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const cust = db.prepare("SELECT * FROM customers WHERE phone LIKE ? AND status = 'active'").get(`%${cleanPhone.slice(-10)}%`);

    if (cust) {
      return res.json({
        success: true,
        message: 'Customer verified successfully',
        token: `cust_token_${cust.id}_${Date.now()}`,
        user: {
          id: cust.id,
          name: cust.name,
          role: 'customer',
          phone: cust.phone,
          house_no: cust.house_no,
          society: cust.society
        }
      });
    }

    res.json({
      success: true,
      message: 'Verified successfully',
      token: `user_token_${Date.now()}`,
      user: {
        id: 'guest',
        name: identifier,
        role: 'customer',
        phone: identifier
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Live Analytics & Dashboard Stats
const handleDashboardStats = (req, res) => {
  try {
    const today = getTodayStr();
    const currentMonthPrefix = today.substring(0, 7);

    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'active'").get().count;

    const todayDeliveries = db.prepare(`
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers_active,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters ELSE 0 END), 0) as today_liters,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN quantity_liters * price_per_liter ELSE 0 END), 0) as today_revenue,
        COUNT(DISTINCT CASE WHEN status = 'delivered' THEN customer_id END) as delivered_count,
        COUNT(DISTINCT CASE WHEN status = 'absent' THEN customer_id END) as absent_count
      FROM deliveries
      WHERE delivery_date = ?
    `).get(today);

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
};

app.get('/api/dashboard/stats', handleDashboardStats);
app.get('/api/analytics/dashboard', handleDashboardStats);

// Serve frontend static files if built
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA fallback for all non-API frontend routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🥛 DairyFlow API Server running at http://localhost:${PORT} and network accessible`);
});

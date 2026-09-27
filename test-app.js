const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated End-to-End Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Settings API
    const settingsRes = await request('GET', '/api/settings');
    assert(settingsRes.status === 200 && settingsRes.body.success, 'Settings API responds with 200 OK');

    // 2. Milk Types & Price Fluctuation
    const milkRes = await request('GET', '/api/milk-types');
    assert(milkRes.status === 200 && milkRes.body.data.length >= 4, 'Fetch Milk Types (Cow, Buffalo, etc.)');
    
    // Update price test
    const cowMilk = milkRes.body.data.find(m => m.id === 'cow_standard');
    const updateRateRes = await request('PUT', `/api/milk-types/${cowMilk.id}`, { price_per_liter: 62.0 });
    assert(updateRateRes.status === 200, 'Update Milk Rate dynamically (₹60 -> ₹62)');
    // Restore base rate
    await request('PUT', `/api/milk-types/${cowMilk.id}`, { price_per_liter: 60.0 });

    // 3. Customers API
    const custRes = await request('GET', '/api/customers');
    assert(custRes.status === 200 && custRes.body.data.length >= 5, 'Fetch Customer Directory');

    // 4. Daily Delivery Checklist for Today (2026-09-27)
    const delivRes = await request('GET', '/api/deliveries/date/2026-09-27');
    assert(delivRes.status === 200 && Array.isArray(delivRes.body.data), 'Fetch Daily Checklist for 2026-09-27');

    // 5. Test 1-Touch Delivery Save: House A Delivered 1L, House D Absent 0L
    const saveA = await request('POST', '/api/deliveries/save', {
      customer_id: 'cust_1',
      delivery_date: '2026-09-27',
      status: 'delivered',
      quantity_liters: 1.0,
      notes: 'Delivered standard quota'
    });
    assert(saveA.status === 200 && saveA.body.status === 'delivered', 'Mark Customer 1 as Delivered (1.0L)');

    const saveD = await request('POST', '/api/deliveries/save', {
      customer_id: 'cust_4',
      delivery_date: '2026-09-27',
      status: 'absent',
      quantity_liters: 0,
      notes: 'Not at home today - skipped'
    });
    assert(saveD.status === 200 && saveD.body.finalQty === 0, 'Mark Customer 4 as Absent (0 Liters recorded)');

    // 6. Test Mark Remaining Delivered
    const markAllRes = await request('POST', '/api/deliveries/mark-all-delivered', { date: '2026-09-27' });
    assert(markAllRes.status === 200, 'Batch Mark Remaining Pending Customers as Delivered');

    // Verify House D is STILL absent (0L) and not overwritten by batch mark!
    const delivCheck = await request('GET', '/api/deliveries/date/2026-09-27');
    const cust4 = delivCheck.body.data.find(d => d.customer_id === 'cust_4');
    assert(cust4 && cust4.status === 'absent' && cust4.quantity_liters === 0, 'Integrity Check: Batch mark preserves Absent status (0L)');

    // 7. Customer Monthly Billing & Calculation Engine
    const report1 = await request('GET', '/api/customers/cust_1/report?date=2026-09-27');
    assert(report1.status === 200 && report1.body.data.consumption.total_liters > 0, 'Generate Customer 1 Monthly Report');
    console.log(`     ℹ️ Customer 1: ${report1.body.data.consumption.total_liters}L consumed, Payable: ₹${report1.body.data.pricing.total_payable}`);

    // 8. Due Alerts & 2-Day Advance Reminder
    const alertsRes = await request('GET', '/api/billing/due-alerts?date=2026-09-27');
    assert(alertsRes.status === 200, 'Fetch Billing Due Alerts');
    assert(Array.isArray(alertsRes.body.cycle_ending_soon), '2-Day Advance Alert Engine active');
    console.log(`     ℹ️ Found ${alertsRes.body.cycle_ending_soon.length} cycle(s) ending soon, ${alertsRes.body.pending_collections.length} pending collections`);

    // 9. Partial Payments & Ledger Rollover
    const payRes = await request('POST', '/api/payments', {
      customer_id: 'cust_1',
      amount: 500,
      payment_mode: 'upi',
      transaction_ref: 'UPI-TEST-1234',
      notes: 'Partial payment test',
      payment_date: '2026-09-27'
    });
    assert(payRes.status === 200 && payRes.body.amount_paid === 500, 'Record Partial Payment of ₹500 via UPI');
    console.log(`     ℹ️ Remaining balance automatically calculated: ₹${payRes.body.remaining_balance}`);

    // 10. OTP Authentication Engine
    const otpSend = await request('POST', '/api/auth/send-otp', {
      identifier: '+91 98765 43210',
      role: 'admin'
    });
    assert(otpSend.status === 200 && otpSend.body.demo_otp, 'OTP Generated successfully with demo verification code');

    const otpVerify = await request('POST', '/api/auth/verify-otp', {
      identifier: '+91 98765 43210',
      otp_code: otpSend.body.demo_otp
    });
    assert(otpVerify.status === 200 && otpVerify.body.token, 'OTP Verified and Session Token issued');

    // 11. Dashboard Stats
    const statsRes = await request('GET', '/api/dashboard/stats?date=2026-09-27');
    assert(statsRes.status === 200 && statsRes.body.data.total_customers >= 5, 'Dashboard Aggregated Metrics');

    console.log(`\n===========================================`);
    console.log(`🏁 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`===========================================\n`);

  } catch (err) {
    console.error('Fatal Test Exception:', err);
  }
}

runTests();

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
  console.log('🧪 Starting Verification Tests for New Requirements...\n');
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
    // 1. Only ONE Official Admin initially
    const adminsRes = await request('GET', '/api/auth/admins');
    assert(adminsRes.status === 200 && adminsRes.body.data.length === 1, 'Only One Official Admin exists initially');
    const officialAdmin = adminsRes.body.data[0];
    assert(officialAdmin.username === 'admin1' && officialAdmin.role === 'official_admin', 'Admin 1 has role "official_admin"');

    // 2. Admin Login
    const adminLoginRes = await request('POST', '/api/auth/admin-login', {
      username: 'admin1',
      password: 'Dairy@2026'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Official Admin login with Dairy@2026 succeeds');

    // 3. Admin Can Change The Rate Of Milk
    const rateUpdateRes = await request('PUT', '/api/milk-types/buffalo_pure', {
      price_per_liter: 62.0
    });
    assert(rateUpdateRes.status === 200 && rateUpdateRes.body.success, 'Admin can change milk rate (updated to ₹62)');
    // Restore back to ₹60
    await request('PUT', '/api/milk-types/buffalo_pure', { price_per_liter: 60.0 });
    const milkRes = await request('GET', '/api/milk-types');
    const buffalo = milkRes.body.data.find(m => m.id === 'buffalo_pure');
    assert(buffalo && buffalo.price_per_liter === 60.0, 'Milk rate verified at ₹60/L');

    // 4. Exact Customer Count = 11
    const custRes = await request('GET', '/api/customers');
    assert(custRes.status === 200 && custRes.body.data.length === 11, 'Exactly 11 Customer Households loaded');

    // 5. Customer C-302 Has TWO Types of Milk
    const c302 = custRes.body.data.find(c => c.house_no === 'C-302');
    assert(c302 && c302.default_milk_type_id === 'cow_standard' && c302.default_milk_type_2_id === 'buffalo_pure',
      'Customer C-302 has two types of milk: Cow Milk (1L @ ₹56) and Buffalo Milk (1L @ ₹60)');
    assert(c302.default_quantity_liters === 1.0 && c302.default_quantity_2_liters === 1.0,
      'Customer C-302 daily quantities: 1L Cow Milk + 1L Buffalo Milk');

    // 6. C-302 August Bill & Itemized Breakdown
    const c302Bill = await request('GET', '/api/customers/cust_ap_c302/report?date=2026-08-31');
    assert(c302Bill.status === 200, 'C-302 August bill report fetched successfully');
    const breakdown = c302Bill.body.data.consumption.milk_breakdown;
    const cowItem = breakdown.find(m => m.milk_type_id === 'cow_standard');
    const bufItem = breakdown.find(m => m.milk_type_id === 'buffalo_pure');
    assert(cowItem && cowItem.liters === 31 && cowItem.amount === 1736, 'C-302 Cow Milk Pending: 31L @ ₹56 = ₹1,736');
    assert(bufItem && bufItem.liters === 31 && bufItem.amount === 1860, 'C-302 Buffalo Milk Pending: 31L @ ₹60 = ₹1,860');
    assert(c302Bill.body.data.pricing.net_due === 3596, 'C-302 Total August Pending Amount = ₹3,596');

    // 7. Safar Villa 305: 1L/Day, ₹1860 Paid Via Cash, Net Due = 0
    const sv305Bill = await request('GET', '/api/customers/cust_sv_305/report?date=2026-08-31');
    assert(sv305Bill.body.data.pricing.total_payable === 1860 && sv305Bill.body.data.pricing.amount_paid === 1860,
      'Safar Villa 305 August bill ₹1,860 paid in full');
    assert(sv305Bill.body.data.pricing.net_due === 0, 'Safar Villa 305 Net Due = ₹0 (Paid Cash)');

    // 8. Safar Villa 504: 1.5L/Day, ₹2,790 Pending
    const sv504Bill = await request('GET', '/api/customers/cust_sv_504/report?date=2026-08-31');
    assert(sv504Bill.body.data.pricing.net_due === 2790, 'Safar Villa 504 August Pending = ₹2,790');

    // 9. Oscar Enclave B-102: 1.5L/Day, ₹2,790 Paid Cash
    const oeB102Bill = await request('GET', '/api/customers/cust_oe_b102/report?date=2026-08-31');
    assert(oeB102Bill.body.data.pricing.amount_paid === 2790 && oeB102Bill.body.data.pricing.net_due === 0,
      'Oscar Enclave B-102 August bill ₹2,790 Paid Via Cash');

    // 10. Jk Sarita Home No - 33: 1.5L/Day @ ₹66 = ₹3,069 Pending
    const jk33Bill = await request('GET', '/api/customers/cust_jk_33/report?date=2026-08-31');
    assert(jk33Bill.body.data.pricing.net_due === 3069, 'Jk Sarita Home No - 33 August Pending = ₹3,069 (Rate: ₹66/L)');

    // 11. Official Admin Can Add Other Admin
    const addAdminRes = await request('POST', '/api/auth/admins', {
      username: 'admin2_test',
      password: 'TestPassword@123',
      name: 'Admin 2 (Assistant)',
      role: 'admin'
    });
    assert(addAdminRes.status === 200 && addAdminRes.body.success, 'Official Admin can add other Admin (Admin 2)');

    // 12. All Admins Can Change Their Name
    const changeNameRes = await request('PUT', '/api/auth/admins/admin_1/name', {
      name: 'Official Admin (Dairy Owner)'
    });
    assert(changeNameRes.status === 200 && changeNameRes.body.user.name === 'Official Admin (Dairy Owner)',
      'Admin can change their name (Updated to "Official Admin (Dairy Owner)")');

    // Clean up test admin
    if (addAdminRes.body.id) {
      await request('DELETE', `/api/auth/admins/${addAdminRes.body.id}`);
    }

    // 13. Daily Deliveries Checklist has multi-milk info
    const dailyRes = await request('GET', '/api/deliveries/date/2026-09-27');
    assert(dailyRes.status === 200 && dailyRes.body.data.length === 11, 'Daily deliveries checklist loaded for all 11 customers');
    const c302Daily = dailyRes.body.data.find(d => d.house_no === 'C-302');
    assert(c302Daily && c302Daily.has_multiple_milk, 'Daily checklist accurately flags C-302 has_multiple_milk = true');

    console.log(`\n🎉 Verification Complete: ${passed} Passed, ${failed} Failed.`);
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runTests();

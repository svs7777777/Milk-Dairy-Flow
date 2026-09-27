// API Client for DairyFlow

const API_BASE = '/api';

export const api = {
  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  saveSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // Milk Types & Pricing
  getMilkTypes: async () => {
    const res = await fetch(`${API_BASE}/milk-types`);
    return res.json();
  },
  addMilkType: async (data) => {
    const res = await fetch(`${API_BASE}/milk-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateMilkType: async (id, data) => {
    const res = await fetch(`${API_BASE}/milk-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${API_BASE}/customers`);
    return res.json();
  },
  addCustomer: async (customer) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  updateCustomer: async (id, customer) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  deleteCustomer: async (id) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Daily Deliveries
  getDeliveriesByDate: async (dateStr) => {
    const res = await fetch(`${API_BASE}/deliveries/date/${dateStr}`);
    return res.json();
  },
  saveDelivery: async (deliveryData) => {
    const res = await fetch(`${API_BASE}/deliveries/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryData)
    });
    return res.json();
  },
  markAllDelivered: async (dateStr) => {
    const res = await fetch(`${API_BASE}/deliveries/mark-all-delivered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr })
    });
    return res.json();
  },

  // Customer Report & Billing Calculation
  getCustomerReport: async (customerId, dateStr) => {
    const url = dateStr 
      ? `${API_BASE}/customers/${customerId}/report?date=${dateStr}` 
      : `${API_BASE}/customers/${customerId}/report`;
    const res = await fetch(url);
    return res.json();
  },

  // Due Alerts & Reminders
  getDueAlerts: async (dateStr) => {
    const url = dateStr 
      ? `${API_BASE}/billing/due-alerts?date=${dateStr}` 
      : `${API_BASE}/billing/due-alerts`;
    const res = await fetch(url);
    return res.json();
  },

  // Payments & Balance Rollover
  recordPayment: async (paymentData) => {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    return res.json();
  },
  getCustomerPayments: async (customerId) => {
    const res = await fetch(`${API_BASE}/payments/customer/${customerId}`);
    return res.json();
  },

  // Dashboard Stats
  getDashboardStats: async (dateStr) => {
    const url = dateStr 
      ? `${API_BASE}/dashboard/stats?date=${dateStr}` 
      : `${API_BASE}/dashboard/stats`;
    const res = await fetch(url);
    return res.json();
  },

  // Auth & OTP
  adminLogin: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },
  getAdmins: async () => {
    const res = await fetch(`${API_BASE}/auth/admins`);
    return res.json();
  },
  createAdmin: async (adminData) => {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    return res.json();
  },
  sendOtp: async (identifier, role = 'admin') => {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, role })
    });
    return res.json();
  },
  verifyOtp: async (identifier, otp_code) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp_code })
    });
    return res.json();
  }
};

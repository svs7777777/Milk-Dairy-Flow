import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Users, Droplets, Bell, 
  Sparkles, Shield, User, ArrowUpRight, 
  Calendar, CheckCircle2, AlertTriangle, Clock, RefreshCw 
} from 'lucide-react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import DailyTracker from './components/DailyTracker';
import CustomerList from './components/CustomerList';
import BillingModal from './components/BillingModal';
import MilkRatesModal from './components/MilkRatesModal';
import DueAlertsBanner from './components/DueAlertsBanner';
import CustomerPortal from './components/CustomerPortal';
import LoginPage from './components/LoginPage';
import AdminManagementModal from './components/AdminManagementModal';

// Helper to get local date YYYY-MM-DD
function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  // Current logged in user (Admin 1 or Customer)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dairy_flow_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState(() => {
    return currentUser?.role === 'customer' ? 'customer' : 'admin';
  });
  
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'customers'
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Core Data State
  const [checklist, setChecklist] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [milkTypes, setMilkTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [dueAlerts, setDueAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedCustomerIdForBill, setSelectedCustomerIdForBill] = useState(null);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showAdminManagerModal, setShowAdminManagerModal] = useState(false);
  const [dismissAdvanceBanner, setDismissAdvanceBanner] = useState(false);

  // Initial Load
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [milkRes, custRes, delivRes, statsRes, alertsRes] = await Promise.all([
        api.getMilkTypes(),
        api.getCustomers(),
        api.getDeliveriesByDate(selectedDate),
        api.getDashboardStats(selectedDate),
        api.getDueAlerts(selectedDate)
      ]);

      if (milkRes.success) setMilkTypes(milkRes.data);
      if (custRes.success) setCustomers(custRes.data);
      if (delivRes.success) setChecklist(delivRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (alertsRes.success) setDueAlerts(alertsRes);
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload when date changes
  useEffect(() => {
    if (!currentUser) return;
    const refreshDeliveries = async () => {
      try {
        const [delivRes, statsRes, alertsRes] = await Promise.all([
          api.getDeliveriesByDate(selectedDate),
          api.getDashboardStats(selectedDate),
          api.getDueAlerts(selectedDate)
        ]);
        if (delivRes.success) setChecklist(delivRes.data);
        if (statsRes.success) setStats(statsRes.data);
        if (alertsRes.success) setDueAlerts(alertsRes);
      } catch (err) {
        console.error('Error refreshing date data:', err);
      }
    };
    refreshDeliveries();
  }, [selectedDate, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Delivery update handler
  const handleUpdateDelivery = async (deliveryPayload) => {
    try {
      // Snappy optimistic UI update
      setChecklist(prev => prev.map(item => {
        if (item.customer_id === deliveryPayload.customer_id) {
          return {
            ...item,
            status: deliveryPayload.status,
            quantity_liters: deliveryPayload.quantity_liters,
            notes: deliveryPayload.notes,
            is_recorded: true
          };
        }
        return item;
      }));

      await api.saveDelivery(deliveryPayload);
      
      const [statsRes, alertsRes] = await Promise.all([
        api.getDashboardStats(selectedDate),
        api.getDueAlerts(selectedDate)
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (alertsRes.success) setDueAlerts(alertsRes);
    } catch (err) {
      alert('Error updating delivery: ' + err.message);
      loadAllData();
    }
  };

  // Mark all remaining delivered
  const handleMarkAllDelivered = async (dateStr) => {
    try {
      await api.markAllDelivered(dateStr);
      const delivRes = await api.getDeliveriesByDate(dateStr);
      if (delivRes.success) setChecklist(delivRes.data);
      const statsRes = await api.getDashboardStats(dateStr);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Customer Management Handlers
  const handleAddCustomer = async (custData) => {
    try {
      await api.addCustomer(custData);
      loadAllData();
    } catch (err) {
      alert('Error adding customer: ' + err.message);
    }
  };

  const handleUpdateCustomer = async (id, custData) => {
    try {
      await api.updateCustomer(id, custData);
      loadAllData();
    } catch (err) {
      alert('Error updating customer: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await api.deleteCustomer(id);
      loadAllData();
    } catch (err) {
      alert('Error deleting customer: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dairy_flow_session');
    setCurrentUser(null);
  };

  // MANDATORY LOGIN GATE: If not authenticated, render LoginPage directly!
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'customer') {
            setViewMode('customer');
          } else {
            setViewMode('admin');
          }
        }}
      />
    );
  }

  const alertBadgeCount = (dueAlerts?.cycle_ending_soon?.length || 0) + (dueAlerts?.pending_collections?.length || 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentDate={selectedDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        milkTypes={milkTypes}
        onOpenRates={() => setShowRatesModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onOpenAdminManager={() => setShowAdminManagerModal(true)}
        alertCount={alertBadgeCount}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* ADVANCE 2-DAY BILLING CYCLE POP-UP BANNER */}
      {viewMode === 'admin' && !dismissAdvanceBanner && dueAlerts?.cycle_ending_soon?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-teal-700 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-white/20">
                <Clock className="w-4 h-4 text-white" />
              </span>
              <div>
                <span className="font-extrabold">2-Day Advance Billing Alert: </span>
                <span>
                  {dueAlerts.cycle_ending_soon.length} customer billing cycle(s) ending soon! (e.g. {dueAlerts.cycle_ending_soon[0].customer_name} - {dueAlerts.cycle_ending_soon[0].total_liters}L, Pending: ₹{dueAlerts.cycle_ending_soon[0].net_due})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAlertsModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-xs tap-bounce"
              >
                Review & Collect
              </button>
              <button
                onClick={() => setDismissAdvanceBanner(true)}
                className="p-1 rounded-md text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        {viewMode === 'admin' ? (
          /* ================= ADMIN VIEW ================= */
          <div>
            
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'daily'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Daily Delivery Checklist</span>
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'customers'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Customer Directory ({customers.length})</span>
                </button>
              </div>

              {/* Milk Rates & Admins shortcut */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdminManagerModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs"
                >
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Manage Admins</span>
                </button>

                <button
                  onClick={() => setShowRatesModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs"
                >
                  <Droplets className="w-4 h-4 text-teal-600" />
                  <span>Adjust Milk Prices</span>
                </button>
              </div>
            </div>

            {/* TAB 1: DAILY DELIVERY TRACKER */}
            {activeTab === 'daily' && (
              <DailyTracker
                checklist={checklist}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onUpdateDelivery={handleUpdateDelivery}
                onMarkAllDelivered={handleMarkAllDelivered}
                onOpenCustomerBill={(id) => setSelectedCustomerIdForBill(id)}
                milkTypes={milkTypes}
                stats={stats}
              />
            )}

            {/* TAB 2: CUSTOMERS & BILLING */}
            {activeTab === 'customers' && (
              <CustomerList
                customers={customers}
                milkTypes={milkTypes}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onOpenBill={(id) => setSelectedCustomerIdForBill(id)}
              />
            )}

          </div>
        ) : (
          /* ================= CUSTOMER PORTAL VIEW ================= */
          <CustomerPortal
            customers={customers}
            currentDate={selectedDate}
            currentUser={currentUser}
          />
        )}

      </main>

      {/* Modals */}
      {selectedCustomerIdForBill && (
        <BillingModal
          customerId={selectedCustomerIdForBill}
          currentDate={selectedDate}
          onClose={() => setSelectedCustomerIdForBill(null)}
          onPaymentSuccess={() => {
            loadAllData();
          }}
        />
      )}

      {showRatesModal && (
        <MilkRatesModal
          milkTypes={milkTypes}
          onClose={() => setShowRatesModal(false)}
          onRatesUpdated={() => {
            loadAllData();
          }}
        />
      )}

      {showAlertsModal && dueAlerts && (
        <DueAlertsBanner
          alertsData={dueAlerts}
          onOpenCustomerBill={(id) => {
            setShowAlertsModal(false);
            setSelectedCustomerIdForBill(id);
          }}
          onClose={() => setShowAlertsModal(false)}
        />
      )}

      {showAdminManagerModal && (
        <AdminManagementModal
          onClose={() => setShowAdminManagerModal(false)}
          onAdminUpdated={(updatedAdmin) => {
            setCurrentUser(updatedAdmin);
            loadAllData();
          }}
        />
      )}

    </div>
  );
}

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/master/products': 'Products',
  '/master/categories': 'Categories',
  '/master/vendors': 'Vendors',
  '/master/customers': 'Customers',
  '/purchase/orders': 'Purchase Orders',
  '/purchase/grn': 'Goods Receipt Notes',
  '/purchase/returns': 'Purchase Returns',
  '/inventory/stock': 'Stock Summary',
  '/inventory/ledger': 'Stock Ledger',
  '/inventory/transfers': 'Stock Transfers',
  '/sales/orders': 'Sales Orders',
  '/sales/invoices': 'Invoices',
  '/sales/pick-lists': 'Pick Lists',
  '/sales/challans': 'Delivery Challans',
  '/sales/returns': 'Sales Returns',
  '/accounts/received': 'Payments Received',
  '/accounts/paid': 'Payments Made',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Tiles WMS';

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleSidebar={() => setCollapsed(!collapsed)} title={title} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

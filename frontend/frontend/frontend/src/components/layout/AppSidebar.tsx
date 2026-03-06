import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Package, ShoppingCart, Warehouse,
  Receipt, BarChart3, AlertTriangle, Settings, ChevronDown, ChevronRight,
  Users, Boxes, Layers, Tag, Truck, ClipboardList, FileText, CreditCard,
  ArrowLeftRight, PackageMinus, ClipboardCheck, ReceiptText, BadgeDollarSign,
  Bell, ScrollText, Factory
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string; icon: React.ElementType }[];
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Setup', icon: Building2, children: [
      { label: 'GST Config', path: '/setup/company', icon: ReceiptText },
      { label: 'Warehouses', path: '/setup/warehouses', icon: Warehouse },
      { label: 'Racks', path: '/setup/racks', icon: Layers },
      { label: 'Users', path: '/setup/users', icon: Users },
    ]
  },
  {
    label: 'Master', icon: Package, children: [
      { label: 'Products', path: '/master/products', icon: Boxes },
      { label: 'Categories', path: '/master/categories', icon: Tag },
      { label: 'Vendors', path: '/master/vendors', icon: Factory },
      { label: 'Customers', path: '/master/customers', icon: Users },
    ]
  },
  {
    label: 'Purchase', icon: ShoppingCart, children: [
      { label: 'Orders', path: '/purchase/orders', icon: ClipboardList },
      { label: 'GRN', path: '/purchase/grn', icon: ClipboardCheck },
      { label: 'Returns', path: '/purchase/returns', icon: PackageMinus },
    ]
  },
  {
    label: 'Inventory', icon: Warehouse, children: [
      { label: 'Stock', path: '/inventory/stock', icon: Boxes },
      { label: 'Ledger', path: '/inventory/ledger', icon: ScrollText },
      { label: 'Transfers', path: '/inventory/transfers', icon: ArrowLeftRight },
      { label: 'Adjustments', path: '/inventory/adjustments', icon: Settings },
      { label: 'Damage', path: '/inventory/damage', icon: AlertTriangle },
      { label: 'Stock Count', path: '/inventory/counts', icon: ClipboardCheck },
    ]
  },
  {
    label: 'Sales', icon: Receipt, children: [
      { label: 'Orders', path: '/sales/orders', icon: ClipboardList },
      { label: 'Pick Lists', path: '/sales/pick-lists', icon: ClipboardCheck },
      { label: 'Challans', path: '/sales/challans', icon: Truck },
      { label: 'Invoices', path: '/sales/invoices', icon: FileText },
      { label: 'Returns', path: '/sales/returns', icon: PackageMinus },
    ]
  },
  {
    label: 'Accounts', icon: CreditCard, children: [
      { label: 'Received', path: '/accounts/received', icon: BadgeDollarSign },
      { label: 'Paid', path: '/accounts/paid', icon: CreditCard },
      { label: 'Credit Notes', path: '/accounts/credit-notes', icon: FileText },
      { label: 'Debit Notes', path: '/accounts/debit-notes', icon: FileText },
    ]
  },
  {
    label: 'Reports', icon: BarChart3, children: [
      { label: 'GST Report', path: '/reports/gst', icon: ReceiptText },
      { label: 'Revenue', path: '/reports/revenue', icon: BarChart3 },
      { label: 'Aging', path: '/reports/aging', icon: ScrollText },
    ]
  },
  { label: 'Alerts', icon: AlertTriangle, path: '/alerts', badge: 3 },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.children?.some(c => location.pathname === c.path)) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path?: string) => path === location.pathname;
  const isGroupActive = (item: NavItem) => item.children?.some(c => location.pathname === c.path);

  return (
    <aside className={cn(
      "h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Boxes className="h-7 w-7 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="font-display font-bold text-sm text-sidebar-primary-foreground leading-tight">Tiles WMS</h1>
            <p className="text-[10px] text-sidebar-foreground/60">Warehouse Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(item => (
          <div key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive(item.path)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isGroupActive(item)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {openGroups[item.label] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </>
                  )}
                </button>
                {!collapsed && openGroups[item.label] && item.children && (
                  <div className="ml-4 pl-3 border-l border-sidebar-border/40 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          isActive(child.path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="bg-sidebar-accent rounded-lg p-3">
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">TENANT</p>
            <p className="text-xs text-sidebar-foreground font-semibold truncate">{user?.tenantSlug ?? 'Workspace'}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{user?.role ?? 'User'}</p>
          </div>
        </div>
      )}
    </aside>
  );
}

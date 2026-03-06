// ─── Miscellaneous Module Types ───────────────────────────────────────────────

// Purchase Order
export type POStatus = 'draft' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  status: POStatus;
  order_date: string;
  expected_date?: string | null;
  notes?: string | null;
  subtotal: number;
  taxable_amount: number;
  gst_amount: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
}

// Pick List
export type PickListStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface PickList {
  id: string;
  tenant_id: string;
  pick_list_number: string;
  sales_order_id: string;
  so_number?: string;
  warehouse_id: string;
  status: PickListStatus;
  assigned_to?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Delivery Challan
export interface DeliveryChallan {
  id: string;
  tenant_id: string;
  challan_number: string;
  sales_order_id?: string | null;
  customer_id: string;
  customer_name?: string;
  warehouse_id: string;
  dispatch_date: string;
  vehicle_number?: string | null;
  driver_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Customer Payment
export interface CustomerPayment {
  id: string;
  tenant_id: string;
  payment_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  payment_date: string;
  amount: number;
  payment_mode: string;    // 'cash' | 'bank_transfer' | 'cheque' | 'upi'
  reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Vendor Payment
export interface VendorPayment {
  id: string;
  tenant_id: string;
  payment_number: string;
  vendor_id: string;
  vendor_name?: string;
  grn_id?: string | null;
  grn_number?: string | null;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Credit Note
export interface CreditNote {
  id: string;
  tenant_id: string;
  cn_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_id?: string | null;
  cn_date: string;
  reason?: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Debit Note
export interface DebitNote {
  id: string;
  tenant_id: string;
  dn_number: string;
  vendor_id: string;
  vendor_name?: string;
  grn_id?: string | null;
  dn_date: string;
  reason?: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Notification
export interface Notification {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_id?: string | null;
  created_at: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// Low Stock Alert
export interface LowStockAlert {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  warehouse_id: string;
  warehouse_name?: string;
  current_stock_boxes: number;
  reorder_level_boxes: number;
  status: 'open' | 'acknowledged' | 'resolved';
  alerted_at: string;
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTableShell } from '@/components/shared/DataTableShell';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CrudFormDialog, FieldDef, AutoNumberConfig } from '@/components/shared/CrudFormDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseReturnsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors-active'], queryFn: async () => { const { data, error } = await supabase.from('vendors').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses-active'], queryFn: async () => { const { data, error } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['po-list'], queryFn: async () => { const { data, error } = await supabase.from('purchase_orders').select('id, po_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['purchase_returns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_returns').select('*, vendors(name), warehouses(name), purchase_orders(po_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'return_number', label: 'Return #', type: 'text', required: true, placeholder: 'PR-2025-0001' },
    { key: 'purchase_order_id', label: 'Purchase Order', type: 'select', options: purchaseOrders.map(p => ({ value: p.id, label: p.po_number })) },
    { key: 'vendor_id', label: 'Vendor', type: 'select', required: true, options: vendors.map(v => ({ value: v.id, label: v.name })) },
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'dispatched', label: 'Dispatched' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'return_date', label: 'Return Date', type: 'date', required: true },
    { key: 'reason', label: 'Reason', type: 'text', required: true, placeholder: 'Enter reason for return' },
    { key: 'total_boxes', label: 'Total Boxes', type: 'number', defaultValue: 0 },
    { key: 'total_amount', label: 'Total Amount', type: 'number', defaultValue: 0 },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { return_number: fd.return_number, purchase_order_id: fd.purchase_order_id || null, vendor_id: fd.vendor_id, warehouse_id: fd.warehouse_id, status: fd.status, return_date: fd.return_date || null, reason: fd.reason || null, total_boxes: Number(fd.total_boxes || 0), total_amount: Number(fd.total_amount || 0), notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('purchase_returns').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('purchase_returns').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase_returns'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('purchase_returns').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase_returns'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'return_number', label: 'Return #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.return_number}</span> },
    { key: 'vendor', label: 'Vendor', render: (r: any) => r.vendors?.name || '—' },
    { key: 'po', label: 'PO #', render: (r: any) => r.purchase_orders?.po_number || '—' },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'return_date', label: 'Date', render: (r: any) => r.return_date ? new Date(r.return_date).toLocaleDateString() : '—' },
    { key: 'total_boxes', label: 'Boxes', render: (r: any) => r.total_boxes || 0 },
    { key: 'total_amount', label: 'Amount', render: (r: any) => `₹${Number(r.total_amount || 0).toLocaleString()}` },
    {
      key: 'actions', label: 'Actions', render: (r: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Returns" subtitle="Manage purchase returns to vendors" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Return" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="return_number" searchPlaceholder="Search return#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Purchase Return' : 'New Purchase Return'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'return_number', docType: 'purchase_return' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

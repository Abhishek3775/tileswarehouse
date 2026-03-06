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

export default function SalesReturnsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: customers = [] } = useQuery({ queryKey: ['customers-active'], queryFn: async () => { const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses-active'], queryFn: async () => { const { data, error } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['so-list'], queryFn: async () => { const { data, error } = await supabase.from('sales_orders').select('id, so_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['sales_returns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_returns').select('*, customers(name), warehouses(name), sales_orders(so_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'return_number', label: 'Return #', type: 'text', required: true, placeholder: 'SR-2025-0001' },
    { key: 'sales_order_id', label: 'Sales Order', type: 'select', options: salesOrders.map(s => ({ value: s.id, label: s.so_number })) },
    { key: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers.map(c => ({ value: c.id, label: c.name })) },
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'received', label: 'Received' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'return_date', label: 'Return Date', type: 'date', required: true },
    { key: 'reason', label: 'Reason', type: 'text', required: true, placeholder: 'Enter reason for return' },
    { key: 'total_boxes', label: 'Total Boxes', type: 'number', defaultValue: 0 },
    { key: 'total_amount', label: 'Total Amount', type: 'number', defaultValue: 0 },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { return_number: fd.return_number, sales_order_id: fd.sales_order_id || null, customer_id: fd.customer_id, warehouse_id: fd.warehouse_id, status: fd.status, return_date: fd.return_date || null, reason: fd.reason || null, total_boxes: Number(fd.total_boxes || 0), total_amount: Number(fd.total_amount || 0), notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('sales_returns').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('sales_returns').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales_returns'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('sales_returns').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales_returns'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'return_number', label: 'Return #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.return_number}</span> },
    { key: 'customer', label: 'Customer', render: (r: any) => r.customers?.name || '—' },
    { key: 'so', label: 'SO #', render: (r: any) => r.sales_orders?.so_number || '—' },
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
      <PageHeader title="Sales Returns" subtitle="Manage sales returns" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Return" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="return_number" searchPlaceholder="Search return#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Sales Return' : 'New Sales Return'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'return_number', docType: 'sales_return' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

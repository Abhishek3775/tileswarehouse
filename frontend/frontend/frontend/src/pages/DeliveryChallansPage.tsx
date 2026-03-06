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

export default function DeliveryChallansPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: customers = [] } = useQuery({ queryKey: ['customers-active'], queryFn: async () => { const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses-active'], queryFn: async () => { const { data, error } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['so-list'], queryFn: async () => { const { data, error } = await supabase.from('sales_orders').select('id, so_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['delivery_challans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_challans').select('*, customers(name), warehouses(name), sales_orders(so_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'challan_number', label: 'Challan #', type: 'text', required: true, placeholder: 'DC-2025-0001' },
    { key: 'sales_order_id', label: 'Sales Order', type: 'select', options: salesOrders.map(s => ({ value: s.id, label: s.so_number })) },
    { key: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers.map(c => ({ value: c.id, label: c.name })) },
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'dispatched', label: 'Dispatched' }, { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'challan_date', label: 'Challan Date', type: 'date' },
    { key: 'vehicle_number', label: 'Vehicle Number', type: 'text' },
    { key: 'driver_name', label: 'Driver Name', type: 'text' },
    { key: 'driver_phone', label: 'Driver Phone', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { challan_number: fd.challan_number, sales_order_id: fd.sales_order_id || null, customer_id: fd.customer_id, warehouse_id: fd.warehouse_id, status: fd.status, challan_date: fd.challan_date || null, vehicle_number: fd.vehicle_number || null, driver_name: fd.driver_name || null, driver_phone: fd.driver_phone || null, notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('delivery_challans').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('delivery_challans').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery_challans'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('delivery_challans').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery_challans'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'challan_number', label: 'Challan #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.challan_number}</span> },
    { key: 'customer', label: 'Customer', render: (r: any) => r.customers?.name || '—' },
    { key: 'so', label: 'SO #', render: (r: any) => r.sales_orders?.so_number || '—' },
    { key: 'warehouse', label: 'Warehouse', render: (r: any) => r.warehouses?.name || '—' },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'challan_date', label: 'Date', render: (r: any) => r.challan_date ? new Date(r.challan_date).toLocaleDateString() : '—' },
    { key: 'vehicle_number', label: 'Vehicle', render: (r: any) => r.vehicle_number || '—' },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Delivery Challans" subtitle="Manage delivery challans" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Challan" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="challan_number" searchPlaceholder="Search challan#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Challan' : 'New Delivery Challan'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'challan_number', docType: 'delivery_challan' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

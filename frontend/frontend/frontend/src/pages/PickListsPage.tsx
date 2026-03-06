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

export default function PickListsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['so-for-pick'],
    queryFn: async () => { const { data, error } = await supabase.from('sales_orders').select('id, so_number').order('created_at', { ascending: false }); if (error) throw error; return data; },
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: async () => { const { data, error } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pick_lists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pick_lists').select('*, sales_orders(so_number), warehouses(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'pick_number', label: 'Pick #', type: 'text', required: true, placeholder: 'PL-2025-0001' },
    { key: 'sales_order_id', label: 'Sales Order', type: 'select', options: salesOrders.map(s => ({ value: s.id, label: s.so_number })) },
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'pending' },
    { key: 'pick_date', label: 'Pick Date', type: 'date' },
    { key: 'assigned_to', label: 'Assigned To', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { pick_number: fd.pick_number, sales_order_id: fd.sales_order_id || null, warehouse_id: fd.warehouse_id, status: fd.status, pick_date: fd.pick_date || null, assigned_to: fd.assigned_to || null, notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('pick_lists').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('pick_lists').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pick_lists'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('pick_lists').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pick_lists'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'pick_number', label: 'Pick #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.pick_number}</span> },
    { key: 'so', label: 'Sales Order', render: (r: any) => r.sales_orders?.so_number || '—' },
    { key: 'warehouse', label: 'Warehouse', render: (r: any) => r.warehouses?.name || '—' },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'pick_date', label: 'Date', render: (r: any) => r.pick_date ? new Date(r.pick_date).toLocaleDateString() : '—' },
    { key: 'assigned_to', label: 'Assigned To', render: (r: any) => r.assigned_to || '—' },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Pick Lists" subtitle="Manage warehouse pick lists" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Pick List" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="pick_number" searchPlaceholder="Search pick#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Pick List' : 'New Pick List'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'pick_number', docType: 'pick_list' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

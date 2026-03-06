import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTableShell } from '@/components/shared/DataTableShell';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CrudFormDialog, FieldDef } from '@/components/shared/CrudFormDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StockAdjustmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: async () => { const { data, error } = await supabase.from('warehouses').select('id, name').eq('is_active', true); if (error) throw error; return data; },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: async () => { const { data, error } = await supabase.from('products').select('id, name, code').eq('is_active', true); if (error) throw error; return data; },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ['stock_adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_adjustments').select('*, products(name, code), warehouses(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'product_id', label: 'Product', type: 'select', required: true, options: products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` })) },
    { key: 'adjustment_type', label: 'Type', type: 'select', required: true, options: [{ value: 'add', label: 'Add' }, { value: 'deduct', label: 'Deduct' }], defaultValue: 'add' },
    { key: 'boxes', label: 'Boxes', type: 'number', defaultValue: 0 },
    { key: 'pieces', label: 'Pieces', type: 'number', defaultValue: 0 },
    { key: 'reason', label: 'Reason', type: 'text', required: true },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }], defaultValue: 'pending' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload = {
        warehouse_id: fd.warehouse_id, product_id: fd.product_id,
        adjustment_type: fd.adjustment_type as any, boxes: Number(fd.boxes || 0),
        pieces: Number(fd.pieces || 0), reason: fd.reason,
        status: fd.status as any, created_by: user?.id || null,
      };
      if (editing) { const { error } = await supabase.from('stock_adjustments').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('stock_adjustments').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock_adjustments'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('stock_adjustments').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock_adjustments'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'product', label: 'Product', render: (r: any) => `${(r as any).products?.code} - ${(r as any).products?.name}` },
    { key: 'warehouse', label: 'Warehouse', render: (r: any) => (r as any).warehouses?.name || '—' },
    { key: 'adjustment_type', label: 'Type', render: (r: any) => <StatusBadge status={r.adjustment_type === 'add' ? 'received' : 'cancelled'} /> },
    { key: 'boxes', label: 'Boxes' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Stock Adjustments" subtitle="Manage stock adjustments" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Adjustment" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={data} columns={columns} searchKey="reason" searchPlaceholder="Search..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Adjustment' : 'New Adjustment'} initialData={editing} loading={saveMutation.isPending} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

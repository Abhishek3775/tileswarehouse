import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTableShell } from '@/components/shared/DataTableShell';
import { CrudFormDialog, FieldDef } from '@/components/shared/CrudFormDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DamageEntriesPage() {
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
    queryKey: ['damage_entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('damage_entries').select('*, products(name, code), warehouses(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouses.map(w => ({ value: w.id, label: w.name })) },
    { key: 'product_id', label: 'Product', type: 'select', required: true, options: products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` })) },
    { key: 'damage_date', label: 'Damage Date', type: 'date', required: true },
    {
      key: 'damaged_boxes',
      label: 'Damaged Boxes',
      type: 'number',
      required: true,
      defaultValue: 0,
      validation: {
        min: 1,
        message: 'At least 1 damaged box required',
      },
    },
    { key: 'damaged_pieces', label: 'Damaged Pieces', type: 'number', defaultValue: 0 },
    { key: 'damage_reason', label: 'Reason', type: 'text', required: true, placeholder: 'Enter reason for damage' },
    { key: 'estimated_loss', label: 'Estimated Loss (₹)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload = {
        warehouse_id: fd.warehouse_id, product_id: fd.product_id,
        damage_date: fd.damage_date || null, damaged_boxes: Number(fd.damaged_boxes || 0),
        damaged_pieces: Number(fd.damaged_pieces || 0), damage_reason: fd.damage_reason || null,
        estimated_loss: fd.estimated_loss ? Number(fd.estimated_loss) : null,
        notes: fd.notes || null, created_by: user?.id || null,
      };
      if (editing) { const { error } = await supabase.from('damage_entries').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('damage_entries').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['damage_entries'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('damage_entries').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['damage_entries'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'product', label: 'Product', render: (r: any) => `${(r as any).products?.code} - ${(r as any).products?.name}` },
    { key: 'warehouse', label: 'Warehouse', render: (r: any) => (r as any).warehouses?.name || '—' },
    { key: 'damaged_boxes', label: 'Boxes' },
    { key: 'damage_reason', label: 'Reason', render: (r: any) => r.damage_reason || '—' },
    { key: 'estimated_loss', label: 'Loss', render: (r: any) => r.estimated_loss ? `₹${Number(r.estimated_loss).toLocaleString()}` : '—' },
    { key: 'damage_date', label: 'Date', render: (r: any) => r.damage_date ? new Date(r.damage_date).toLocaleDateString() : '—' },
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
      <PageHeader title="Damage Entries" subtitle="Record damaged stock" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Entry" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={data} columns={columns} searchKey="damage_reason" searchPlaceholder="Search..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Damage Entry' : 'New Damage Entry'} initialData={editing} loading={saveMutation.isPending} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

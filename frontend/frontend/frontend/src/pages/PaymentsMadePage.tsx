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

export default function PaymentsMadePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors-active'], queryFn: async () => { const { data, error } = await supabase.from('vendors').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['po-list'], queryFn: async () => { const { data, error } = await supabase.from('purchase_orders').select('id, po_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['payments_made'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments_made').select('*, vendors(name), purchase_orders(po_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'payment_number', label: 'Payment #', type: 'text', required: true, placeholder: 'PAY-2025-0001' },
    { key: 'vendor_id', label: 'Vendor', type: 'select', required: true, options: vendors.map(v => ({ value: v.id, label: v.name })) },
    { key: 'purchase_order_id', label: 'Purchase Order', type: 'select', options: purchaseOrders.map(p => ({ value: p.id, label: p.po_number })) },
    { key: 'amount', label: 'Amount', type: 'number', required: true, defaultValue: 0 },
    { key: 'payment_date', label: 'Payment Date', type: 'date' },
    { key: 'payment_mode', label: 'Mode', type: 'select', options: [{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'upi', label: 'UPI' }, { value: 'other', label: 'Other' }], defaultValue: 'bank_transfer' },
    { key: 'reference_number', label: 'Reference #', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { payment_number: fd.payment_number, vendor_id: fd.vendor_id, purchase_order_id: fd.purchase_order_id || null, amount: Number(fd.amount || 0), payment_date: fd.payment_date || null, payment_mode: fd.payment_mode, reference_number: fd.reference_number || null, notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('payments_made').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('payments_made').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments_made'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('payments_made').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments_made'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'payment_number', label: 'Payment #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.payment_number}</span> },
    { key: 'vendor', label: 'Vendor', render: (r: any) => r.vendors?.name || '—' },
    { key: 'po', label: 'PO #', render: (r: any) => r.purchase_orders?.po_number || '—' },
    { key: 'amount', label: 'Amount', render: (r: any) => `₹${Number(r.amount || 0).toLocaleString()}` },
    { key: 'payment_date', label: 'Date', render: (r: any) => r.payment_date ? new Date(r.payment_date).toLocaleDateString() : '—' },
    { key: 'payment_mode', label: 'Mode', render: (r: any) => <StatusBadge status={r.payment_mode} /> },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Payments Made" subtitle="Track payments to vendors" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Payment" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="payment_number" searchPlaceholder="Search payment#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Payment' : 'New Payment Made'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'payment_number', docType: 'payment_made' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

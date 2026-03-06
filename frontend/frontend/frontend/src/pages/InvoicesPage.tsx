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

export default function InvoicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active'],
    queryFn: async () => { const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'invoice_number', label: 'Invoice #', type: 'text', required: true, placeholder: 'INV-2024-0001' },
    { key: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers.map(c => ({ value: c.id, label: c.name })) },
    { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'issued', label: 'Issued' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'payment_status', label: 'Payment', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }], defaultValue: 'pending' },
    { key: 'sub_total', label: 'Sub Total', type: 'number', defaultValue: 0 },
    { key: 'grand_total', label: 'Grand Total', type: 'number', defaultValue: 0 },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload = {
        invoice_number: fd.invoice_number, customer_id: fd.customer_id,
        invoice_date: fd.invoice_date || null, due_date: fd.due_date || null,
        status: fd.status as any, payment_status: fd.payment_status as any,
        sub_total: Number(fd.sub_total || 0), grand_total: Number(fd.grand_total || 0),
        notes: fd.notes || null, created_by: user?.id || null,
      };
      if (editing) { const { error } = await supabase.from('invoices').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('invoices').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('invoices').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (r: any) => <span className="font-mono-code text-sm font-medium">{r.invoice_number}</span> },
    { key: 'customer', label: 'Customer', render: (r: any) => (r as any).customers?.name || '—' },
    { key: 'invoice_date', label: 'Date', render: (r: any) => r.invoice_date ? new Date(r.invoice_date).toLocaleDateString() : '—' },
    { key: 'grand_total', label: 'Total', render: (r: any) => `₹${Number(r.grand_total || 0).toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'payment_status', label: 'Payment', render: (r: any) => <StatusBadge status={r.payment_status} /> },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Manage invoices" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Invoice" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={data} columns={columns} searchKey="invoice_number" searchPlaceholder="Search invoices..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Invoice' : 'New Invoice'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'invoice_number', docType: 'invoice' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

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

export default function CreditNotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: customers = [] } = useQuery({ queryKey: ['customers-active'], queryFn: async () => { const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices-list'], queryFn: async () => { const { data, error } = await supabase.from('invoices').select('id, invoice_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });
  const { data: salesReturns = [] } = useQuery({ queryKey: ['sr-list'], queryFn: async () => { const { data, error } = await supabase.from('sales_returns').select('id, return_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['credit_notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_notes').select('*, customers(name), invoices(invoice_number), sales_returns(return_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'credit_note_number', label: 'Credit Note #', type: 'text', required: true, placeholder: 'CN-2025-0001' },
    { key: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers.map(c => ({ value: c.id, label: c.name })) },
    { key: 'invoice_id', label: 'Invoice', type: 'select', options: invoices.map(i => ({ value: i.id, label: i.invoice_number })) },
    { key: 'sales_return_id', label: 'Sales Return', type: 'select', options: salesReturns.map(s => ({ value: s.id, label: s.return_number })) },
    { key: 'amount', label: 'Amount', type: 'number', required: true, defaultValue: 0 },
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'reason', label: 'Reason', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'issued', label: 'Issued' }, { value: 'used', label: 'Used' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { credit_note_number: fd.credit_note_number, customer_id: fd.customer_id, invoice_id: fd.invoice_id || null, sales_return_id: fd.sales_return_id || null, amount: Number(fd.amount || 0), issue_date: fd.issue_date || null, reason: fd.reason || null, status: fd.status, notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('credit_notes').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('credit_notes').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit_notes'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('credit_notes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit_notes'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'credit_note_number', label: 'CN #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.credit_note_number}</span> },
    { key: 'customer', label: 'Customer', render: (r: any) => r.customers?.name || '—' },
    { key: 'invoice', label: 'Invoice', render: (r: any) => r.invoices?.invoice_number || '—' },
    { key: 'amount', label: 'Amount', render: (r: any) => `₹${Number(r.amount || 0).toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'issue_date', label: 'Date', render: (r: any) => r.issue_date ? new Date(r.issue_date).toLocaleDateString() : '—' },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Credit Notes" subtitle="Manage credit notes for customers" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Credit Note" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="credit_note_number" searchPlaceholder="Search CN#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Credit Note' : 'New Credit Note'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'credit_note_number', docType: 'credit_note' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

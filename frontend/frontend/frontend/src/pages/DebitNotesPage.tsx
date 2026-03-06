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

export default function DebitNotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors-active'], queryFn: async () => { const { data, error } = await supabase.from('vendors').select('id, name').eq('is_active', true).order('name'); if (error) throw error; return data; } });
  const { data: purchaseReturns = [] } = useQuery({ queryKey: ['pr-list'], queryFn: async () => { const { data, error } = await supabase.from('purchase_returns').select('id, return_number').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['debit_notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debit_notes').select('*, vendors(name), purchase_returns(return_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields: FieldDef[] = [
    { key: 'debit_note_number', label: 'Debit Note #', type: 'text', required: true, placeholder: 'DN-2025-0001' },
    { key: 'vendor_id', label: 'Vendor', type: 'select', required: true, options: vendors.map(v => ({ value: v.id, label: v.name })) },
    { key: 'purchase_return_id', label: 'Purchase Return', type: 'select', options: purchaseReturns.map(p => ({ value: p.id, label: p.return_number })) },
    { key: 'amount', label: 'Amount', type: 'number', required: true, defaultValue: 0 },
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'reason', label: 'Reason', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'issued', label: 'Issued' }, { value: 'adjusted', label: 'Adjusted' }, { value: 'cancelled', label: 'Cancelled' }], defaultValue: 'draft' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, any>) => {
      const payload: any = { debit_note_number: fd.debit_note_number, vendor_id: fd.vendor_id, purchase_return_id: fd.purchase_return_id || null, amount: Number(fd.amount || 0), issue_date: fd.issue_date || null, reason: fd.reason || null, status: fd.status, notes: fd.notes || null, created_by: user?.id || null };
      if (editing) { const { error } = await supabase.from('debit_notes').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('debit_notes').insert([payload]); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debit_notes'] }); setDialogOpen(false); setEditing(null); toast.success(editing ? 'Updated' : 'Created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('debit_notes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debit_notes'] }); setDeleting(null); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: 'debit_note_number', label: 'DN #', render: (r: any) => <span className="font-mono text-sm font-medium">{r.debit_note_number}</span> },
    { key: 'vendor', label: 'Vendor', render: (r: any) => r.vendors?.name || '—' },
    { key: 'pr', label: 'Return #', render: (r: any) => r.purchase_returns?.return_number || '—' },
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
      <PageHeader title="Debit Notes" subtitle="Manage debit notes for vendors" onAdd={() => { setEditing(null); setDialogOpen(true); }} addLabel="New Debit Note" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : <DataTableShell data={items} columns={columns} searchKey="debit_note_number" searchPlaceholder="Search DN#..." />}
      <CrudFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSubmit={d => saveMutation.mutateAsync(d)} fields={fields} title={editing ? 'Edit Debit Note' : 'New Debit Note'} initialData={editing} loading={saveMutation.isPending} autoNumber={{ fieldKey: 'debit_note_number', docType: 'debit_note' }} />
      <DeleteConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteMutation.mutateAsync(deleting?.id)} loading={deleteMutation.isPending} />
    </div>
  );
}

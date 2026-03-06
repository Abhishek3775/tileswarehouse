import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderApi } from '@/api/miscApi';
import { vendorApi } from '@/api/vendorApi';
import { warehouseApi } from '@/api/warehouseApi';
import { useAuth } from '@/hooks/useAuth';
import type { PurchaseOrder } from '@/types/misc.types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTableShell } from '@/components/shared/DataTableShell';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CrudFormDialog, FieldDef } from '@/components/shared/CrudFormDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partial', label: 'Partial' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const applySearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const listParams = {
    page,
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'DESC' as const,
  };

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors', { limit: 500 }],
    queryFn: () => vendorApi.getAll({ limit: 500 }),
  });
  const vendors = vendorsData?.data ?? [];

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', { limit: 500 }],
    queryFn: () => warehouseApi.getAll({ limit: 500 }),
  });
  const warehouses = warehousesData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', listParams],
    queryFn: () => purchaseOrderApi.getAll(listParams),
  });

  const orders: PurchaseOrder[] = data?.data ?? [];
  const meta = data?.meta ?? null;

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      applySearch(value);
    },
    [applySearch]
  );

  const vendorOptions = vendors.map((v) => ({ value: v.id, label: v.name }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  const fields: FieldDef[] = [
    { key: 'po_number', label: 'PO Number', type: 'text', required: true, placeholder: 'PO-2024-0001' },
    { key: 'vendor_id', label: 'Vendor', type: 'select', required: true, options: vendorOptions },
    { key: 'warehouse_id', label: 'Warehouse', type: 'select', required: true, options: warehouseOptions },
    { key: 'status', label: 'Status', type: 'select', options: statusOptions, defaultValue: 'draft' },
    { key: 'order_date', label: 'Order Date', type: 'date', required: true },
    { key: 'expected_date', label: 'Expected Date', type: 'date' },
    { key: 'grand_total', label: 'Grand Total', type: 'number', defaultValue: 0 },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, unknown>) => {
      const payload = {
        po_number: String(fd.po_number),
        vendor_id: String(fd.vendor_id),
        warehouse_id: String(fd.warehouse_id),
        status: fd.status ?? 'draft',
        order_date: fd.order_date ? String(fd.order_date) : new Date().toISOString().slice(0, 10),
        expected_date: fd.expected_date ? String(fd.expected_date) : null,
        grand_total: Number(fd.grand_total) || 0,
        total_amount: Number(fd.grand_total) || 0,
        tax_amount: 0,
        notes: fd.notes ? String(fd.notes) : null,
        created_by: user?.id ?? '',
      };
      if (editing) {
        const res = await purchaseOrderApi.update(editing.id, payload);
        return res.data;
      }
      const res = await purchaseOrderApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? 'PO updated' : 'PO created');
    },
    onError: (e: { response?: { data?: { error?: { message?: string }; message?: string } } }) => {
      const msg =
        e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Operation failed';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setDeleting(null);
      toast.success('PO deleted');
    },
    onError: (e: { response?: { data?: { error?: { message?: string }; message?: string } } }) => {
      const msg =
        e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Delete failed';
      toast.error(msg);
    },
  });

  const getVendorName = (id: string) => vendors.find((v) => v.id === id)?.name ?? '—';
  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? '—';

  const columns = [
    {
      key: 'po_number',
      label: 'PO #',
      render: (r: PurchaseOrder) => <span className="font-mono text-sm font-medium">{r.po_number}</span>,
    },
    { key: 'vendor', label: 'Vendor', render: (r: PurchaseOrder) => getVendorName(r.vendor_id) },
    { key: 'warehouse', label: 'Warehouse', render: (r: PurchaseOrder) => getWarehouseName(r.warehouse_id) },
    { key: 'status', label: 'Status', render: (r: PurchaseOrder) => <StatusBadge status={r.status} /> },
    {
      key: 'order_date',
      label: 'Date',
      render: (r: PurchaseOrder) =>
        r.order_date ? new Date(r.order_date).toLocaleDateString('en-IN') : '—',
    },
    {
      key: 'grand_total',
      label: 'Total',
      render: (r: PurchaseOrder) => `₹${Number(r.grand_total ?? 0).toLocaleString()}`,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: PurchaseOrder) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setEditing(r);
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeleting(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="New PO"
      />

      <DataTableShell<PurchaseOrder>
        data={orders}
        columns={columns}
        searchKey="po_number"
        searchPlaceholder="Search by PO #..."
        serverSide
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        paginationMeta={meta}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <CrudFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={(d) => saveMutation.mutateAsync(d)}
        fields={fields}
        title={editing ? 'Edit Purchase Order' : 'New Purchase Order'}
        initialData={editing}
        loading={saveMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

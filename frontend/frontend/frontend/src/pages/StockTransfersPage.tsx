import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockTransferApi } from '@/api/stockTransferApi';
import { warehouseApi } from '@/api/warehouseApi';
import type { StockTransfer, CreateStockTransferDto } from '@/types/stock.types';
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
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function StockTransfersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockTransfer | null>(null);
  const [deleting, setDeleting] = useState<StockTransfer | null>(null);
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
    search: search.trim() || undefined,
    sortBy: 'created_at' as const,
    sortOrder: 'DESC' as const,
  };

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', { limit: 500 }],
    queryFn: () => warehouseApi.getAll({ limit: 500 }),
  });
  const warehouses = warehousesData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', listParams],
    queryFn: () => stockTransferApi.getAll(listParams),
  });

  const transfers: StockTransfer[] = data?.data ?? [];
  const meta = data?.meta ?? null;

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      applySearch(value);
    },
    [applySearch]
  );

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  const fields: FieldDef[] = [
    { key: 'transfer_number', label: 'Transfer #', type: 'text', required: true, placeholder: 'ST-2024-0001' },
    { key: 'from_warehouse_id', label: 'From Warehouse', type: 'select', required: true, options: warehouseOptions },
    { key: 'to_warehouse_id', label: 'To Warehouse', type: 'select', required: true, options: warehouseOptions },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: statusOptions,
      defaultValue: 'draft',
    },
    { key: 'transfer_date', label: 'Transfer Date', type: 'date', required: true },
    { key: 'vehicle_number', label: 'Vehicle Number', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, unknown>) => {
      const payload: CreateStockTransferDto = {
        transfer_number: String(fd.transfer_number),
        from_warehouse_id: String(fd.from_warehouse_id),
        to_warehouse_id: String(fd.to_warehouse_id),
        status: (fd.status as CreateStockTransferDto['status']) ?? 'draft',
        transfer_date: fd.transfer_date ? String(fd.transfer_date) : new Date().toISOString().slice(0, 10),
        received_date: fd.received_date ? String(fd.received_date) : null,
        vehicle_number: fd.vehicle_number ? String(fd.vehicle_number) : null,
        notes: fd.notes ? String(fd.notes) : null,
      };
      if (editing) {
        return stockTransferApi.update(editing.id, payload);
      }
      return stockTransferApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-transfers'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? 'Transfer updated' : 'Transfer created');
    },
    onError: (e: { response?: { data?: { error?: { message?: string }; message?: string } } }) => {
      const msg =
        e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Operation failed';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => stockTransferApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-transfers'] });
      setDeleting(null);
      toast.success('Transfer deleted');
    },
    onError: (e: { response?: { data?: { error?: { message?: string }; message?: string } } }) => {
      const msg =
        e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Delete failed';
      toast.error(msg);
    },
  });

  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? '—';

  const columns = [
    {
      key: 'transfer_number',
      label: 'Transfer #',
      render: (r: StockTransfer) => (
        <span className="font-mono text-sm font-medium">{r.transfer_number}</span>
      ),
    },
    { key: 'from', label: 'From', render: (r: StockTransfer) => getWarehouseName(r.from_warehouse_id) },
    { key: 'to', label: 'To', render: (r: StockTransfer) => getWarehouseName(r.to_warehouse_id) },
    { key: 'status', label: 'Status', render: (r: StockTransfer) => <StatusBadge status={r.status} /> },
    {
      key: 'transfer_date',
      label: 'Date',
      render: (r: StockTransfer) =>
        r.transfer_date ? new Date(r.transfer_date).toLocaleDateString('en-IN') : '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: StockTransfer) => (
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
        title="Stock Transfers"
        subtitle="Transfer stock between warehouses"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="New Transfer"
      />

      <DataTableShell<StockTransfer>
        data={transfers}
        columns={columns}
        searchKey="transfer_number"
        searchPlaceholder="Search by transfer number..."
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
        title={editing ? 'Edit Transfer' : 'New Transfer'}
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

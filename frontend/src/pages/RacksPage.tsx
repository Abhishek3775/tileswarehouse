import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rackApi, warehouseApi } from "@/api/warehouseApi";
import type { Rack, CreateRackDto } from "@/types/warehouse.types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CrudFormDialog, FieldDef } from "@/components/shared/CrudFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fields: FieldDef[] = [
  { key: "warehouse_id", label: "Warehouse", type: "select", required: true, options: [] },

  { key: "zone", label: "Zone", type: "text", placeholder: "Z1" },

  { key: "name", label: "Rack Name", type: "text", required: true, placeholder: "Rack A1" },

  { key: "aisle", label: "Aisle", type: "text", placeholder: "A" },

  { key: "row", label: "Row", type: "text", placeholder: "1" },

  { key: "level", label: "Level", type: "text", placeholder: "1" },

  {
    key: "rack_type",
    label: "Rack Type",
    type: "select",
    options: [
      { value: "PALLET", label: "Pallet" },
      { value: "SHELF", label: "Shelf" },
      { value: "FLOOR", label: "Floor" },
    ],
  },

  { key: "capacity_boxes", label: "Capacity (boxes)", type: "number", placeholder: "100" },

  { key: "occupied_boxes", label: "Occupied Boxes", type: "number", placeholder: "0" },

  { key: "max_weight", label: "Max Weight (kg)", type: "number", placeholder: "500" },

  {
    key: "rack_status",
    label: "Rack Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "BLOCKED", label: "Blocked" },
      { value: "MAINTENANCE", label: "Maintenance" },
      { value: "FULL", label: "Full" },
    ],
  },

  { key: "qr_code", label: "QR Code", type: "text", placeholder: "Optional" },

  { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes" },

  { key: "is_active", label: "Status", type: "switch", defaultValue: true },
];

export default function RacksPage() {

  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rack | null>(null);
  const [deleting, setDeleting] = useState<Rack | null>(null);

  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const listParams = {
    page,
    limit: 25,
    search: search.trim() || undefined,
    sortBy: "created_at" as const,
    sortOrder: "DESC" as const,
  };

  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses", { limit: 500 }],
    queryFn: () => warehouseApi.getAll({ limit: 500 }),
  });

  const warehouseOptions =
    warehousesData?.data?.map((w) => ({
      value: w.id,
      label: `${w.code} - ${w.name}`,
    })) ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["racks", listParams],
    queryFn: () => rackApi.getAll(listParams),
  });

  const racks: Rack[] = data?.data ?? [];
  const meta = data?.meta ?? null;

  const applySearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    applySearch(value);
  }, [applySearch]);

  const saveMutation = useMutation({
    mutationFn: async (fd: Record<string, unknown>) => {

      const payload: CreateRackDto = {

        warehouse_id: String(fd.warehouse_id),

        zone: fd.zone ? String(fd.zone) : null,

        name: String(fd.name),

        aisle: fd.aisle ? String(fd.aisle) : null,

        row: fd.row ? String(fd.row) : null,

        level: fd.level ? String(fd.level) : null,

        rack_type: fd.rack_type ? String(fd.rack_type) as any : undefined,

        capacity_boxes:
          fd.capacity_boxes !== undefined && fd.capacity_boxes !== ""
            ? Number(fd.capacity_boxes)
            : null,

        occupied_boxes:
          fd.occupied_boxes !== undefined && fd.occupied_boxes !== ""
            ? Number(fd.occupied_boxes)
            : undefined,

        max_weight:
          fd.max_weight !== undefined && fd.max_weight !== ""
            ? Number(fd.max_weight)
            : null,

        rack_status: fd.rack_status ? String(fd.rack_status) as any : undefined,

        qr_code: fd.qr_code ? String(fd.qr_code) : null,

        notes: fd.notes ? String(fd.notes) : null,

       is_active: Boolean(fd.is_active),
        
      };

      if (editing) {
        return rackApi.update(editing.id, payload);
      }

      return rackApi.create(payload);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["racks"] });

      setDialogOpen(false);
      setEditing(null);

      toast.success(editing ? "Rack updated" : "Rack created");
    },

    onError: (e: any) => {
      toast.error(
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        "Operation failed"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rackApi.delete(id),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["racks"] });

      setDeleting(null);

      toast.success("Rack deleted");
    },

    onError: (e: any) => {
      toast.error(
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        "Delete failed"
      );
    },
  });

  const columns = [

    { key: "name", label: "Rack Name" },

    { key: "zone", label: "Zone", render: (r: Rack) => r.zone ?? "—" },

    { key: "aisle", label: "Aisle", render: (r: Rack) => r.aisle ?? "—" },

    { key: "row", label: "Row", render: (r: Rack) => r.row ?? "—" },

    { key: "level", label: "Level", render: (r: Rack) => r.level ?? "—" },

    { key: "rack_type", label: "Type", render: (r: Rack) => r.rack_type ?? "—" },

    { key: "capacity_boxes", label: "Capacity", render: (r: Rack) => r.capacity_boxes ?? "—" },

    { key: "occupied_boxes", label: "Occupied", render: (r: Rack) => r.occupied_boxes ?? "—" },

    { key: "available_boxes", label: "Available", render: (r: Rack) => r.available_boxes ?? "—" },

    { key: "rack_status", label: "Rack Status", render: (r: Rack) => r.rack_status ?? "—" },

    {key: "warehouse", label : "Warehouse", render: (r: Rack) =>
    warehouseOptions.find((w) => w.value === r.warehouse_id)?.label ?? "—" },

    {
      key: "is_active",
      label: "Status",
      render: (r: Rack) => (
        <StatusBadge status={r.is_active ? "active" : "inactive"} />
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (r: Rack) => (
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

  const formFields: FieldDef[] = fields.map((f) =>
    f.key === "warehouse_id"
      ? {
          ...f,
          options: warehouseOptions.length
            ? warehouseOptions
            : [{ value: "", label: "Loading warehouses..." }],
        }
      : f
  );

  return (
    <div>

      <PageHeader
        title="Racks"
        subtitle="Manage rack locations within warehouses"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="Add Rack"
      />

      <DataTableShell<Rack>
        data={racks}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search rack..."
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
        fields={formFields}
        title={editing ? "Edit Rack" : "New Rack"}
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
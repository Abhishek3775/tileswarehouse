import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchNextDocNumber } from '@/hooks/useNextDocNumber';
import { toast } from 'sonner';
import { AlertTriangle } from "lucide-react";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'switch' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface AutoNumberConfig {
  fieldKey: string;
  docType: string;
}

interface CrudFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  fields: FieldDef[];
  title: string;
  initialData?: Record<string, any> | null;
  loading?: boolean;
  autoNumber?: AutoNumberConfig;
}

/* ─────────────────────────────────────────────
   Build Zod Schema dynamically
───────────────────────────────────────────── */

function buildZodSchema(
  fields: FieldDef[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach(f => {
    if (f.type === 'switch') {
      shape[f.key] = z.boolean().default(true);
      return;
    }

    if (f.key.toLowerCase().includes('phone')) {
      // Optional phone: allow empty string OR 10-digit number
      // Required phone: must be exactly 10 digits
      const phoneSchema: z.ZodTypeAny = f.required
        ? z.string().regex(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
        : z.union([
          z.literal(''),
          z.string().regex(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' }),
        ]);

      shape[f.key] = phoneSchema;
      return;
    }

    if (f.type === 'number') {
      let schema: z.ZodTypeAny = z.string().refine(
        v => v === '' || !isNaN(Number(v)),
        { message: f.validation?.message ?? 'Must be a valid number' }
      );

      if (f.required) {
        schema = schema.refine(v => v !== '', {
          message: `${f.label} is required`,
        });
      }

      if (f.validation?.min !== undefined) {
        const min = f.validation.min;
        schema = schema.refine(
          v => v === '' || Number(v) >= min,
          { message: `Minimum value is ${min}` }
        );
      }

      if (f.validation?.max !== undefined) {
        const max = f.validation.max;
        schema = schema.refine(
          v => v === '' || Number(v) <= max,
          { message: `Maximum value is ${max}` }
        );
      }

      shape[f.key] = schema;
      return;
    }

    if (f.type === 'select') {
      let schema: z.ZodTypeAny = z.string();
      if (f.required) {
        schema = schema.refine(
          v => Boolean(v) && v !== 'none' && v !== '',
          { message: `${f.label} is required` }
        );
      }
      shape[f.key] = schema;
      return;
    }

    let schema: z.ZodTypeAny = z.string();

    if (f.required) {
      schema = (schema as z.ZodString).min(1, {
        message: `${f.label} is required`,
      });
    }

    if (f.type === 'email') {
      schema = schema.refine(
        v => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        { message: 'Invalid email format' }
      );
    }

    if (f.validation?.minLength) {
      const ml = f.validation.minLength;
      schema = schema.refine(
        v => !v || v.length >= ml,
        { message: `Minimum ${ml} characters required` }
      );
    }

    if (f.validation?.maxLength) {
      const ml = f.validation.maxLength;
      schema = schema.refine(
        v => !v || v.length <= ml,
        { message: `Maximum ${ml} characters allowed` }
      );
    }

    if (f.validation?.pattern) {
      const pat = f.validation.pattern;
      schema = schema.refine(
        v => v === '' || pat.test(v),
        { message: 'Invalid format' }
      );
    }

    shape[f.key] = schema;
  });

  return z.object(shape) as z.ZodObject<Record<string, z.ZodTypeAny>>;
}

/* ─────────────────────────────────────────────
   Default Values Builder
───────────────────────────────────────────── */

function buildDefaults(
  fields: FieldDef[],
  initialData?: Record<string, any> | null
): Record<string, any> {
  const defaults: Record<string, any> = {};

  fields.forEach(f => {
    if (f.type === 'switch') {
      defaults[f.key] = initialData?.[f.key] ?? f.defaultValue ?? true;
    } else if (f.type === 'select') {
      defaults[f.key] =
        initialData?.[f.key] || f.defaultValue || (f.required ? '' : 'none');
    } else {
      const raw = initialData?.[f.key];
      defaults[f.key] =
        raw !== undefined && raw !== null
          ? String(raw)
          : f.defaultValue !== undefined
            ? String(f.defaultValue)
            : '';
    }
  });

  return defaults;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function CrudFormDialog({
  open,
  onClose,
  onSubmit,
  fields,
  title,
  initialData,
  loading,
  autoNumber,
}: CrudFormDialogProps) {
  const schema = buildZodSchema(fields);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, touchedFields, submitCount },
  } = useForm<Record<string, any>>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(fields, initialData),
    mode: 'onSubmit',
  });

  /* Reset when dialog opens */
  useEffect(() => {
    if (open) {
      reset(buildDefaults(fields, initialData));

      if (!initialData && autoNumber) {
        fetchNextDocNumber(autoNumber.docType)
          .then(num => setValue(autoNumber.fieldKey, num))
          .catch(() => { });
      }
    }
  }, [open, initialData, fields, autoNumber, reset, setValue]);

  /* Focus first invalid field AFTER submit */
  useEffect(() => {
    if (submitCount === 0) return;

    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const el = document.getElementById(firstKey);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [errors, submitCount]);

  const isAutoNumberField = (key: string) =>
    !initialData && autoNumber?.fieldKey === key;

  const onValidSubmit = async (data: Record<string, any>) => {
    const cleaned: Record<string, any> = {};
    for (const key in data) {
      cleaned[key] = data[key] === 'none' ? '' : data[key];
    }
    await onSubmit(cleaned);
  };

  const onInvalidSubmit = () => {
    toast.error('Please fill in all required fields');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
          noValidate
          className="space-y-4"
        >
          {fields.map(f => {
            const errorMsg = errors[f.key]?.message as string | undefined;
            const showError = !!errorMsg && submitCount > 0;

            return (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={f.key} className="text-sm font-medium">
                  {f.label}
                  {f.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>

                <Controller
                  name={f.key}
                  control={control}
                  render={({ field }) => {
                    if (f.type === 'textarea') {
                      return (
                        <Textarea
                          {...field}
                          id={f.key}
                          placeholder={f.placeholder}
                        />
                      );
                    }

                    if (f.type === 'select') {
                      return (
                        <Select
                          value={field.value || 'none'}
                          onValueChange={val => field.onChange(val)}
                        >
                          <SelectTrigger id={f.key}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {!f.required && (
                              <SelectItem value="none">— None —</SelectItem>
                            )}
                            {f.options?.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }

                    if (f.type === 'switch') {
                      return (
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            id={f.key}
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Input
                        {...field}
                        id={f.key}
                        type={f.type}
                        placeholder={f.placeholder}
                        step={f.type === 'number' ? 'any' : undefined}
                        readOnly={isAutoNumberField(f.key)}
                        className={
                          isAutoNumberField(f.key)
                            ? 'bg-muted font-mono'
                            : ''
                        }
                      />
                    );
                  }}
                />

                {showError && (
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 opacity-80" />
                    <span>{errorMsg}</span>
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
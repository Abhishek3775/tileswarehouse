import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'border-border',
  primary: 'border-l-4 border-l-secondary border-t-0 border-r-0 border-b-0',
  success: 'border-l-4 border-l-success border-t-0 border-r-0 border-b-0',
  warning: 'border-l-4 border-l-accent border-t-0 border-r-0 border-b-0',
  danger: 'border-l-4 border-l-destructive border-t-0 border-r-0 border-b-0',
};

const iconBgStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-accent/10 text-accent-foreground',
  danger: 'bg-destructive/10 text-destructive',
};

export function KPICard({ title, value, change, changeLabel, icon, variant = 'default' }: KPICardProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg p-4 shadow-sm border animate-fade-in",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-display font-bold text-card-foreground animate-count-up">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn("text-[11px] font-medium", change >= 0 ? "text-success" : "text-destructive")}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && <span className="text-[11px] text-muted-foreground">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconBgStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

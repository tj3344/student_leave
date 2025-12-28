import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  valueColor?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-muted-foreground",
  iconBgColor = "bg-muted",
  valueColor = "text-foreground",
  description,
}: StatCardProps) {
  return (
    <Card className="group overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold mt-2", valueColor)}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            "p-4 rounded-2xl shadow-soft transition-all duration-300 group-hover:scale-110 group-hover:shadow-soft-hover",
            iconBgColor
          )}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

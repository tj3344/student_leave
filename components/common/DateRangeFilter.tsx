"use client";

import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 日期区间筛选组件
 * 使用原生 date 输入，值格式为 YYYY-MM-DD，避免时区转换问题。
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = "请假开始日期",
  disabled = false,
  className,
}: DateRangeFilterProps) {
  // 起止日期冲突时，将另一端同步为当前选择，保证区间合法
  const handleFromChange = (value: string) => {
    if (value && to && value > to) {
      onChange({ from: value, to: value });
      return;
    }
    onChange({ from: value, to });
  };

  const handleToChange = (value: string) => {
    if (value && from && value < from) {
      onChange({ from: value, to: value });
      return;
    }
    onChange({ from, to: value });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {label}
      </span>
      <Input
        type="date"
        aria-label={`${label}起`}
        value={from}
        max={to || undefined}
        disabled={disabled}
        onChange={(e) => handleFromChange(e.target.value)}
        className="w-[150px]"
      />
      <span className="text-sm text-muted-foreground">至</span>
      <Input
        type="date"
        aria-label={`${label}止`}
        value={to}
        min={from || undefined}
        disabled={disabled}
        onChange={(e) => handleToChange(e.target.value)}
        className="w-[150px]"
      />
      {(from || to) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange({ from: "", to: "" })}
          disabled={disabled}
          title="清除日期筛选"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

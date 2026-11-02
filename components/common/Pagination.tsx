"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PaginationProps {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
}

/**
 * 列表分页组件
 * 统一展示总数、每页条数选择以及上一页/下一页。
 */
export function Pagination({
  page,
  total,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  loading = false,
}: PaginationProps) {
  // 没有数据时不渲染分页
  if (total <= 0) {
    return null;
  }

  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">共 {total} 条</p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">每页</span>
        <Select
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          disabled={loading}
        >
          <SelectTrigger className="w-[90px]" aria-label="每页条数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} 条
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={loading || currentPage <= 1}
        >
          上一页
        </Button>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          第 {currentPage} / {safeTotalPages} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={loading || currentPage >= safeTotalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, GraduationCap, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClassOption {
  id: number;
  name: string;
  grade_name: string;
}

interface ClassSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (classId: number) => void;
  classes: ClassOption[];
  currentClassId?: number | null;
}

export function ClassSelectDialog({
  open,
  onClose,
  onSelect,
  classes,
  currentClassId,
}: ClassSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤班级：支持按年级或班级名称搜索
  const filteredClasses = classes.filter((cls) => {
    const fullName = `${cls.grade_name}${cls.name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query);
  });

  const handleSelect = (classId: number) => {
    onSelect(classId);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>选择班级</DialogTitle>
          <DialogDescription>
            搜索并选择一个班级
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索班级（如：一年级1班）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* 班级列表 */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <Button
                    key={cls.id}
                    variant={
                      currentClassId === cls.id ? "secondary" : "ghost"
                    }
                    className="w-full justify-start px-3"
                    onClick={() => handleSelect(cls.id)}
                  >
                    <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col items-start">
                      <span>{cls.grade_name} - {cls.name}</span>
                    </div>
                    {currentClassId === cls.id && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </Button>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? "未找到匹配的班级" : "暂无班级数据"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

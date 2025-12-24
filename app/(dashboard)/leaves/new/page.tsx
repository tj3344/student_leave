"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveForm } from "@/components/teacher/LeaveForm";

export default function NewLeavePage() {
  const router = useRouter();

  const handleFormClose = () => {
    router.back();
  };

  const handleFormSuccess = () => {
    router.push("/leaves");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新增请假申请</h1>
          <p className="text-muted-foreground">为学生提交请假申请</p>
        </div>
      </div>

      <LeaveForm
        open={true}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveForm } from "@/components/teacher/LeaveForm";
import type { User } from "@/types";

export default function NewLeavePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Fetch current user error:", error);
      }
    };
    fetchCurrentUser();
  }, []);

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
        currentUser={currentUser}
      />
    </div>
  );
}

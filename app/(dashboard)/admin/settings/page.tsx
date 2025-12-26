"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";
import type { SystemConfig } from "@/types";

interface ConfigGroup {
  title: string;
  description: string;
  configs: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  type: "number" | "boolean";
  default: number | boolean;
  description: string;
}

const CONFIG_DEFINITIONS: ConfigGroup[] = [
  {
    title: "请假管理配置",
    description: "设置请假相关的业务规则",
    configs: [
      {
        key: "leave.min_days",
        label: "最小请假天数",
        type: "number",
        default: 3,
        description: "请假申请必须大于此天数",
      },
      {
        key: "leave.teacher_apply_enabled",
        label: "教师请假申请功能",
        type: "boolean",
        default: true,
        description: "开启后教师可以提交请假申请，关闭后仅可查看",
      },
      {
        key: "leave.require_approval",
        label: "需要审批",
        type: "boolean",
        default: true,
        description: "请假申请是否需要管理员审批",
      },
    ],
  },
  {
    title: "权限管理配置",
    description: "控制不同角色的功能权限",
    configs: [
      {
        key: "permission.class_teacher_edit_student",
        label: "班主任编辑学生",
        type: "boolean",
        default: false,
        description: "开启后班主任可以编辑本班学生信息",
      },
      {
        key: "permission.class_teacher_delete_student",
        label: "班主任删除学生",
        type: "boolean",
        default: false,
        description: "开启后班主任可以删除本班学生（有请假记录的学生仍无法删除）",
      },
      {
        key: "permission.class_teacher_edit_leave",
        label: "班主任编辑请假",
        type: "boolean",
        default: true,
        description: "开启后班主任可以编辑本班学生的请假信息（仅限待审核和已拒绝状态）",
      },
    ],
  },
  {
    title: "系统参数配置",
    description: "设置系统运行参数",
    configs: [
      {
        key: "system.max_export_rows",
        label: "导出行数限制",
        type: "number",
        default: 10000,
        description: "导出数据的最大行数",
      },
      {
        key: "system.session_timeout",
        label: "会话超时天数",
        type: "number",
        default: 7,
        description: "用户登录会话的有效期（天）",
      },
      {
        key: "system.maintenance_mode",
        label: "维护模式",
        type: "boolean",
        default: false,
        description: "开启后系统进入维护模式，普通用户无法访问",
      },
    ],
  },
];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 获取系统配置
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/system-config");
      const data = await res.json();
      const configMap = (data.data || []).reduce((acc: Record<string, string>, config: SystemConfig) => {
        acc[config.config_key] = config.config_value;
        return acc;
      }, {});
      setConfigs(configMap);
    } catch (error) {
      console.error("获取系统配置失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configArray = Object.entries(configs).map(([key, value]) => ({
        config_key: key,
        config_value: value,
      }));

      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: configArray }),
      });

      const data = await res.json();

      if (data.success) {
        alert("系统配置保存成功");
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存系统配置失败:", error);
      alert("保存系统配置失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const getBooleanValue = (key: string): boolean => {
    const value = configs[key];
    return value === "true" || value === "1";
  };

  const getNumberValue = (key: string, defaultValue: number): number => {
    const value = configs[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            系统设置
          </h1>
          <p className="text-muted-foreground mt-1">
            管理系统运行参数和业务规则
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "保存中..." : "保存配置"}
        </Button>
      </div>

      {CONFIG_DEFINITIONS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.configs.map((config) => (
              <div key={config.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={config.key} className="font-medium">
                    {config.label}
                  </Label>
                  {config.type === "boolean" ? (
                    <Switch
                      id={config.key}
                      checked={getBooleanValue(config.key)}
                      onCheckedChange={(checked) =>
                        handleConfigChange(config.key, checked ? "true" : "false")
                      }
                    />
                  ) : (
                    <Input
                      id={config.key}
                      type="number"
                      value={getNumberValue(config.key, config.default as number)}
                      onChange={(e) => handleConfigChange(config.key, e.target.value)}
                      className="w-32"
                      min="0"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

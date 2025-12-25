"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Download, Trash2, Clock, HardDrive, RotateCcw } from "lucide-react";
import type { BackupRecordWithDetails, BackupConfig, BackupModule } from "@/types";

const BACKUP_MODULES = [
  { id: "users" as const, name: "用户数据" },
  { id: "semesters" as const, name: "学期数据" },
  { id: "grades" as const, name: "年级数据" },
  { id: "classes" as const, name: "班级数据" },
  { id: "students" as const, name: "学生数据" },
  { id: "leave_records" as const, name: "请假记录" },
  { id: "fee_configs" as const, name: "费用配置" },
  { id: "system_config" as const, name: "系统配置" },
  { id: "operation_logs" as const, name: "操作日志" },
];

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecordWithDetails[]>([]);
  const [selectedModules, setSelectedModules] = useState<BackupModule[]>(BACKUP_MODULES.map((m) => m.id));
  const [backupName, setBackupName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 自动备份配置状态
  const [scheduleConfig, setScheduleConfig] = useState<BackupConfig | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // 恢复数据状态
  const [selectedBackupId, setSelectedBackupId] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);

  // 获取备份列表
  useEffect(() => {
    fetchBackups();
    fetchScheduleConfig();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/backup/list");
      const data = await res.json();
      setBackups(data.data || []);
    } catch (error) {
      console.error("获取备份列表失败:", error);
    }
  };

  const fetchScheduleConfig = async () => {
    try {
      const res = await fetch("/api/backup/schedule");
      const data = await res.json();
      if (data.data) {
        setScheduleConfig({
          ...data.data,
          modules: JSON.parse(data.data.modules || "[]"),
        });
      }
    } catch (error) {
      console.error("获取自动备份配置失败:", error);
    }
  };

  const handleCreateBackup = async () => {
    if (selectedModules.length === 0) {
      alert("请至少选择一个备份模块");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: backupName || `手动备份_${new Date().toLocaleString()}`,
          type: selectedModules.length === BACKUP_MODULES.length ? "full" : "partial",
          modules: selectedModules,
          description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("备份创建成功");
        setBackupName("");
        setDescription("");
        fetchBackups();
      } else {
        alert(data.error || "创建备份失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setIsCreating(false);
    }
  };

  const downloadBackup = async (id: number) => {
    try {
      const res = await fetch(`/api/backup/download/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "下载失败");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${id}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("下载成功");
    } catch (error) {
      alert(error instanceof Error ? error.message : "下载失败，请稍后重试");
    }
  };

  const deleteBackup = async (id: number) => {
    if (!confirm("确定要删除此备份吗？此操作不可恢复。")) {
      return;
    }

    try {
      const res = await fetch(`/api/backup/delete/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("删除成功");
        fetchBackups();
      } else {
        alert(data.error || "删除备份失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("警告：恢复操作将覆盖现有数据，请确认已做好数据备份。是否继续？")) {
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("数据恢复成功");
        fetchBackups();
      } else {
        alert(data.message || "恢复数据失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  // 从备份记录恢复
  const handleRestoreFromBackup = async () => {
    if (!selectedBackupId) {
      alert("请选择要恢复的备份");
      return;
    }

    if (!confirm("警告：恢复操作将覆盖现有数据，请确认已做好数据备份。是否继续？")) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await fetch(`/api/backup/restore/${selectedBackupId}`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        alert("数据恢复成功");
        fetchBackups();
        setSelectedBackupId("");
      } else {
        alert(data.message || "恢复数据失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleConfig) return;

    setIsSavingSchedule(true);
    try {
      const res = await fetch("/api/backup/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: scheduleConfig.enabled,
          schedule_type: scheduleConfig.schedule_type,
          schedule_time: scheduleConfig.schedule_time,
          backup_type: scheduleConfig.backup_type,
          modules: scheduleConfig.modules,
          retention_days: scheduleConfig.retention_days,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("自动备份配置已更新");
        fetchScheduleConfig();
      } else {
        alert(data.error || "保存配置失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const toggleModule = (moduleId: BackupModule) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleAllModules = () => {
    if (selectedModules.length === BACKUP_MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(BACKUP_MODULES.map((m) => m.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center">
          <HardDrive className="w-6 h-6 mr-2" />
          数据备份
        </h1>
        <p className="text-muted-foreground">管理系统数据备份和恢复</p>
      </div>

      {/* 创建备份 */}
      <Card>
        <CardHeader>
          <CardTitle>创建备份</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>选择备份模块</Label>
              <Button variant="ghost" size="sm" onClick={toggleAllModules}>
                {selectedModules.length === BACKUP_MODULES.length ? "全不选" : "全选"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BACKUP_MODULES.map((module) => (
                <div key={module.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={module.id}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => toggleModule(module.id)}
                  />
                  <Label htmlFor={module.id} className="cursor-pointer">
                    {module.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="backup-name">备份名称</Label>
            <Input
              id="backup-name"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="留空自动生成"
            />
          </div>

          <div>
            <Label htmlFor="description">备注说明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="备份说明（可选）"
              rows={2}
            />
          </div>

          <Button onClick={handleCreateBackup} disabled={selectedModules.length === 0 || isCreating}>
            {isCreating ? "创建中..." : "创建备份"}
          </Button>
        </CardContent>
      </Card>

      {/* 备份列表 */}
      <Card>
        <CardHeader>
          <CardTitle>备份记录</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无备份记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>备份名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模块数</TableHead>
                  <TableHead>文件大小</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.name}</TableCell>
                    <TableCell>{backup.type === "full" ? "全量" : "部分"}</TableCell>
                    <TableCell>{backup.module_count || JSON.parse(backup.modules).length}</TableCell>
                    <TableCell>{(backup.file_size / 1024).toFixed(2)} KB</TableCell>
                    <TableCell>{new Date(backup.created_at).toLocaleString("zh-CN")}</TableCell>
                    <TableCell>{backup.created_by_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBackup(backup.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBackup(backup.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 恢复数据 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            <RotateCcw className="w-5 h-5 mr-2" />
            恢复数据
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 从备份记录恢复 */}
          <div className="space-y-2">
            <Label>从备份记录恢复</Label>
            <Select value={selectedBackupId} onValueChange={setSelectedBackupId}>
              <SelectTrigger>
                <SelectValue placeholder="选择要恢复的备份" />
              </SelectTrigger>
              <SelectContent>
                {backups.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">暂无备份记录</div>
                ) : (
                  backups.map((backup) => (
                    <SelectItem key={backup.id} value={String(backup.id)}>
                      {backup.name} - {new Date(backup.created_at).toLocaleString("zh-CN")}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleRestoreFromBackup}
              disabled={!selectedBackupId || isRestoring}
              className="w-full"
            >
              {isRestoring ? "恢复中..." : "恢复选定备份"}
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-muted-foreground mb-2">或从文件恢复</div>
            <Input
              id="restore-file"
              type="file"
              accept=".sql"
              onChange={handleRestore}
              disabled={isRestoring}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            警告：恢复操作将覆盖现有数据，系统会自动在恢复前创建备份
          </p>
        </CardContent>
      </Card>

      {/* 自动备份配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            自动备份配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleConfig && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>启用自动备份</Label>
                  <p className="text-sm text-muted-foreground">开启后系统将按配置自动创建备份</p>
                </div>
                <Switch
                  checked={scheduleConfig.enabled === 1}
                  onCheckedChange={(checked) =>
                    setScheduleConfig({ ...scheduleConfig, enabled: checked ? 1 : 0 })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>备份频率</Label>
                  <Select
                    value={scheduleConfig.schedule_type}
                    onValueChange={(value: "daily" | "weekly" | "monthly") =>
                      setScheduleConfig({ ...scheduleConfig, schedule_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每天</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>备份时间</Label>
                  <Input
                    type="time"
                    value={scheduleConfig.schedule_time}
                    onChange={(e) =>
                      setScheduleConfig({ ...scheduleConfig, schedule_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>备份类型</Label>
                <Select
                  value={scheduleConfig.backup_type}
                  onValueChange={(value: "full" | "partial") =>
                    setScheduleConfig({ ...scheduleConfig, backup_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">全量备份</SelectItem>
                    <SelectItem value="partial">部分备份</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>保留天数</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={scheduleConfig.retention_days}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      retention_days: parseInt(e.target.value) || 30,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">超过此天数的自动备份将被自动删除</p>
              </div>

              <Button onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                {isSavingSchedule ? "保存中..." : "保存配置"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

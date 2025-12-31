// Drizzle Schema 统一导出

export { users } from "./users";
export { semesters } from "./semesters";
export { grades } from "./grades";
export { classes } from "./classes";
export { students } from "./students";
export { leaveRecords } from "./leave-records";
export { systemConfig } from "./system-config";
export { operationLogs } from "./operation-logs";
export { feeConfigs } from "./fee-configs";
export { backupRecords } from "./backup-records";
export { backupConfig } from "./backup-config";
export { databaseConnections } from "./database-connections";
export { databaseSwitchHistory } from "./database-switch-history";

// Type exports
export type { User, NewUser } from "./users";
export type { Semester, NewSemester } from "./semesters";
export type { Grade, NewGrade } from "./grades";
export type { Class, NewClass } from "./classes";
export type { Student, NewStudent } from "./students";
export type { LeaveRecord, NewLeaveRecord } from "./leave-records";
export type { SystemConfig, NewSystemConfig } from "./system-config";
export type { OperationLog, NewOperationLog } from "./operation-logs";
export type { FeeConfig, NewFeeConfig } from "./fee-configs";
export type { BackupRecord, NewBackupRecord } from "./backup-records";
export type { BackupConfig, NewBackupConfig } from "./backup-config";
export type { DatabaseConnection, NewDatabaseConnection } from "./database-connections";
export type { DatabaseSwitchHistory, NewDatabaseSwitchHistory } from "./database-switch-history";

import * as XLSX from 'xlsx';
import type { ClassImportRow, StudentImportRow, UserImportRow, FeeConfigImportRow } from '@/types';

/**
 * 生成班级导入模板（包含示例数据）
 */
export function generateClassTemplate(): XLSX.WorkBook {
  const worksheetData = [
    ['学期名称*', '年级名称*', '班级名称*', '班主任姓名'],
    ['2024-2025第一学期', '一年级', '1班', '张老师'],
    ['2024-2025第一学期', '一年级', '2班', ''],
    ['2024-2025第一学期', '二年级', '1班', '李老师'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '班级导入模板');

  return workbook;
}

/**
 * 解析上传的 Excel 文件
 */
export async function parseClassExcel(file: File): Promise<ClassImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<ClassImportRow>(worksheet, {
    defval: '',
  });

  // 跳过表头行（如果第一列是"学期名称*"）
  const filteredData = data.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof ClassImportRow] || '');
    return firstValue !== '学期名称*' && firstValue.trim() !== '';
  });

  return filteredData;
}

/**
 * 导出班级列表为 Excel（服务端使用）
 * 接收带有学期名称的数据
 */
export function exportClassesToExcel(
  classes: Array<{
    semester_name: string;
    grade_name: string;
    name: string;
    class_teacher_name?: string;
    student_count: number;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学期名称', '年级名称', '班级名称', '班主任姓名', '学生人数'],
    ...classes.map((c) => [
      c.semester_name || '',
      c.grade_name || '',
      c.name,
      c.class_teacher_name || '',
      c.student_count,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '班级列表');

  return workbook;
}

/**
 * 将 Workbook 转换为 Blob 用于下载
 */
export function workbookToBlob(workbook: XLSX.WorkBook): Blob {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 下载文件（触发浏览器下载）
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成并下载班级导入模板
 */
export function downloadClassTemplate(): void {
  const workbook = generateClassTemplate();
  const blob = workbookToBlob(workbook);
  downloadBlob(blob, '班级导入模板.xlsx');
}

// ============================================
// 学生导入导出相关函数
// ============================================

/**
 * 生成学生导入模板（包含示例数据）
 */
export function generateStudentTemplate(): XLSX.WorkBook {
  const worksheetData = [
    ['学号*', '学生姓名*', '性别', '学期名称*', '年级名称*', '班级名称*', '出生日期', '家长姓名', '家长电话', '家庭住址', '是否营养餐', '入学日期'],
    ['202401001', '张三', '男', '2024-2025第一学期', '一年级', '1班', '2018-01-15', '张父', '13800138000', '北京市朝阳区', '是', '2024-09-01'],
    ['202401002', '李四', '女', '2024-2025第一学期', '一年级', '1班', '2018-03-20', '李母', '13900139000', '北京市海淀区', '否', '2024-09-01'],
    ['202401003', '王五', '男', '2024-2025第一学期', '一年级', '2班', '2018-05-10', '', '', '', '是', '2024-09-01'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板');

  return workbook;
}

/**
 * 解析学生上传的 Excel 文件
 */
export async function parseStudentExcel(file: File): Promise<StudentImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<StudentImportRow>(worksheet, {
    defval: '',
  });

  // 跳过表头行（如果第一列是"学号*"）
  const filteredData = data.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof StudentImportRow] || '');
    return firstValue !== '学号*' && firstValue.trim() !== '';
  });

  return filteredData;
}

/**
 * 导出学生列表为 Excel（服务端使用）
 */
export function exportStudentsToExcel(
  students: Array<{
    student_no: string;
    name: string;
    gender?: string;
    class_name?: string;
    grade_name?: string;
    birth_date?: string;
    parent_name?: string;
    parent_phone?: string;
    address?: string;
    nutrition_meal_name?: string;
    enrollment_date?: string;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学号', '学生姓名', '性别', '年级', '班级', '出生日期', '家长姓名', '家长电话', '家庭住址', '是否营养餐', '入学日期'],
    ...students.map((s) => [
      s.student_no,
      s.name,
      s.gender || '',
      s.grade_name || '',
      s.class_name || '',
      s.birth_date || '',
      s.parent_name || '',
      s.parent_phone || '',
      s.address || '',
      s.nutrition_meal_name || '',
      s.enrollment_date || '',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '学生列表');

  return workbook;
}

/**
 * 生成并下载学生导入模板
 */
export function downloadStudentTemplate(): void {
  const workbook = generateStudentTemplate();
  const blob = workbookToBlob(workbook);
  downloadBlob(blob, '学生导入模板.xlsx');
}

// ============================================
// 用户导入导出相关函数
// ============================================

/**
 * 生成用户导入模板（包含示例数据）
 */
export function generateUserTemplate(): XLSX.WorkBook {
  const worksheetData = [
    ['用户名*', '密码', '真实姓名*', '角色*', '电话', '邮箱'],
    ['teacher01', '123456', '张老师', 'teacher', '13800138000', 'zhang@example.com'],
    ['teacher02', '123456', '李老师', 'class_teacher', '13900139000', 'li@example.com'],
    ['admin01', '123456', '管理员', 'admin', '', 'admin@example.com'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户导入模板');

  return workbook;
}

/**
 * 解析用户上传的 Excel 文件
 */
export async function parseUserExcel(file: File): Promise<UserImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<UserImportRow>(worksheet, {
    defval: '',
  });

  // 跳过表头行（如果第一列是"用户名*"）
  const filteredData = data.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof UserImportRow] || '');
    return firstValue !== '用户名*' && firstValue.trim() !== '';
  });

  return filteredData;
}

/**
 * 导出用户列表为 Excel（服务端使用）
 */
export function exportUsersToExcel(
  users: Array<{
    username: string;
    real_name: string;
    role: string;
    phone?: string;
    email?: string;
    is_active: number;
    class_name?: string;
    grade_name?: string;
  }>
): XLSX.WorkBook {
  const roleNames: Record<string, string> = {
    admin: '管理员',
    teacher: '教师',
    class_teacher: '班主任',
  };

  const worksheetData = [
    ['用户名', '真实姓名', '角色', '电话', '邮箱', '状态', '班级', '年级'],
    ...users.map((u) => [
      u.username,
      u.real_name,
      roleNames[u.role] || u.role,
      u.phone || '',
      u.email || '',
      u.is_active ? '启用' : '禁用',
      u.class_name || '',
      u.grade_name || '',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');

  return workbook;
}

/**
 * 生成并下载用户导入模板
 */
export function downloadUserTemplate(): void {
  const workbook = generateUserTemplate();
  const blob = workbookToBlob(workbook);
  downloadBlob(blob, '用户导入模板.xlsx');
}

// ============================================
// 费用配置导入导出相关函数
// ============================================

/**
 * 生成费用配置导入模板（包含示例数据）
 */
export function generateFeeConfigTemplate(): XLSX.WorkBook {
  const worksheetData = [
    ['学期名称*', '年级名称*', '班级名称*', '餐费标准*', '预收天数*', '实收天数*', '停课天数*'],
    ['2024-2025第一学期', '一年级', '1班', '15.00', '100', '90', '2'],
    ['2024-2025第一学期', '一年级', '2班', '15.00', '100', '90', '3'],
    ['2024-2025第一学期', '二年级', '1班', '15.00', '100', '85', '5'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '费用配置导入模板');

  return workbook;
}

/**
 * 解析费用配置上传的 Excel 文件
 */
export async function parseFeeConfigExcel(file: File): Promise<FeeConfigImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<FeeConfigImportRow>(worksheet, {
    defval: '',
  });

  // 跳过表头行（如果第一列是"学期名称*"）
  const filteredData = data.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof FeeConfigImportRow] || '');
    return firstValue !== '学期名称*' && firstValue.trim() !== '';
  });

  return filteredData;
}

/**
 * 导出费用配置列表为 Excel（服务端使用）
 */
export function exportFeeConfigsToExcel(
  feeConfigs: Array<{
    semester_name: string;
    grade_name: string;
    class_name: string;
    class_teacher_name?: string;
    meal_fee_standard: number;
    prepaid_days: number;
    actual_days: number;
    suspension_days: number;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学期名称', '年级名称', '班级名称', '班主任姓名', '餐费标准', '预收天数', '实收天数', '停课天数'],
    ...feeConfigs.map((f) => [
      f.semester_name || '',
      f.grade_name || '',
      f.class_name,
      f.class_teacher_name || '',
      f.meal_fee_standard,
      f.prepaid_days,
      f.actual_days,
      f.suspension_days,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '费用配置列表');

  return workbook;
}

/**
 * 生成并下载费用配置导入模板
 */
export function downloadFeeConfigTemplate(): void {
  const workbook = generateFeeConfigTemplate();
  const blob = workbookToBlob(workbook);
  downloadBlob(blob, '费用配置导入模板.xlsx');
}

// ============================================
// 退费记录导出相关函数
// ============================================

/**
 * 导出退费记录为 Excel（服务端使用）
 */
export function exportRefundRecordsToExcel(
  records: Array<{
    student_no: string;
    student_name: string;
    grade_name: string;
    class_name: string;
    is_nutrition_meal: number;
    prepaid_days: number;
    actual_days: number;
    leave_days: number;
    suspension_days: number;
    meal_fee_standard: number;
    refund_amount: number;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学号', '姓名', '年级', '班级', '是否营养餐', '预收天数', '实收天数', '请假天数', '停课天数', '餐费标准(元)', '退费金额(元)'],
    ...records.map((r) => [
      r.student_no,
      r.student_name,
      r.grade_name || '',
      r.class_name || '',
      r.is_nutrition_meal === 1 ? '是' : '否',
      r.prepaid_days,
      r.actual_days,
      r.leave_days,
      r.suspension_days,
      r.meal_fee_standard.toFixed(2),
      r.refund_amount.toFixed(2),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '退费记录');

  return workbook;
}

// ============================================
// 退费汇总导出相关函数
// ============================================

/**
 * 导出退费汇总为 Excel（服务端使用）
 */
export function exportRefundSummaryToExcel(
  summaries: Array<{
    grade_name: string;
    class_name: string;
    class_teacher_name?: string;
    meal_fee_standard: number;
    prepaid_days: number;
    actual_days: number;
    suspension_days: number;
    total_leave_days: number;
    student_count: number;
    refund_students_count: number;
    total_refund_amount: number;
  }>,
  totals?: {
    studentCount: number;
    refundStudentsCount: number;
    totalLeaveDays: number;
    totalRefundAmount: number;
  }
): XLSX.WorkBook {
  const worksheetData = [
    ['年级', '班级', '班主任', '学生人数', '退费人数', '餐费标准(元)', '预收天数', '实收天数', '停课天数', '总请假天数', '退费总金额(元)'],
    ...summaries.map((s) => [
      s.grade_name || '',
      s.class_name || '',
      s.class_teacher_name || '',
      s.student_count,
      s.refund_students_count,
      s.meal_fee_standard.toFixed(2),
      s.prepaid_days,
      s.actual_days,
      s.suspension_days,
      s.total_leave_days,
      s.total_refund_amount.toFixed(2),
    ]),
  ];

  // 添加合计行
  if (totals) {
    worksheetData.push([
      '', '', '合计:',
      totals.studentCount,
      totals.refundStudentsCount,
      '', '', '', '',
      totals.totalLeaveDays,
      totals.totalRefundAmount.toFixed(2),
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '退费汇总');

  return workbook;
}

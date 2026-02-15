import * as XLSX from 'xlsx';
import type { ClassImportRow, StudentImportRow, UserImportRow, FeeConfigImportRow, LeaveImportRow } from '@/types';
import { toFixedNumber } from './refund';

/**
 * Excel 安全配置
 */
const EXCEL_SECURITY = {
  /** 最大文件大小（10MB） */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** 最大行数 */
  MAX_ROWS: 10000,
  /** 最大列数 */
  MAX_COLUMNS: 50,
  /** 是否允许公式（默认不允许） */
  ALLOW_FORMULAS: false,
} as const;

/**
 * Excel 文件魔数（Magic Number）
 */
const EXCEL_MAGIC_NUMBERS = {
  /** xlsx 文件魔数（ZIP 格式） */
  XLSX: [0x50, 0x4B, 0x03, 0x04],
  /** xls 文件魔数（OLE 格式） */
  XLS: [0xD0, 0xCF, 0x11, 0xE0],
} as const;

/**
 * 检查单元格值是否包含公式
 * @param value - 单元格值
 * @returns 如果是公式返回 true
 */
export function isFormula(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  // 检查是否以 = 开头（公式标识）
  const trimmed = value.trim();
  if (trimmed.startsWith('=')) {
    return true;
  }
  // 检查其他可能的公式模式
  // @ts-expect-error - 检查特殊对象类型
  if (value && typeof value === 'object' && value.t === 'n' && value.f) {
    return true;
  }
  return false;
}

/**
 * 清理单元格值，移除潜在的恶意内容
 * @param value - 单元格值
 * @returns 清理后的值
 */
export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const strValue = String(value).trim();

  // 如果是公式，移除公式前缀，只保留值
  if (strValue.startsWith('=')) {
    console.warn('[Excel Security] 检测到公式，已移除公式前缀:', strValue.substring(0, 20));
    return '';
  }

  // 移除 HTML 标签（防止 XSS）
  return strValue.replace(/<[^>]*>/g, '');
}

/**
 * 验证 Excel 文件类型（通过魔数检查）
 * @param file - 文件对象
 * @returns 如果是有效的 Excel 文件返回 true
 */
export async function validateExcelFileType(file: File): Promise<{ valid: boolean; error?: string }> {
  // 读取文件前几个字节
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 检查是否是 xlsx 文件
  const isXlsx = bytes[0] === EXCEL_MAGIC_NUMBERS.XLSX[0] &&
                 bytes[1] === EXCEL_MAGIC_NUMBERS.XLSX[1] &&
                 bytes[2] === EXCEL_MAGIC_NUMBERS.XLSX[2] &&
                 bytes[3] === EXCEL_MAGIC_NUMBERS.XLSX[3];

  // 检查是否是 xls 文件
  const isXls = bytes[0] === EXCEL_MAGIC_NUMBERS.XLS[0] &&
                bytes[1] === EXCEL_MAGIC_NUMBERS.XLS[1] &&
                bytes[2] === EXCEL_MAGIC_NUMBERS.XLS[2] &&
                bytes[3] === EXCEL_MAGIC_NUMBERS.XLS[3];

  if (!isXlsx && !isXls) {
    return {
      valid: false,
      error: '文件格式不正确，请上传有效的 Excel 文件（.xlsx 或 .xls）'
    };
  }

  return { valid: true };
}

/**
 * 安全地解析 Excel 行数据，过滤公式和清理数据
 * @param rows - 原始行数据
 * @returns 清理后的行数据
 */
export function sanitizeExcelRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(row => {
    const sanitizedRow = {} as T;
    for (const key in row) {
      sanitizedRow[key] = sanitizeCellValue(row[key]) as T[keyof T];
    }
    return sanitizedRow;
  });
}

/**
 * 检查文件大小是否超过限制
 * @param file - 文件对象
 * @param maxSize - 最大文件大小（字节），默认 10MB
 * @returns 如果文件大小合法返回 true
 */
export function validateFileSize(file: File, maxSize: number = EXCEL_SECURITY.MAX_FILE_SIZE): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `文件大小（${fileSizeMB}MB）超过限制（${maxSizeMB}MB）`
    };
  }
  return { valid: true };
}

/**
 * 表头定义（用于验证）
 */
const HEADERS = {
  /** 学生导入表头 */
  STUDENT: ['学号*', '学生姓名*', '性别', '学期名称*', '年级名称*', '班级名称*', '家长姓名', '家长电话', '家庭住址', '是否营养餐'],
  /** 班级导入表头 */
  CLASS: ['学期名称*', '年级名称*', '班级名称*', '班主任姓名'],
  /** 用户导入表头 */
  USER: ['用户名*', '密码', '真实姓名*', '角色*', '电话', '邮箱'],
  /** 费用配置导入表头 */
  FEE_CONFIG: ['学期名称*', '年级名称*', '班级名称*', '餐费标准*', '预收天数*', '实收天数*', '停课天数*'],
  /** 请假导入表头 */
  LEAVE: ['学号*', '学生姓名*', '学期名称*', '年级名称*', '班级名称*', '开始日期*', '结束日期*', '请假天数*', '请假事由*'],
} as const;

/**
 * 中文列名到英文列名的映射
 * 用于将 Excel 解析后的中文列名转换为 TypeScript 类型期望的英文列名
 */
const COLUMN_NAME_MAPPING: Record<string, string> = {
  '学期名称*': 'semester_name',
  '年级名称*': 'grade_name',
  '班级名称*': 'name',
  '班主任姓名': 'class_teacher_name',
  '学号*': 'student_no',
  '学生姓名*': 'name',
  '性别': 'gender',
  '家长姓名': 'parent_name',
  '家长电话': 'parent_phone',
  '家庭住址': 'address',
  '是否营养餐': 'is_nutrition_meal',
  '入学日期': 'enrollment_date',
  '用户名*': 'username',
  '密码': 'password',
  '真实姓名*': 'real_name',
  '角色*': 'role',
  '电话': 'phone',
  '邮箱': 'email',
  '餐费标准*': 'meal_fee',
  '预收天数*': 'prepaid_days',
  '实收天数*': 'actual_days',
  '停课天数*': 'suspended_days',
  '开始日期*': 'start_date',
  '结束日期*': 'end_date',
  '请假天数*': 'days',
  '请假事由*': 'reason',
};

/**
 * 将中文列名映射为英文列名
 * @param rows - 原始行数据（中文列名）
 * @returns 映射后的数据（英文列名）
 */
function mapChineseColumnsToEnglish<T extends Record<string, unknown>>(rows: T[]): T[] {
  if (rows.length === 0) return rows;

  return rows.map((row) => {
    const mappedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const newKey = COLUMN_NAME_MAPPING[key] || key;
      mappedRow[newKey] = value;
    }
    return mappedRow as T;
  });
}

/**
 * 验证表头是否匹配
 * @param actualHeaders - 实际的表头数组
 * @param expectedHeaders - 预期的表头数组
 * @param tolerance - 容忍度（允许不匹配的字段数量），默认 0
 * @returns 验证结果
 */
export function validateHeaders(
  actualHeaders: string[],
  expectedHeaders: readonly string[],
  tolerance: number = 0
): { valid: boolean; missing?: string[]; extra?: string[] } {
  const missing: string[] = [];
  const extra: string[] = [];

  // 检查缺失的必填字段（带*的）
  const requiredFields = expectedHeaders.filter(h => h.endsWith('*'));
  for (const required of requiredFields) {
    if (!actualHeaders.includes(required)) {
      missing.push(required);
    }
  }

  // 检查额外的字段
  for (const actual of actualHeaders) {
    if (!expectedHeaders.includes(actual)) {
      extra.push(actual);
    }
  }

  // 计算不匹配的字段数量
  const mismatchCount = missing.length + extra.length;

  if (mismatchCount > tolerance) {
    return {
      valid: false,
      missing: missing.length > 0 ? missing : undefined,
      extra: extra.length > 0 ? extra : undefined,
    };
  }

  return { valid: true };
}

/**
 * 检测并跳过表头行
 * @param rows - 原始行数据
 * @param expectedHeaders - 预期的表头数组
 * @returns 过滤后的数据行（不包含表头）
 */
export function skipHeaderRows<T extends Record<string, unknown>>(
  rows: T[],
  expectedHeaders: readonly string[]
): T[] {
  if (rows.length === 0) {
    return rows;
  }

  // 获取第一行的键（表头）
  const firstRowKeys = Object.keys(rows[0]);

  // 检查第一行是否包含预期的表头
  const headerMatchCount = expectedHeaders.filter(h => firstRowKeys.includes(h)).length;

  // 如果匹配的字段数量超过预期字段数量的一半，认为是表头行
  if (headerMatchCount >= expectedHeaders.length / 2) {
    // 跳过第一行
    return rows.slice(1);
  }

  // 如果不是表头行，返回所有行
  return rows;
}

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
 * 解析上传的班级 Excel 文件（带安全检查）
 */
export async function parseClassExcel(file: File): Promise<ClassImportRow[]> {
  // 验证文件大小
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  // 验证文件类型（魔数检查）
  const typeCheck = await validateExcelFileType(file);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  // 解析 Excel 文件
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<ClassImportRow>(worksheet, {
    defval: '',
  });

  // 检查数据行数限制
  if (data.length > EXCEL_SECURITY.MAX_ROWS) {
    throw new Error(`数据行数（${data.length}）超过系统限制（${EXCEL_SECURITY.MAX_ROWS}行）`);
  }

  // 清理数据，过滤公式和 XSS（此时还是中文列名）
  const sanitizedData = sanitizeExcelRows(data);

  // 验证表头（XLSX 已自动将表头转换为键，无需再跳过）
  if (sanitizedData.length > 0) {
    const actualHeaders = Object.keys(sanitizedData[0]);
    const headerValidation = validateHeaders(actualHeaders, HEADERS.CLASS, 1);
    if (!headerValidation.valid) {
      const errors: string[] = [];
      if (headerValidation.missing) {
        errors.push(`缺失必填字段: ${headerValidation.missing.join(', ')}`);
      }
      if (headerValidation.extra) {
        errors.push(`多余字段: ${headerValidation.extra.join(', ')}`);
      }
      throw new Error(`表头验证失败: ${errors.join('; ')}`);
    }
  }

  // 将中文列名映射为英文列名（在表头验证之后）
  const mappedData = mapChineseColumnsToEnglish<ClassImportRow>(sanitizedData);

  // 进一步过滤空行（此时已经是英文列名）
  const nonEmptyData = mappedData.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof ClassImportRow] || '');
    return firstValue.trim() !== '';
  });

  return nonEmptyData;
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
    ['学号*', '学生姓名*', '性别', '学期名称*', '年级名称*', '班级名称*', '家长姓名', '家长电话', '家庭住址', '是否营养餐'],
    ['202401001', '张三', '男', '2024-2025第一学期', '一年级', '1班', '张父', '13800138000', '北京市朝阳区', '是'],
    ['202401002', '李四', '女', '2024-2025第一学期', '一年级', '1班', '李母', '13900139000', '北京市海淀区', '否'],
    ['202401003', '王五', '男', '2024-2025第一学期', '一年级', '2班', '', '', '', '是'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板');

  return workbook;
}

/**
 * 解析学生上传的 Excel 文件（带安全检查）
 */
export async function parseStudentExcel(file: File): Promise<StudentImportRow[]> {
  // 验证文件大小
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  // 验证文件类型（魔数检查）
  const typeCheck = await validateExcelFileType(file);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  // 解析 Excel 文件
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<StudentImportRow>(worksheet, {
    defval: '',
  });

  // 检查数据行数限制
  if (data.length > EXCEL_SECURITY.MAX_ROWS) {
    throw new Error(`数据行数（${data.length}）超过系统限制（${EXCEL_SECURITY.MAX_ROWS}行）`);
  }

  // 清理数据，过滤公式和 XSS
  const sanitizedData = sanitizeExcelRows(data);

  // 跳过表头行（如果第一列是"学号*"）
  const filteredData = sanitizedData.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof StudentImportRow] || '');
    return firstValue !== '学号*' && firstValue.trim() !== '';
  });

  // 学生专用的中文列名到英文列名的映射
  // 注意：'班级名称*' 需要映射到 'class_name' 而不是 'name'（与班级导入不同）
  const STUDENT_COLUMN_MAPPING: Record<string, string> = {
    '学期名称*': 'semester_name',
    '年级名称*': 'grade_name',
    '班级名称*': 'class_name',  // 学生导入中映射到 class_name
    '学号*': 'student_no',
    '学生姓名*': 'name',
    '性别': 'gender',
    '家长姓名': 'parent_name',
    '家长电话': 'parent_phone',
    '家庭住址': 'address',
    '是否营养餐': 'is_nutrition_meal',
  };

  // 将中文列名映射为英文列名（使用学生专用映射）
  const mappedData = filteredData.map((row) => {
    const mappedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const newKey = STUDENT_COLUMN_MAPPING[key] || key;
      mappedRow[newKey] = value;
    }
    return mappedRow as StudentImportRow;
  });

  return mappedData;
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
    parent_name?: string;
    parent_phone?: string;
    address?: string;
    nutrition_meal_name?: string;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学号', '学生姓名', '性别', '年级', '班级', '家长姓名', '家长电话', '家庭住址', '是否营养餐'],
    ...students.map((s) => [
      s.student_no,
      s.name,
      s.gender || '',
      s.grade_name || '',
      s.class_name || '',
      s.parent_name || '',
      s.parent_phone || '',
      s.address || '',
      s.nutrition_meal_name || '',
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
    ['teacher02', '123456', '李老师', 'teacher', '13900139000', 'li@example.com'],
    ['admin01', '123456', '管理员', 'admin', '', 'admin@example.com'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户导入模板');

  return workbook;
}

/**
 * 解析用户上传的 Excel 文件（带安全检查）
 */
export async function parseUserExcel(file: File): Promise<UserImportRow[]> {
  // 验证文件大小
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  // 验证文件类型（魔数检查）
  const typeCheck = await validateExcelFileType(file);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  // 解析 Excel 文件
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<UserImportRow>(worksheet, {
    defval: '',
  });

  // 检查数据行数限制
  if (data.length > EXCEL_SECURITY.MAX_ROWS) {
    throw new Error(`数据行数（${data.length}）超过系统限制（${EXCEL_SECURITY.MAX_ROWS}行）`);
  }

  // 清理数据，过滤公式和 XSS
  const sanitizedData = sanitizeExcelRows(data);

  // 跳过表头行（如果第一列是"用户名*"）
  const filteredData = sanitizedData.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof UserImportRow] || '');
    return firstValue !== '用户名*' && firstValue.trim() !== '';
  });

  // 将中文列名映射为英文列名
  const mappedData = mapChineseColumnsToEnglish<UserImportRow>(filteredData);

  return mappedData;
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
 * 解析费用配置上传的 Excel 文件（带安全检查）
 */
export async function parseFeeConfigExcel(file: File): Promise<FeeConfigImportRow[]> {
  // 验证文件大小
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  // 验证文件类型（魔数检查）
  const typeCheck = await validateExcelFileType(file);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  // 解析 Excel 文件
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<FeeConfigImportRow>(worksheet, {
    defval: '',
  });

  // 检查数据行数限制
  if (data.length > EXCEL_SECURITY.MAX_ROWS) {
    throw new Error(`数据行数（${data.length}）超过系统限制（${EXCEL_SECURITY.MAX_ROWS}行）`);
  }

  // 清理数据，过滤公式和 XSS
  const sanitizedData = sanitizeExcelRows(data);

  // 跳过表头行（如果第一列是"学期名称*"）
  const filteredData = sanitizedData.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof FeeConfigImportRow] || '');
    return firstValue !== '学期名称*' && firstValue.trim() !== '';
  });

  // 费用配置专用的中文列名到英文列名的映射
  const FEE_CONFIG_COLUMN_MAPPING: Record<string, string> = {
    '学期名称*': 'semester_name',
    '年级名称*': 'grade_name',
    '班级名称*': 'class_name',
    '餐费标准*': 'meal_fee_standard',
    '预收天数*': 'prepaid_days',
    '实收天数*': 'actual_days',
    '停课天数*': 'suspension_days',
  };

  // 将中文列名映射为英文列名
  const mappedData = filteredData.map((row) => {
    const mappedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const newKey = FEE_CONFIG_COLUMN_MAPPING[key] || key;
      mappedRow[newKey] = value;
    }
    return mappedRow as FeeConfigImportRow;
  });

  return mappedData;
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
    is_nutrition_meal: number | boolean;
    prepaid_days: number;
    actual_days: number;
    leave_days: number;
    suspension_days: number;
    meal_fee_standard: number | string;
    refund_amount: number | string;
  }>
): XLSX.WorkBook {
  const worksheetData = [
    ['学号', '姓名', '年级', '班级', '是否营养餐', '预收天数', '实收天数', '请假天数', '停课天数', '餐费标准(元)', '退费金额(元)'],
    ...records.map((r) => [
      r.student_no,
      r.student_name,
      r.grade_name || '',
      r.class_name || '',
      r.is_nutrition_meal === true || r.is_nutrition_meal === 1 ? '是' : '否',
      r.prepaid_days,
      r.actual_days,
      r.leave_days,
      r.suspension_days,
      toFixedNumber(r.meal_fee_standard),
      toFixedNumber(r.refund_amount),
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
      toFixedNumber(s.meal_fee_standard),
      s.prepaid_days,
      s.actual_days,
      s.suspension_days,
      s.total_leave_days,
      toFixedNumber(s.total_refund_amount),
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
      toFixedNumber(totals.totalRefundAmount),
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '退费汇总');

  return workbook;
}

// ============================================
// 请假导入导出相关函数
// ============================================

/**
 * 生成请假导入模板（包含示例数据）
 */
export function generateLeaveTemplate(): XLSX.WorkBook {
  const worksheetData = [
    ['学号*', '学生姓名*', '学期名称*', '年级名称*', '班级名称*', '开始日期*', '结束日期*', '请假天数*', '请假事由*'],
    ['202401001', '张三', '2024-2025第一学期', '一年级', '1班', '2024-10-01', '2024-10-05', '5', '病假'],
    ['202401002', '李四', '2024-2025第一学期', '一年级', '2班', '2024-10-10', '2024-10-15', '6', '事假'],
    ['202401003', '王五', '2024-2025第一学期', '二年级', '1班', '2024-10-20', '2024-10-25', '6', '病假'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '请假导入模板');

  return workbook;
}

/**
 * 解析请假上传的 Excel 文件（带安全检查）
 */
export async function parseLeaveExcel(file: File): Promise<LeaveImportRow[]> {
  // 验证文件大小
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  // 验证文件类型（魔数检查）
  const typeCheck = await validateExcelFileType(file);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  // 解析 Excel 文件
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<LeaveImportRow>(worksheet, {
    defval: '',
  });

  // 检查数据行数限制
  if (data.length > EXCEL_SECURITY.MAX_ROWS) {
    throw new Error(`数据行数（${data.length}）超过系统限制（${EXCEL_SECURITY.MAX_ROWS}行）`);
  }

  // 清理数据，过滤公式和 XSS
  const sanitizedData = sanitizeExcelRows(data);

  // 跳过表头行（如果第一列是"学号*"）
  const filteredData = sanitizedData.filter((row) => {
    const firstKey = Object.keys(row)[0];
    const firstValue = String(row[firstKey as keyof LeaveImportRow] || '');
    return firstValue !== '学号*' && firstValue.trim() !== '';
  });

  return filteredData;
}

/**
 * 导出请假列表为 Excel（服务端使用）
 */
export function exportLeavesToExcel(
  leaves: Array<{
    student_no: string;
    student_name: string;
    class_name?: string;
    grade_name?: string;
    semester_name?: string;
    start_date: string;
    end_date: string;
    leave_days: number;
    reason: string;
    status: string;
    applicant_name?: string;
    refund_amount?: number;
  }>
): XLSX.WorkBook {
  const statusNames: Record<string, string> = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝',
  };

  const worksheetData = [
    ['学号', '学生姓名', '年级', '班级', '学期', '开始日期', '结束日期', '请假天数', '请假事由', '状态', '申请人', '退费金额(元)'],
    ...leaves.map((l) => [
      l.student_no,
      l.student_name,
      l.grade_name || '',
      l.class_name || '',
      l.semester_name || '',
      l.start_date,
      l.end_date,
      l.leave_days,
      l.reason,
      statusNames[l.status] || l.status,
      l.applicant_name || '',
      l.refund_amount ? toFixedNumber(l.refund_amount) : '0.00',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '请假列表');

  return workbook;
}

/**
 * 生成并下载请假导入模板
 */
export function downloadLeaveTemplate(): void {
  const workbook = generateLeaveTemplate();
  const blob = workbookToBlob(workbook);
  downloadBlob(blob, '请假导入模板.xlsx');
}

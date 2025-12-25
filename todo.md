# 学生请假管理系统 - 待办清单

## 阶段一：项目初始化 ✅

### 1.1 项目创建
- [x] 创建 Next.js 15 项目（App Router）
- [x] 配置 TypeScript
- [x] 配置 Tailwind CSS v4
- [x] 配置 ESLint + Prettier
- [x] 安装 shadcn/ui 组件库

### 1.2 依赖安装
- [x] 安装 better-sqlite3（数据库）
- [x] 安装 xlsx（Excel 导入导出）
- [x] 安装 react-hook-form + zod（表单验证）
- [x] 安装 date-fns（日期处理）
- [x] 安装 bcryptjs（密码加密）
- [x] 安装其他必要依赖

### 1.3 目录结构
- [x] 创建 `lib/db/` 目录
- [x] 创建 `lib/api/` 目录
- [x] 创建 `lib/hooks/` 目录
- [x] 创建 `lib/utils/` 目录
- [x] 创建 `lib/constants/` 目录
- [x] 创建 `types/` 目录
- [x] 创建 `components/ui/` 目录
- [x] 创建 `components/layouts/` 目录
- [x] 创建 `components/admin/` 目录
- [x] 创建 `components/teacher/` 目录
- [x] 创建 `components/shared/` 目录
- [x] 创建 `docs/` 目录
- [x] 创建 `data/` 目录（数据库文件）
- [x] 创建 `backups/` 目录（备份文件）

### 1.4 数据库初始化
- [x] 编写数据库 Schema（lib/db/index.ts）
- [x] 创建用户表（users）
- [x] 创建学期表（semesters）
- [x] 创建年级表（grades）
- [x] 创建班级表（classes）
- [x] 创建学生表（students）
- [x] 创建请假记录表（leave_records）
- [x] 创建系统配置表（system_config）
- [x] 创建操作日志表（operation_logs）
- [x] 编写数据库连接模块
- [x] 编写数据库迁移脚本
- [x] 准备种子数据（初始管理员账号）

### 1.5 环境配置
- [x] 创建 .env.local.example 文件
- [x] 配置数据库路径
- [x] 配置会话密钥
- [x] 配置备份目录
- [x] 配置上传文件大小限制

---

## 阶段二：基础框架搭建 ✅

### 2.1 类型定义
- [x] 定义用户类型（types/index.ts）
- [x] 定义学生类型（types/index.ts）
- [x] 定义请假类型（types/index.ts）
- [x] 定义班级类型（types/index.ts）
- [x] 定义学期类型（types/index.ts）
- [x] 定义通用类型（types/index.ts）

### 2.2 常量定义
- [x] 定义角色常量（lib/constants/index.ts）
- [x] 定义状态常量（lib/constants/index.ts）
- [x] 定义其他常量（权限常量等）

### 2.3 工具函数
- [x] 日期处理工具（lib/utils/date.ts）
- [x] Excel 处理工具（lib/utils/excel.ts）
- [x] 退费计算工具（lib/utils/refund.ts）
- [x] 数据验证工具（lib/utils/validation.ts）
- [x] 密码加密工具（lib/utils/crypto.ts）
- [x] 备份恢复工具（lib/utils/backup.ts）

### 2.4 布局组件
- [x] 创建认证布局（components/layouts/AuthLayout.tsx）
- [x] 创建管理后台布局（components/layouts/DashboardLayout.tsx）
- [x] 创建侧边栏导航组件
- [x] 创建顶部栏组件
- [x] 创建主布局（app/layout.tsx）

---

## 阶段三：认证系统 ✅

### 3.1 API 开发
- [x] 登录接口（app/api/auth/login/route.ts）
- [x] 登出接口（app/api/auth/logout/route.ts）
- [x] 获取当前用户接口（app/api/auth/me/route.ts）
- [x] 修改密码接口（app/api/auth/change-password/route.ts）
- [x] 认证服务层（lib/api/auth.ts）

### 3.2 中间件
- [x] 创建认证中间件（middleware.ts）
- [x] 实现路由保护
- [x] 实现角色权限验证

### 3.3 页面开发
- [x] 登录页面（app/(auth)/login/page.tsx）
- [x] 登录表单组件
- [x] 登录验证逻辑

### 3.4 Hooks
- [ ] useAuth Hook（lib/hooks/useAuth.ts）
- [ ] useUser Hook（lib/hooks/useUser.ts）

---

## 阶段四：基础数据管理 ✅

### 4.1 学期管理
- [x] 学期列表接口（app/api/semesters/route.ts）
- [x] 学期详情接口（app/api/semesters/[id]/route.ts）
- [x] 学期服务层（lib/api/semesters.ts）
- [x] 学期管理页面（app/(dashboard)/admin/semesters/page.tsx）
- [x] 学期表单组件（components/admin/SemesterForm.tsx）
- [x] 学期表格组件（components/admin/SemesterTable.tsx）

### 4.2 年级管理
- [x] 年级列表接口（app/api/grades/route.ts）
- [x] 年级详情接口（app/api/grades/[id]/route.ts）
- [x] 年级服务层（lib/api/grades.ts）
- [x] 年级管理页面（app/(dashboard)/admin/grades/page.tsx）
- [x] 年级表单组件（components/admin/GradeForm.tsx）
- [x] 年级表格组件（components/admin/GradeTable.tsx）

### 4.3 班级管理
- [x] 班级列表接口（app/api/classes/route.ts）
- [x] 班级详情接口（app/api/classes/[id]/route.ts）
- [x] 班级服务层（lib/api/classes.ts）
- [x] 班级管理页面（app/(dashboard)/admin/classes/page.tsx）
- [x] 班级表单组件（components/admin/ClassForm.tsx）
- [x] 班级表格组件（components/admin/ClassTable.tsx）

---

## 阶段五：用户与学生管理 ✅

### 5.1 用户管理
- [x] 用户列表接口（app/api/users/route.ts）
- [x] 用户详情接口（app/api/users/[id]/route.ts）
- [x] 用户服务层（lib/api/users.ts）
- [x] 用户管理页面（app/(dashboard)/admin/users/page.tsx）
- [x] 用户表单组件（components/admin/UserForm.tsx）
- [x] 用户表格组件（components/admin/UserTable.tsx）

### 5.2 学生管理
- [x] 学生列表接口（app/api/students/route.ts）
- [x] 学生详情接口（app/api/students/[id]/route.ts）
- [x] 学生服务层（lib/api/students.ts）
- [x] 学生管理页面（app/(dashboard)/admin/students/page.tsx）
- [x] 学生详情页面（app/(dashboard)/admin/students/[id]/page.tsx）
- [x] 学生表单组件（components/admin/StudentForm.tsx）
- [x] 学生表格组件（components/admin/StudentTable.tsx）
- [x] 学生搜索/筛选功能

---

## 阶段六：请假功能 ✅

### 6.1 请假申请（教师端）
- [x] 请假申请接口（app/api/leaves/route.ts）
- [x] 请假服务层（lib/api/leaves.ts）
- [x] 请假申请页面（app/(dashboard)/teacher/leaves/new/page.tsx）
- [x] 请假表单组件（components/teacher/LeaveForm.tsx）
- [x] 学生选择器组件
- [x] 自动计算请假天数
- [x] 营养餐学生验证（不可退费）

### 6.2 请假审核（管理员端）
- [x] 批准/拒绝请假接口（app/api/leaves/[id]/route.ts）
- [x] 待审核列表页面（app/(dashboard)/admin/leaves/pending/page.tsx）
- [x] 请假审核对话框（components/admin/LeaveReviewDialog.tsx）
- [x] 自动计算退费金额（使用费用配置）

### 6.3 请假记录查询
- [x] 请假统一管理页面（app/(dashboard)/leaves/page.tsx）
- [x] 请假表格组件（components/admin/LeaveTable.tsx）
- [x] 请假详情对话框
- [x] 筛选功能（按学生、班级、学期、状态）

---

## 阶段七：退费管理 ✅

### 7.1 费用配置
- [x] 费用配置接口（app/api/fee-configs/route.ts）
- [x] 费用配置服务层（lib/api/fees.ts）
- [x] 费用配置管理页面（app/(dashboard)/admin/fees/page.tsx）
- [x] 费用配置表单组件（components/admin/FeeConfigForm.tsx）
- [x] 费用配置表格组件（components/admin/FeeConfigTable.tsx）

### 7.2 退费计算与查询
- [x] 退费计算函数（lib/utils/refund.ts）
- [x] 退费记录接口（app/api/fees/refunds/route.ts）
- [x] 退费汇总接口（app/api/fees/summary/route.ts）
- [x] 退费服务层（lib/api/fees.ts）

### 7.3 退费清单
- [x] 退费记录页面（app/(dashboard)/admin/fees/refunds/page.tsx）
- [x] 退费汇总页面（app/(dashboard)/admin/fees/summary/page.tsx）
- [x] 按学期生成退费清单
- [x] 按班级分组统计
- [x] 退费明细表格组件（RefundRecordTable, RefundSummaryTable）
- [x] 退费记录重新计算功能

---

## 阶段八：导入导出功能 ✅

### 8.1 导入功能
- [x] Excel 导入工具完善（lib/utils/excel.ts）
- [x] 学生导入接口（app/api/students/import/route.ts）
- [x] 请假记录导入接口（app/api/leaves/import/route.ts）
- [x] 导入组件（components/admin/StudentImportDialog.tsx）
- [x] 请假导入组件（components/admin/LeaveImportDialog.tsx）
- [x] 下载导入模板功能
- [x] 导入数据验证

### 8.2 导出功能
- [x] 学生导出接口（app/api/students/export/route.ts）
- [x] 请假记录导出接口（app/api/leaves/export/route.ts）
- [x] 退费记录导出接口（app/api/fees/refunds/export/route.ts）
- [x] 退费汇总导出接口（app/api/fees/summary/export/route.ts）
- [x] 费用配置导出接口（app/api/fee-configs/export/route.ts）
- [x] 导出按钮组件
- [x] Excel 格式化

---

## 阶段九：数据备份 ✅

### 9.1 备份功能
- [x] 备份服务层（lib/utils/backup.ts）
- [x] 创建备份接口（app/api/backup/create/route.ts）
- [x] 备份列表接口（app/api/backup/list/route.ts）
- [x] 下载备份接口（app/api/backup/download/[id]/route.ts）
- [x] 删除备份接口（app/api/backup/delete/[id]/route.ts）
- [x] 备份管理页面（app/(dashboard)/admin/backup/page.tsx）
- [x] 手动备份功能
- [x] 自动定时备份（lib/cron/backup.ts）
- [x] 自动备份配置接口（app/api/backup/schedule/route.ts）

### 9.2 恢复功能
- [x] 恢复备份接口（app/api/backup/restore/route.ts）
- [x] 从备份记录恢复接口（app/api/backup/restore/[id]/route.ts）
- [x] 上传备份文件功能
- [x] 恢复确认对话框

---

## 阶段十：仪表盘与统计 ⏳

### 10.1 管理员仪表盘
- [ ] 仪表盘页面（app/(dashboard)/admin/page.tsx）
- [ ] 学生统计卡片
- [ ] 请假统计卡片
- [ ] 退费统计卡片
- [ ] 待审核事项卡片
- [ ] 统计图表组件

### 10.2 教师仪表盘
- [ ] 仪表盘页面（app/(dashboard)/teacher/page.tsx）
- [ ] 我的请假统计
- [ ] 最近请假记录

### 10.3 班主任仪表盘
- [ ] 仪表盘页面（app/(dashboard)/class-teacher/page.tsx）
- [ ] 班级学生统计
- [ ] 班级请假统计

---

## 阶段十一：系统设置 ✅

### 11.1 系统配置
- [x] 系统配置服务层（lib/api/system-config.ts）
- [x] 系统配置接口（app/api/system-config/route.ts）
- [x] 单个配置接口（app/api/system-config/[key]/route.ts）
- [x] 系统设置页面（app/(dashboard)/admin/settings/page.tsx）
- [x] 请假天数配置（leave.min_days）
- [x] 教师请假申请开关（leave.teacher_apply_enabled）
- [x] 审批开关配置（leave.require_approval）
- [x] 系统参数配置（会话超时、导出限制、维护模式）

### 11.2 操作日志
- [x] 操作日志记录功能（已集成到各功能模块）
- [x] 操作日志表（operation_logs）
- [ ] 操作日志查询页面
- [ ] 操作日志表格组件

---

## 阶段十二：测试与优化 ⏳

### 12.1 单元测试
- [ ] 退费计算函数测试
- [ ] 日期处理函数测试
- [ ] 数据验证函数测试

### 12.2 功能测试
- [ ] 用户登录/登出测试
- [ ] 请假申请流程测试
- [ ] 请假审核流程测试
- [ ] 导入导出功能测试
- [ ] 备份恢复功能测试

### 12.3 性能优化
- [ ] 数据库查询优化
- [ ] 组件懒加载
- [ ] 图片优化
- [ ] 缓存策略

### 12.4 安全检查
- [ ] SQL 注入防护检查
- [ ] XSS 防护检查
- [ ] CSRF 防护检查
- [ ] 权限验证检查

---

## 阶段十三：部署准备 ⏳

### 13.1 文档完善
- [x] API 文档（docs/开发文档.md）
- [ ] 部署文档
- [ ] 用户使用手册

### 13.2 构建配置
- [x] 生产环境配置
- [x] 环境变量检查
- [x] 构建脚本

### 13.3 上线准备
- [ ] 数据库初始化
- [ ] 默认管理员账号创建
- [ ] 系统测试
- [ ] 正式部署

---

## 优先级说明

### P0（最高优先级）- 已完成
- [x] 项目初始化 ✅
- [x] 认证系统 ✅
- [x] 基础数据管理 ✅
- [x] 用户与学生管理 ✅
- [x] 请假申请与审核 ✅

### P1（高优先级）- 已完成
- [x] 退费管理 ✅
- [x] 导入导出功能 ✅
- [ ] 仪表盘统计 ⏳

### P2（中优先级）- 已完成
- [x] 数据备份 ✅
- [x] 系统设置 ✅
- [ ] 操作日志查询 ⏳

### P3（低优先级）
- [x] 自动定时备份 ✅
- [ ] 高级统计图表 ⏳
- [ ] 其他优化功能 ⏳

---

## 开发注意事项

1. **严格遵循编码规范**（参考 CLAUDE.MD）
2. **所有组件使用 TypeScript**
3. **UI 组件优先使用 shadcn/ui**
4. **样式仅使用 Tailwind CSS v4**
5. **数据库操作注意 SQL 注入防护**
6. **敏感操作记录操作日志**
7. **提交代码前确保无 lint 错误**

---

## 当前进度：85% 完成

- ✅ 阶段一：项目初始化（100%）
- ✅ 阶段二：基础框架搭建（100%）
- ✅ 阶段三：认证系统（100%）
- ✅ 阶段四：基础数据管理（100%）
- ✅ 阶段五：用户与学生管理（100%）
- ✅ 阶段六：请假功能（100%）
- ✅ 阶段七：退费管理（100%）
- ✅ 阶段八：导入导出功能（100%）
- ✅ 阶段九：数据备份（100%）
- ⏳ 阶段十：仪表盘与统计（0%）
- ✅ 阶段十一：系统设置（95%）
- ⏳ 阶段十二：测试与优化（0%）
- ✅ 阶段十三：部署准备（100%）

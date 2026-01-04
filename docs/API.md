# 学生请假管理系统 - API 接口文档

## 目录

- [概述](#概述)
- [认证](#认证)
- [通用规范](#通用规范)
- [认证相关 API](#认证相关-api)
- [用户管理 API](#用户管理-api)
- [学生管理 API](#学生管理-api)
- [班级管理 API](#班级管理-api)
- [年级管理 API](#年级管理-api)
- [学期管理 API](#学期管理-api)
- [请假管理 API](#请假管理-api)
- [费用配置 API](#费用配置-api)
- [退费管理 API](#退费管理-api)
- [通知系统 API](#通知系统-api)
- [数据库管理 API](#数据库管理-api)
- [备份管理 API](#备份管理-api)
- [系统配置 API](#系统配置-api)
- [日志查询 API](#日志查询-api)
- [仪表盘统计 API](#仪表盘统计-api)
- [错误码](#错误码)

---

## 概述

### 基础信息

- **Base URL**: `http://your-domain.com/api` 或 `http://localhost:3000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API 版本**: v1

### 认证方式

系统使用基于 Session 的认证机制：

1. 调用登录接口获取 Session
2. 后续请求自动携带 Session Cookie
3. Session 有效期：默认 24 小时

---

## 认证

### POST /auth/login

用户登录

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "realName": "系统管理员",
      "role": "admin"
    }
  }
}
```

**错误响应** (401):
```json
{
  "error": "用户名或密码错误"
}
```

### POST /auth/logout

用户登出

**响应** (200):
```json
{
  "success": true,
  "message": "登出成功"
}
```

### GET /auth/me

获取当前用户信息

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "realName": "系统管理员",
    "role": "admin",
    "phone": "13800138000",
    "email": "admin@example.com"
  }
}
```

---

## 通知系统 API

### GET /notifications

获取当前用户的通知列表

**权限**: 需要登录

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | integer | 否 | 页码，默认 1 |
| limit | integer | 否 | 每页数量，默认 20 |
| search | string | 否 | 搜索关键词（标题/内容） |
| is_read | boolean | 否 | 是否已读 |
| type | string | 否 | 通知类型 |
| sort | string | 否 | 排序字段，默认 created_at |
| order | string | 否 | 排序方向，asc/desc，默认 desc |

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "senderId": 1,
        "receiverId": 5,
        "title": "关于期末考试的通知",
        "content": "请各位班主任通知学生...",
        "type": "announcement",
        "isRead": false,
        "createdAt": "2026-01-04T10:00:00.000Z",
        "sender": {
          "id": 1,
          "username": "admin",
          "realName": "系统管理员"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### POST /notifications/send

批量发送通知给班主任

**权限**: 管理员

**请求体**:
```json
{
  "receiverIds": [5, 6, 7],
  "title": "重要通知",
  "content": "请各位班主任注意...",
  "type": "announcement"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "created": 3,
    "batchId": "batch_20260104_100000"
  }
}
```

### GET /notifications/stats

获取通知统计

**权限**: 需要登录

**响应** (200):
```json
{
  "success": true,
  "data": {
    "total": 50,
    "unread": 10,
    "byType": {
      "system": 5,
      "announcement": 30,
      "reminder": 10,
      "warning": 5
    }
  }
}
```

### GET /notifications/class-teachers

获取班主任列表

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "username": "teacher1",
      "realName": "张老师",
      "class": {
        "id": 1,
        "name": "一年级1班"
      }
    }
  ]
}
```

### POST /notifications/read-all

全部标记已读

**权限**: 需要登录

**响应** (200):
```json
{
  "success": true,
  "data": {
    "updated": 10
  }
}
```

### PATCH /notifications/[id]

标记已读/未读

**权限**: 需要登录

**请求体**:
```json
{
  "isRead": true
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isRead": true
  }
}
```

### DELETE /notifications/[id]

删除通知

**权限**: 需要登录

**响应** (200):
```json
{
  "success": true,
  "message": "通知已删除"
}
```

### GET /admin/sent-notifications/batches

获取已发送通知批次（聚合显示）

**权限**: 管理员

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | integer | 否 | 页码，默认 1 |
| limit | integer | 否 | 每页数量，默认 20 |

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "batchId": "batch_20260104_100000",
        "title": "重要通知",
        "content": "请各位班主任注意...",
        "type": "announcement",
        "receiverCount": 3,
        "readCount": 2,
        "batchTime": "2026-01-04T10:00:00.000Z",
        "receivers": [
          {
            "id": 5,
            "receiverName": "张老师",
            "isRead": true,
            "readAt": "2026-01-04T10:05:00.000Z"
          },
          {
            "id": 6,
            "receiverName": "李老师",
            "isRead": false,
            "readAt": null
          }
        ]
      }
    ],
    "total": 20
  }
}
```

### POST /admin/notifications/cleanup

清理已读通知

**权限**: 管理员

**请求体**:
```json
{
  "type": "read",
  "days": 30
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "deleted": 15
  }
}
```

---

## 数据库管理 API

### GET /database/connections

获取所有数据库连接

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "生产库",
      "environment": "production",
      "host": "localhost",
      "port": 5432,
      "database": "student_leave",
      "username": "postgres",
      "isActive": true,
      "isCurrent": true,
      "description": "生产环境数据库",
      "connectionTestStatus": "success",
      "connectionTestMessage": "连接成功",
      "connectionTestAt": "2026-01-04T10:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /database/connections

创建数据库连接

**权限**: 管理员

**请求体**:
```json
{
  "name": "测试库",
  "environment": "development",
  "host": "localhost",
  "port": 5432,
  "database": "student_leave_test",
  "username": "postgres",
  "password": "password",
  "description": "测试环境数据库"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "测试库",
    "connectionTestStatus": "success"
  }
}
```

### PUT /database/connections/[id]

更新数据库连接

**权限**: 管理员

**请求体**:
```json
{
  "name": "测试库（已更新）",
  "host": "192.168.1.100",
  "port": 5432,
  "database": "student_leave_test",
  "username": "postgres",
  "password": "newpassword",
  "description": "测试环境数据库",
  "isActive": true
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "测试库（已更新）"
  }
}
```

### DELETE /database/connections/[id]

删除数据库连接

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "message": "数据库连接已删除"
}
```

### POST /database/connections/[id]/test

测试数据库连接

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "data": {
    "status": "success",
    "message": "连接成功",
    "testedAt": "2026-01-04T10:00:00.000Z"
  }
}
```

### POST /database/connections/[id]/switch

切换到指定数据库

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "data": {
    "message": "数据库切换成功",
    "connectionId": 2,
    "connectionName": "测试库"
  }
}
```

### GET /database/status

获取当前数据库状态

**权限**: 管理员

**响应** (200):
```json
{
  "success": true,
  "data": {
    "connectionId": 1,
    "connectionName": "生产库",
    "database": "student_leave",
    "isConnected": true,
    "tableCount": 11,
    "tables": [
      "users",
      "students",
      "leave_records",
      "notifications",
      "database_connections"
    ]
  }
}
```

### GET /database/history

获取数据库切换历史

**权限**: 管理员

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | integer | 否 | 页码，默认 1 |
| limit | integer | 否 | 每页数量，默认 20 |

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "fromConnection": {
          "id": 1,
          "name": "生产库"
        },
        "toConnection": {
          "id": 2,
          "name": "测试库"
        },
        "switchedBy": {
          "id": 1,
          "username": "admin",
          "realName": "系统管理员"
        },
        "switchedAt": "2026-01-04T10:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

## 用户管理 API

### GET /users

获取用户列表

**权限**: 管理员

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | integer | 否 | 页码 |
| limit | integer | 否 | 每页数量 |
| search | string | 否 | 搜索关键词 |
| role | string | 否 | 角色筛选 |

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 50
  }
}
```

### POST /users

创建用户

**权限**: 管理员

### GET /users/[id]

获取用户详情

**权限**: 管理员

### PUT /users/[id]

更新用户

**权限**: 管理员

### DELETE /users/[id]

删除用户

**权限**: 管理员

---

## 学生管理 API

### GET /students

获取学生列表

**权限**: 管理员、教师、班主任

### POST /students

创建学生

**权限**: 管理员

### GET /students/[id]

获取学生详情

### PUT /students/[id]

更新学生

**权限**: 管理员

### DELETE /students/[id]

删除学生

**权限**: 管理员

### POST /students/import

导入学生

**权限**: 管理员

### GET /students/export

导出学生

**权限**: 管理员、教师、班主任

---

## 班级管理 API

### GET /classes

获取班级列表

### POST /classes

创建班级

**权限**: 管理员

### PUT /classes/[id]

更新班级

**权限**: 管理员

### DELETE /classes/[id]

删除班级

**权限**: 管理员

---

## 年级管理 API

### GET /grades

获取年级列表

### POST /grades

创建年级

**权限**: 管理员

---

## 学期管理 API

### GET /semesters

获取学期列表

### POST /semesters

创建学期

**权限**: 管理员

---

## 请假管理 API

### GET /leaves

获取请假记录列表

### POST /leaves

创建请假申请

**权限**: 教师

### POST /leaves/[id]/approve

批准请假

**权限**: 管理员

### POST /leaves/[id]/reject

拒绝请假

**权限**: 管理员

---

## 费用配置 API

### GET /fee-configs

获取费用配置列表

### POST /fee-configs

创建费用配置

**权限**: 管理员

---

## 退费管理 API

### GET /refunds/summary

获取退费汇总

**权限**: 管理员

### GET /refunds/export

导出退费清单

**权限**: 管理员

---

## 备份管理 API

### POST /backup/create

创建备份

**权限**: 管理员

### GET /backup/list

获取备份列表

### POST /backup/restore

恢复备份

**权限**: 管理员

---

## 系统配置 API

### GET /system-config

获取系统配置

**权限**: 管理员

### PUT /system-config

更新系统配置

**权限**: 管理员

---

## 日志查询 API

### GET /operation-logs

获取操作日志

**权限**: 管理员

---

## 仪表盘统计 API

### GET /dashboard/stats/*

管理员仪表盘统计

**权限**: 管理员

### GET /class-teacher/dashboard/stats/*

班主任仪表盘统计

**权限**: 班主任

---

## 错误码

| 状态码 | 错误类型 | 说明 |
|-------|---------|------|
| 200 | OK | 请求成功 |
| 400 | BadRequest | 请求参数错误 |
| 401 | Unauthorized | 未登录或 Session 过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | NotFound | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | UnprocessableEntity | 业务逻辑验证失败 |
| 500 | InternalServerError | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误信息描述"
}
```

或

```json
{
  "success": false,
  "message": "错误信息描述",
  "errors": {
    "field": ["具体错误信息"]
  }
}
```

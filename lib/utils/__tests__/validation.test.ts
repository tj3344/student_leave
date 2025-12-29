import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  userCreateSchema,
  changePasswordSchema,
  studentCreateSchema,
  leaveCreateSchema,
  leaveReviewSchema,
  semesterCreateSchema,
  gradeCreateSchema,
  classCreateSchema,
  paginationSchema
} from '../validation'

describe('Zod 验证模式', () => {
  describe('loginSchema - 登录验证', () => {
    it('应该接受有效的登录数据', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'password123'
      })
      expect(result.success).toBe(true)
    })

    it('应该拒绝空的用户名', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: '123456'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('用户名不能为空')
      }
    })

    it('应该拒绝空的密码', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: ''
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('密码不能为空')
      }
    })
  })

  describe('userCreateSchema - 用户创建验证', () => {
    const validData = {
      username: 'teacher01',
      password: 'pass123',
      real_name: '张老师',
      role: 'teacher' as const
    }

    it('应该接受有效的用户数据', () => {
      const result = userCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该验证用户名长度', () => {
      // 太短
      let result = userCreateSchema.safeParse({
        ...validData,
        username: 'ab'
      })
      expect(result.success).toBe(false)

      // 合法
      result = userCreateSchema.safeParse({
        ...validData,
        username: 'abc'
      })
      expect(result.success).toBe(true)
    })

    it('应该验证密码长度', () => {
      // 太短
      let result = userCreateSchema.safeParse({
        ...validData,
        password: '12345'
      })
      expect(result.success).toBe(false)

      // 合法
      result = userCreateSchema.safeParse({
        ...validData,
        password: '123456'
      })
      expect(result.success).toBe(true)
    })

    it('应该验证角色枚举', () => {
      const validRoles = ['admin', 'teacher', 'class_teacher'] as const

      for (const role of validRoles) {
        const result = userCreateSchema.safeParse({
          ...validData,
          role
        })
        expect(result.success).toBe(true)
      }

      const result = userCreateSchema.safeParse({
        ...validData,
        role: 'invalid'
      })
      expect(result.success).toBe(false)
    })

    it('应该验证手机号格式', () => {
      // 有效手机号
      let result = userCreateSchema.safeParse({
        ...validData,
        phone: '13800138000'
      })
      expect(result.success).toBe(true)

      // 无效手机号 - 不以1开头
      result = userCreateSchema.safeParse({
        ...validData,
        phone: '23456789012'
      })
      expect(result.success).toBe(false)

      // 无效手机号 - 第二位不在3-9之间
      result = userCreateSchema.safeParse({
        ...validData,
        phone: '12012345678'
      })
      expect(result.success).toBe(false)

      // 空字符串应该被接受
      result = userCreateSchema.safeParse({
        ...validData,
        phone: ''
      })
      expect(result.success).toBe(true)
    })

    it('应该验证邮箱格式', () => {
      // 有效邮箱
      let result = userCreateSchema.safeParse({
        ...validData,
        email: 'test@example.com'
      })
      expect(result.success).toBe(true)

      // 无效邮箱
      result = userCreateSchema.safeParse({
        ...validData,
        email: 'invalid-email'
      })
      expect(result.success).toBe(false)

      // 空字符串应该被接受
      result = userCreateSchema.safeParse({
        ...validData,
        email: ''
      })
      expect(result.success).toBe(true)
    })
  })

  describe('changePasswordSchema - 修改密码验证', () => {
    it('应该接受有效的密码修改数据', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      })
      expect(result.success).toBe(true)
    })

    it('应该拒绝不一致的确认密码', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'different'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('两次输入的密码不一致')
      }
    })

    it('应该验证新密码长度', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'oldpass123',
        newPassword: '12345',
        confirmPassword: '12345'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('studentCreateSchema - 学生创建验证', () => {
    const validData = {
      student_no: '2025001',
      name: '张三',
      class_id: 1
    }

    it('应该接受有效的学生数据', () => {
      const result = studentCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该验证必填字段', () => {
      // 空学号
      let result = studentCreateSchema.safeParse({
        ...validData,
        student_no: ''
      })
      expect(result.success).toBe(false)

      // 空姓名
      result = studentCreateSchema.safeParse({
        ...validData,
        name: ''
      })
      expect(result.success).toBe(false)

      // 无效班级ID
      result = studentCreateSchema.safeParse({
        ...validData,
        class_id: 0
      })
      expect(result.success).toBe(false)
    })

    it('应该验证性别枚举', () => {
      // 有效性别
      let result = studentCreateSchema.safeParse({
        ...validData,
        gender: '男'
      })
      expect(result.success).toBe(true)

      result = studentCreateSchema.safeParse({
        ...validData,
        gender: '女'
      })
      expect(result.success).toBe(true)

      // 无效性别
      result = studentCreateSchema.safeParse({
        ...validData,
        gender: '未知'
      })
      expect(result.success).toBe(false)
    })

    it('应该验证家长手机号格式', () => {
      // 有效手机号
      let result = studentCreateSchema.safeParse({
        ...validData,
        parent_phone: '13800138000'
      })
      expect(result.success).toBe(true)

      // 无效手机号
      result = studentCreateSchema.safeParse({
        ...validData,
        parent_phone: '12345678901'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('leaveCreateSchema - 请假创建验证', () => {
    const validData = {
      student_id: 1,
      semester_id: 1,
      start_date: '2025-01-10',
      end_date: '2025-01-15',
      reason: '因病请假'
    }

    it('应该接受有效的请假数据', () => {
      const result = leaveCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该验证日期范围', () => {
      // 有效范围
      let result = leaveCreateSchema.safeParse({
        ...validData,
        end_date: '2025-01-15'
      })
      expect(result.success).toBe(true)

      // 无效范围 - 结束日期早于开始日期
      result = leaveCreateSchema.safeParse({
        ...validData,
        start_date: '2025-01-15',
        end_date: '2025-01-10'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('结束日期必须大于或等于开始日期')
      }
    })

    it('应该验证请假原因长度', () => {
      // 太长
      const longReason = 'a'.repeat(501)
      const result = leaveCreateSchema.safeParse({
        ...validData,
        reason: longReason
      })
      expect(result.success).toBe(false)
    })
  })

  describe('leaveReviewSchema - 请假审核验证', () => {
    it('应该接受有效的审核数据', () => {
      const result = leaveReviewSchema.safeParse({
        status: 'approved',
        review_remark: '同意'
      })
      expect(result.success).toBe(true)
    })

    it('应该验证审核状态', () => {
      // 有效状态
      let result = leaveReviewSchema.safeParse({ status: 'approved' })
      expect(result.success).toBe(true)

      result = leaveReviewSchema.safeParse({ status: 'rejected' })
      expect(result.success).toBe(true)

      // 无效状态
      result = leaveReviewSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('semesterCreateSchema - 学期创建验证', () => {
    const validData = {
      name: '2024-2025学年第二学期',
      start_date: '2025-02-01',
      end_date: '2025-07-15',
      school_days: 120
    }

    it('应该接受有效的学期数据', () => {
      const result = semesterCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该验证学校天数', () => {
      // 天数为0
      let result = semesterCreateSchema.safeParse({
        ...validData,
        school_days: 0
      })
      expect(result.success).toBe(false)

      // 负数
      result = semesterCreateSchema.safeParse({
        ...validData,
        school_days: -10
      })
      expect(result.success).toBe(false)
    })

    it('应该验证日期范围', () => {
      // 结束日期早于开始日期
      const result = semesterCreateSchema.safeParse({
        ...validData,
        start_date: '2025-07-15',
        end_date: '2025-02-01'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('gradeCreateSchema - 年级创建验证', () => {
    it('应该接受有效的年级数据', () => {
      const result = gradeCreateSchema.safeParse({
        name: '一年级',
        sort_order: 1
      })
      expect(result.success).toBe(true)
    })

    it('应该验证必填字段', () => {
      // 空名称
      const result = gradeCreateSchema.safeParse({
        name: ''
      })
      expect(result.success).toBe(false)
    })
  })

  describe('classCreateSchema - 班级创建验证', () => {
    const validData = {
      grade_id: 1,
      name: '1班',
      meal_fee: 1200
    }

    it('应该接受有效的班级数据', () => {
      const result = classCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该验证伙食费', () => {
      // 伙食费为0
      let result = classCreateSchema.safeParse({
        ...validData,
        meal_fee: 0
      })
      expect(result.success).toBe(false)

      // 负数
      result = classCreateSchema.safeParse({
        ...validData,
        meal_fee: -100
      })
      expect(result.success).toBe(false)
    })
  })

  describe('paginationSchema - 分页验证', () => {
    it('应该接受有效的分页参数', () => {
      const result = paginationSchema.safeParse({
        page: 1,
        limit: 20,
        search: '测试',
        sort: 'name',
        order: 'asc'
      })
      expect(result.success).toBe(true)
    })

    it('应该验证limit最大值', () => {
      // 超过100
      const result = paginationSchema.safeParse({
        limit: 101
      })
      expect(result.success).toBe(false)
    })

    it('应该验证order枚举', () => {
      // 有效值
      let result = paginationSchema.safeParse({ order: 'asc' })
      expect(result.success).toBe(true)

      result = paginationSchema.safeParse({ order: 'desc' })
      expect(result.success).toBe(true)

      // 无效值
      result = paginationSchema.safeParse({ order: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('实际场景测试', () => {
    it('场景1：管理员创建用户', () => {
      const result = userCreateSchema.safeParse({
        username: 'admin001',
        password: 'admin123',
        real_name: '系统管理员',
        role: 'admin',
        phone: '13800138000',
        email: 'admin@example.com'
      })
      expect(result.success).toBe(true)
    })

    it('场景2：创建新学生', () => {
      const result = studentCreateSchema.safeParse({
        student_no: '20250101',
        name: '李四',
        gender: '男',
        class_id: 5,
        parent_name: '李爸爸',
        parent_phone: '13900139000',
        is_nutrition_meal: true
      })
      expect(result.success).toBe(true)
    })

    it('场景3：提交请假申请', () => {
      const result = leaveCreateSchema.safeParse({
        student_id: 10,
        semester_id: 1,
        start_date: '2025-01-20',
        end_date: '2025-01-22',
        reason: '学生生病，需要请假三天去医院治疗'
      })
      expect(result.success).toBe(true)
    })

    it('场景4：审核请假申请', () => {
      const result = leaveReviewSchema.safeParse({
        status: 'approved',
        review_remark: '同意请假，注意休息'
      })
      expect(result.success).toBe(true)
    })
  })
})

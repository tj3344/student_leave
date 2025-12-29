import { describe, it, expect } from 'vitest'
import {
  calculateDailyRefund,
  calculateRefundAmount,
  calculateRefund,
  formatCurrency,
  isValidRefundAmount
} from '../refund'

describe('退费计算函数', () => {
  describe('calculateDailyRefund - 每日退费金额计算', () => {
    it('应该正确计算每日退费金额', () => {
      expect(calculateDailyRefund(1000, 100)).toBe(10)
      expect(calculateDailyRefund(1500, 120)).toBe(12.5)
      expect(calculateDailyRefund(500, 50)).toBe(10)
    })

    it('应该处理边界情况', () => {
      // 学校天数为 0
      expect(calculateDailyRefund(1000, 0)).toBe(0)
      // 学校天数为负数
      expect(calculateDailyRefund(1000, -10)).toBe(0)
      // 伙食费为 0
      expect(calculateDailyRefund(0, 100)).toBe(0)
    })

    it('应该返回两位小数', () => {
      const result = calculateDailyRefund(1000, 3)
      expect(result).toBe(333.33)
      expect(result.toString()).toMatch(/^\d+\.\d{2}$/)
    })

    it('应该正确处理小数除法', () => {
      expect(calculateDailyRefund(999.99, 100)).toBe(10)
      expect(calculateDailyRefund(100, 7)).toBe(14.29)
    })
  })

  describe('calculateRefundAmount - 退费金额计算', () => {
    it('应该正确计算退费金额', () => {
      expect(calculateRefundAmount(5, 10)).toBe(50)
      expect(calculateRefundAmount(3, 12.5)).toBe(37.5)
      expect(calculateRefundAmount(1, 15.5)).toBe(15.5)
    })

    it('应该处理0天情况', () => {
      expect(calculateRefundAmount(0, 10)).toBe(0)
      expect(calculateRefundAmount(0, 0)).toBe(0)
    })

    it('应该正确处理小数天数', () => {
      expect(calculateRefundAmount(1.5, 10)).toBe(15)
      expect(calculateRefundAmount(2.5, 12)).toBe(30)
    })
  })

  describe('calculateRefund - 完整退费计算', () => {
    it('普通学生应该计算退费', () => {
      expect(calculateRefund(1000, 100, 5, false)).toBe(50)
      expect(calculateRefund(1500, 120, 3, false)).toBe(37.5)
      expect(calculateRefund(500, 50, 10, false)).toBe(100)
    })

    it('营养餐学生不应退费', () => {
      expect(calculateRefund(1000, 100, 5, true)).toBe(0)
      expect(calculateRefund(1500, 120, 10, true)).toBe(0)
    })

    it('应该处理默认参数', () => {
      expect(calculateRefund(1000, 100, 5)).toBe(50)
      expect(calculateRefund(1000, 100, 5, false)).toBe(50)
    })

    it('应该处理边界情况', () => {
      // 请假天数为 0
      expect(calculateRefund(1000, 100, 0, false)).toBe(0)
      // 学校天数为 0
      expect(calculateRefund(1000, 0, 5, false)).toBe(0)
    })
  })

  describe('formatCurrency - 金额格式化', () => {
    it('应该正确格式化金额', () => {
      expect(formatCurrency(123.45)).toBe('¥123.45')
      expect(formatCurrency(0)).toBe('¥0.00')
      expect(formatCurrency(1000)).toBe('¥1000.00')
    })

    it('应该正确格式化小数', () => {
      expect(formatCurrency(10.5)).toBe('¥10.50')
      expect(formatCurrency(10.123)).toBe('¥10.12')
      expect(formatCurrency(10.999)).toBe('¥11.00')
    })

    it('应该处理大额金额', () => {
      expect(formatCurrency(10000)).toBe('¥10000.00')
      expect(formatCurrency(99999.99)).toBe('¥99999.99')
    })
  })

  describe('isValidRefundAmount - 退费金额验证', () => {
    it('应该验证有效金额', () => {
      expect(isValidRefundAmount(0)).toBe(true)
      expect(isValidRefundAmount(0.01)).toBe(true)
      expect(isValidRefundAmount(100)).toBe(true)
      expect(isValidRefundAmount(999.99)).toBe(true)
    })

    it('应该拒绝无效金额', () => {
      expect(isValidRefundAmount(-1)).toBe(false)
      expect(isValidRefundAmount(-0.01)).toBe(false)
      expect(isValidRefundAmount(-100)).toBe(false)
    })

    it('应该拒绝特殊值', () => {
      expect(isValidRefundAmount(Infinity)).toBe(false)
      expect(isValidRefundAmount(-Infinity)).toBe(false)
      expect(isValidRefundAmount(NaN)).toBe(false)
    })
  })

  describe('实际场景测试', () => {
    it('场景1：普通学生请假5天', () => {
      // 班级伙食费 1200元/学期，学期120天
      // 请假5天，每日10元，退费50元
      const refund = calculateRefund(1200, 120, 5, false)
      expect(refund).toBe(50)
      expect(formatCurrency(refund)).toBe('¥50.00')
    })

    it('场景2：营养餐学生请假不退费', () => {
      const refund = calculateRefund(1200, 120, 5, true)
      expect(refund).toBe(0)
      expect(isValidRefundAmount(refund)).toBe(true)
    })

    it('场景3：学期末请假计算', () => {
      // 班级伙食费 1500元/学期，学期100天，每日15元
      const refund = calculateRefund(1500, 100, 3, false)
      expect(refund).toBe(45)
    })

    it('场景4：非整除情况', () => {
      // 班级伙食费 1000元/学期，学期30天，每日33.33元
      const dailyRefund = calculateDailyRefund(1000, 30)
      expect(dailyRefund).toBe(33.33)

      // 请假7天，退费 233.31 元
      const refund = calculateRefund(1000, 30, 7, false)
      expect(refund).toBe(233.31)
    })
  })
})

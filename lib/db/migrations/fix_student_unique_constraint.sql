-- 修复学生表学号唯一约束
-- 问题：student_no 当前是全局唯一约束，导致同一学号不能在不同学期存在
-- 解决方案：改为 (class_id, student_no) 复合唯一约束

-- 1. 删除旧的 student_no 全局唯一约束
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_no_unique;

-- 2. 添加复合唯一约束 (class_id, student_no)
-- 这确保同一班级内学号唯一，但允许同一学号在不同学期（不同班级）存在
ALTER TABLE students ADD CONSTRAINT students_class_id_student_no_key UNIQUE (class_id, student_no);

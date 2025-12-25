-- ========================================
-- 学生请假管理系统数据备份
-- 备份时间: 2025/12/25 15:59:23
-- ========================================

BEGIN TRANSACTION;

-- 表: users
-- 记录数: 2

INSERT INTO users (id, username, password_hash, real_name, role, phone, email, is_active, created_at, updated_at) VALUES (1, 'admin', '$2b$10$mnxYFqoS7.fMwAr87PBo3OmJ6dZ/DhoD6mK4jDW3rj8145a1hSsQa', '系统管理员', 'admin', NULL, NULL, 1, '2025-12-24 02:51:11', '2025-12-24 02:51:11');
INSERT INTO users (id, username, password_hash, real_name, role, phone, email, is_active, created_at, updated_at) VALUES (2, 'tianjun', '$2b$10$3fCcIENVUzQppcksqLkN7ehi3ImsO7XJlFOPlFB/oKZ5qg5aHPHGS', '田军', 'teacher', '15068853993', '397059750@qq.com', 1, '2025-12-24 03:07:34', '2025-12-24 03:07:34');

-- 表: semesters
-- 记录数: 1

INSERT INTO semesters (id, name, start_date, end_date, school_days, is_current, created_at, updated_at) VALUES (1, '2025学年第一学期', '2025-12-01', '2026-01-10', 100, 1, '2025-12-24 02:53:59', '2025-12-24 02:53:59');

-- 表: grades
-- 记录数: 1

INSERT INTO grades (id, semester_id, name, sort_order, created_at) VALUES (1, 1, '一年级', 0, '2025-12-24 02:54:27');

-- 表: classes
-- 记录数: 2

INSERT INTO classes (id, semester_id, grade_id, name, class_teacher_id, meal_fee, student_count, created_at, updated_at) VALUES (1, 1, 1, '一（1）班', NULL, 8, 2, '2025-12-24 02:55:00', '2025-12-24 02:55:00');
INSERT INTO classes (id, semester_id, grade_id, name, class_teacher_id, meal_fee, student_count, created_at, updated_at) VALUES (2, 1, 1, '一（2）班', 2, 2, 0, '2025-12-24 04:56:40', '2025-12-24 04:56:40');

-- 表: students
-- 记录数: 2

INSERT INTO students (id, student_no, name, gender, class_id, birth_date, parent_name, parent_phone, address, is_nutrition_meal, enrollment_date, is_active, created_at, updated_at) VALUES (1, '20250101', '田军', '男', 1, '2025-12-01', '时发生的费', '15068853993', '阿三大赛的', 1, '2025-12-24', 1, '2025-12-24 03:04:16', '2025-12-24 03:04:16');
INSERT INTO students (id, student_no, name, gender, class_id, birth_date, parent_name, parent_phone, address, is_nutrition_meal, enrollment_date, is_active, created_at, updated_at) VALUES (2, '20250102', '张三', '男', 1, '2025-12-02', NULL, NULL, NULL, 0, '2025-12-28', 1, '2025-12-24 07:46:05', '2025-12-24 07:46:05');

-- 表: leave_records
-- 记录数: 3

INSERT INTO leave_records (id, student_id, semester_id, applicant_id, start_date, end_date, leave_days, reason, status, reviewer_id, review_time, review_remark, is_refund, refund_amount, created_at, updated_at) VALUES (1, 1, 1, 1, '2025-12-02', '2025-12-18', 17, 'sadasd ', 'approved', 1, '2025-12-24 03:31:18', NULL, 0, NULL, '2025-12-24 03:29:37', '2025-12-24 03:31:18');
INSERT INTO leave_records (id, student_id, semester_id, applicant_id, start_date, end_date, leave_days, reason, status, reviewer_id, review_time, review_remark, is_refund, refund_amount, created_at, updated_at) VALUES (2, 1, 1, 1, '2025-12-16', '2026-01-03', 19, 'zczx', 'rejected', 1, '2025-12-24 06:16:57', '营养餐学生不退费', 0, NULL, '2025-12-24 03:58:29', '2025-12-24 06:16:57');
INSERT INTO leave_records (id, student_id, semester_id, applicant_id, start_date, end_date, leave_days, reason, status, reviewer_id, review_time, review_remark, is_refund, refund_amount, created_at, updated_at) VALUES (3, 2, 1, 1, '2025-12-08', '2025-12-18', 11, '萨达反倒是', 'approved', 1, '2025-12-24 07:47:17', NULL, 1, 88, '2025-12-24 07:46:37', '2025-12-24 11:23:15');

-- 表: fee_configs
-- 记录数: 1

INSERT INTO fee_configs (id, class_id, semester_id, meal_fee_standard, prepaid_days, actual_days, suspension_days, created_at, updated_at) VALUES (1, 1, 1, 8, 100, 90, 2, '2025-12-24 07:44:54', '2025-12-24 07:44:54');

-- 表 system_config 无数据

-- 表 operation_logs 无数据

COMMIT;

CREATE TABLE "graduated_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_no" text NOT NULL,
	"name" text NOT NULL,
	"gender" text,
	"parent_name" text,
	"parent_phone" text,
	"address" text,
	"is_nutrition_meal" boolean DEFAULT false NOT NULL,
	"enrollment_date" text,
	"original_student_id" integer NOT NULL,
	"graduation_date" timestamp NOT NULL,
	"original_class_id" integer NOT NULL,
	"original_class_name" text NOT NULL,
	"original_grade_id" integer NOT NULL,
	"original_grade_name" text NOT NULL,
	"original_semester_id" integer NOT NULL,
	"original_semester_name" text NOT NULL,
	"original_class_teacher_id" integer,
	"original_class_teacher_name" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "enrollment_date" text;
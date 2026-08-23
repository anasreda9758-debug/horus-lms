CREATE TABLE "academic_year" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_name" text,
	"old_data" text,
	"new_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculty" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faculty_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" text PRIMARY KEY NOT NULL,
	"faculty_id" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text NOT NULL,
	"duration_years" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "program_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "semester" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"term" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" text PRIMARY KEY NOT NULL,
	"semester_id" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subject_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "university" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "university_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "question_bookmark" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_review" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL,
	"interval" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"next_review" timestamp DEFAULT now() NOT NULL,
	"last_review" timestamp,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"amount_eg" integer NOT NULL,
	"paymob_order_id" text,
	"paymob_payment_key" text,
	"paymob_transaction_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"bank_slug" text NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"created_by" text NOT NULL,
	"winner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "battle_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"option_id" text NOT NULL,
	"is_correct" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"is_ready" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" timestamp,
	"battles_won" integer DEFAULT 0 NOT NULL,
	"battles_lost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "xp_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ospe_answer_key" (
	"id" text PRIMARY KEY NOT NULL,
	"folder" text NOT NULL,
	"file_name" text NOT NULL,
	"diagnosis" text NOT NULL,
	"identification" text,
	"findings" text,
	"differential" text,
	"management" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ospe_exam" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"folder" text,
	"station_count" integer DEFAULT 10 NOT NULL,
	"time_per_station_sec" integer DEFAULT 60 NOT NULL,
	"total_time_limit_sec" integer DEFAULT 600 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"total_score" integer,
	"max_possible_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ospe_exam_station" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"order" integer NOT NULL,
	"folder" text NOT NULL,
	"file_name" text NOT NULL,
	"answer_key_id" text,
	"student_answer" text,
	"score" integer,
	"time_spent_sec" integer,
	"answered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ospe_rubric" (
	"id" text PRIMARY KEY NOT NULL,
	"answer_key_id" text NOT NULL,
	"criterion" text NOT NULL,
	"max_points" integer DEFAULT 1 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "module" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "summary_json" jsonb;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "mindmap_json" jsonb;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "difficulty" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_answer" ADD COLUMN "time_spent_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "time_limit_sec" integer;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "elapsed_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "grace_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester" ADD CONSTRAINT "semester_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_semester_id_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bookmark" ADD CONSTRAINT "question_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bookmark" ADD CONSTRAINT "question_bookmark_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review" ADD CONSTRAINT "question_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review" ADD CONSTRAINT "question_review_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle" ADD CONSTRAINT "battle_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_answer" ADD CONSTRAINT "battle_answer_battle_id_battle_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_answer" ADD CONSTRAINT "battle_answer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_participant" ADD CONSTRAINT "battle_participant_battle_id_battle_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_participant" ADD CONSTRAINT "battle_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_log" ADD CONSTRAINT "xp_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ospe_exam" ADD CONSTRAINT "ospe_exam_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ospe_exam_station" ADD CONSTRAINT "ospe_exam_station_exam_id_ospe_exam_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."ospe_exam"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ospe_exam_station" ADD CONSTRAINT "ospe_exam_station_answer_key_id_ospe_answer_key_id_fk" FOREIGN KEY ("answer_key_id") REFERENCES "public"."ospe_answer_key"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ospe_rubric" ADD CONSTRAINT "ospe_rubric_answer_key_id_ospe_answer_key_id_fk" FOREIGN KEY ("answer_key_id") REFERENCES "public"."ospe_answer_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "question_bookmark_user_question_idx" ON "question_bookmark" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_review_user_question_idx" ON "question_review" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "question_review_next_idx" ON "question_review" USING btree ("user_id","next_review");--> statement-breakpoint
CREATE INDEX "payment_user_idx" ON "payment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "battle_status_idx" ON "battle" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_answer_unique" ON "battle_answer" USING btree ("battle_id","user_id","question_id");--> statement-breakpoint
CREATE INDEX "battle_participant_battle_idx" ON "battle_participant" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "battle_participant_user_idx" ON "battle_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profile_user_id_idx" ON "user_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "xp_log_user_id_idx" ON "xp_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ospe_answer_key_folder_idx" ON "ospe_answer_key" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "ospe_answer_key_lookup_idx" ON "ospe_answer_key" USING btree ("folder","file_name");--> statement-breakpoint
CREATE INDEX "ospe_exam_user_idx" ON "ospe_exam" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ospe_exam_status_idx" ON "ospe_exam" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ospe_exam_station_exam_idx" ON "ospe_exam_station" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "ospe_rubric_key_idx" ON "ospe_rubric" USING btree ("answer_key_id");--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lecture_slug_idx" ON "lecture" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lecture_progress_user_lecture_unique" ON "lecture_progress" USING btree ("user_id","lecture_id");
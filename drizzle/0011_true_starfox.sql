ALTER TABLE "question" ADD COLUMN "lecture_id" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "lecture_id" text;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE set null ON UPDATE no action;
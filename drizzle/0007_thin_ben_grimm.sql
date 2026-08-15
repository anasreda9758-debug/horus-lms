CREATE TABLE "clinical_case" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lecture_id" text NOT NULL,
	"case_text" text NOT NULL,
	"questions_json" text NOT NULL,
	"model_answers_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lecture_id" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_case" ADD CONSTRAINT "clinical_case_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_case" ADD CONSTRAINT "clinical_case_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_case_user_idx" ON "clinical_case" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flashcard_user_due_idx" ON "flashcard" USING btree ("user_id","due_date");
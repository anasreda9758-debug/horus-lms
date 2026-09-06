ALTER TABLE "module" ADD COLUMN IF NOT EXISTS "study_year" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_study_year_idx" ON "module" USING btree ("study_year");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lecture_note" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "lecture_id" text NOT NULL,
  "body" text NOT NULL,
  "highlighted_text" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lecture_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "lecture_note_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lecture_note_user_lecture_idx" ON "lecture_note" USING btree ("user_id", "lecture_id");

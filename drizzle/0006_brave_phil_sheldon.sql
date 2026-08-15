ALTER TABLE "module" ADD COLUMN "term" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "lecture" ADD COLUMN "pdf_file" text;
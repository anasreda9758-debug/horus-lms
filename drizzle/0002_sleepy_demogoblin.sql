CREATE TABLE "lecture" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"order" integer DEFAULT 0 NOT NULL,
	"duration_min" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecture_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lecture_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "lecture" ADD CONSTRAINT "lecture_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_progress" ADD CONSTRAINT "lecture_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_progress" ADD CONSTRAINT "lecture_progress_lecture_id_lecture_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lecture_module_id_idx" ON "lecture" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "lecture_progress_user_lecture_idx" ON "lecture_progress" USING btree ("user_id","lecture_id");
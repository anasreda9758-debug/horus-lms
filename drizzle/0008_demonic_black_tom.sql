ALTER TABLE "plan" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "scope" text DEFAULT 'year' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "scope_ref" text;--> statement-breakpoint
CREATE INDEX "plan_scope_idx" ON "plan" USING btree ("scope","scope_ref");--> statement-breakpoint
CREATE INDEX "subscription_user_plan_active_idx" ON "subscription" USING btree ("user_id","plan_id","status");
ALTER TABLE "proposals" ADD COLUMN "built_transaction_bytes" text NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "signatures" jsonb DEFAULT '{}'::jsonb NOT NULL;
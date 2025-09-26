ALTER TABLE "proposals" ALTER COLUMN "digest" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "proposer_address" text NOT NULL;
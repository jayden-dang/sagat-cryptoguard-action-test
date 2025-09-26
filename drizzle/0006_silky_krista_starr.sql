ALTER TABLE "addresses" ALTER COLUMN "public_key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "multisig_members" ALTER COLUMN "multisig_address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "multisig_members" ALTER COLUMN "public_key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "multisigs" ALTER COLUMN "address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ALTER COLUMN "public_key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "multisig_address" SET DATA TYPE text;
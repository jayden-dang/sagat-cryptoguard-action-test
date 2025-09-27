CREATE TABLE "addresses" (
	"public_key" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	CONSTRAINT "addresses_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "multisig_members" (
	"multisig_address" text NOT NULL,
	"public_key" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_accepted" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multisigs" (
	"address" text PRIMARY KEY NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"threshold" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_signatures" (
	"proposal_id" integer NOT NULL,
	"public_key" text NOT NULL,
	"signature" text NOT NULL,
	CONSTRAINT "proposal_signatures_proposal_id_public_key_pk" PRIMARY KEY("proposal_id","public_key")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"multisig_address" text NOT NULL,
	"digest" text NOT NULL,
	"status" smallint DEFAULT 0 NOT NULL,
	"transaction_bytes" text NOT NULL,
	"built_transaction_bytes" text NOT NULL,
	"proposer_address" text NOT NULL,
	CONSTRAINT "proposals_digest_unique" UNIQUE("digest")
);
--> statement-breakpoint
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_multisig_address_multisigs_address_fk" FOREIGN KEY ("multisig_address") REFERENCES "public"."multisigs"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_public_key_addresses_public_key_fk" FOREIGN KEY ("public_key") REFERENCES "public"."addresses"("public_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_public_key_addresses_public_key_fk" FOREIGN KEY ("public_key") REFERENCES "public"."addresses"("public_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_multisig_address_multisigs_address_fk" FOREIGN KEY ("multisig_address") REFERENCES "public"."multisigs"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "multisig_member_idx" ON "multisig_members" USING btree ("multisig_address","public_key");--> statement-breakpoint
CREATE INDEX "multisig_address_idx" ON "multisigs" USING btree ("address");
CREATE TABLE "addresses" (
	"public_key" varchar(66) PRIMARY KEY NOT NULL,
	"address" varchar(66) NOT NULL,
	CONSTRAINT "addresses_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "multisig_members" (
	"multisig_address" varchar(66) NOT NULL,
	"public_key" varchar(66) NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_accepted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multisigs" (
	"address" varchar(66) PRIMARY KEY NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"multisig_address" varchar(66) NOT NULL,
	"digest" varchar(66) NOT NULL,
	"status" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_multisig_address_multisigs_address_fk" FOREIGN KEY ("multisig_address") REFERENCES "public"."multisigs"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_public_key_addresses_public_key_fk" FOREIGN KEY ("public_key") REFERENCES "public"."addresses"("public_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_multisig_address_multisigs_address_fk" FOREIGN KEY ("multisig_address") REFERENCES "public"."multisigs"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "multisig_member_idx" ON "multisig_members" USING btree ("multisig_address","public_key");--> statement-breakpoint
CREATE INDEX "multisig_address_idx" ON "multisigs" USING btree ("address");
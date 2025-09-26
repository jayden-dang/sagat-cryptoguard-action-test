CREATE TABLE "proposal_signatures" (
	"proposal_id" integer NOT NULL,
	"public_key" varchar(66) NOT NULL,
	"signature" text NOT NULL,
	CONSTRAINT "proposal_signatures_proposal_id_public_key_pk" PRIMARY KEY("proposal_id","public_key")
);
--> statement-breakpoint
ALTER TABLE "multisigs" ADD COLUMN "threshold" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_public_key_addresses_public_key_fk" FOREIGN KEY ("public_key") REFERENCES "public"."addresses"("public_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "signatures";
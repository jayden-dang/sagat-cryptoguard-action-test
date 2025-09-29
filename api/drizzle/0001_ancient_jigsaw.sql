DROP INDEX "addr_network_idx";--> statement-breakpoint
CREATE INDEX "multisig_member_multisig_address_idx" ON "multisig_members" USING btree ("multisig_address");--> statement-breakpoint
CREATE INDEX "multisig_member_public_key_idx" ON "multisig_members" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "proposals_addr_network_idx" ON "proposals" USING btree ("multisig_address","network");--> statement-breakpoint
CREATE INDEX "proposals_multisig_address_idx" ON "proposals" USING btree ("multisig_address");
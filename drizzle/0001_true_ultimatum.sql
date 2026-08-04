CREATE TABLE "payment_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "payment_group_id" integer;--> statement-breakpoint
ALTER TABLE "payment_groups" ADD CONSTRAINT "payment_groups_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_payment_group_id_payment_groups_id_fk" FOREIGN KEY ("payment_group_id") REFERENCES "public"."payment_groups"("id") ON DELETE set null ON UPDATE no action;
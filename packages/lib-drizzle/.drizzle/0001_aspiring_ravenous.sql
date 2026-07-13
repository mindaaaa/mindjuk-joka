CREATE TABLE "joka"."user_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"album_id" integer NOT NULL,
	"event" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" integer NOT NULL,
	CONSTRAINT "user_events_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
ALTER TABLE "joka"."user_events" ADD CONSTRAINT "user_events_album_id_fk" FOREIGN KEY ("album_id") REFERENCES "joka"."albums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joka"."user_events" ADD CONSTRAINT "user_events_created_by_fk" FOREIGN KEY ("created_by_id") REFERENCES "joka"."users"("id") ON DELETE no action ON UPDATE no action;
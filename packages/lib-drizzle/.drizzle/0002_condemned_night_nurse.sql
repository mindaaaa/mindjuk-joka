CREATE TABLE "joka"."media_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" integer NOT NULL,
	CONSTRAINT "media_favorites_uq_1" UNIQUE("media_id","created_by_id")
);
--> statement-breakpoint
ALTER TABLE "joka"."media_favorites" ADD CONSTRAINT "media_favorites_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "joka"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joka"."media_favorites" ADD CONSTRAINT "media_favorites_created_by_fk" FOREIGN KEY ("created_by_id") REFERENCES "joka"."users"("id") ON DELETE cascade ON UPDATE no action;
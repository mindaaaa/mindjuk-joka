CREATE SCHEMA "joka";
--> statement-breakpoint
CREATE TABLE "joka"."contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"media_id" integer NOT NULL,
	"url" varchar(1024) NOT NULL,
	"size" integer NOT NULL,
	"eTag" varchar(100) NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	CONSTRAINT "contents_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "joka"."media" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"state" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "joka"."tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1024),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "joka"."thumbnails" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"content_id" integer NOT NULL,
	"url" varchar(1024) NOT NULL,
	"size" integer NOT NULL,
	"eTag" varchar(100) NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	"blurhash" varchar(100) NOT NULL,
	CONSTRAINT "thumbnails_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "joka"."user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'VIEWER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_uq_1" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "joka"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"cid" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"provider" varchar(20) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
ALTER TABLE "joka"."contents" ADD CONSTRAINT "contents_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "joka"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joka"."thumbnails" ADD CONSTRAINT "thumbnails_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "joka"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joka"."user_roles" ADD CONSTRAINT "user_roles_fk_1" FOREIGN KEY ("user_id") REFERENCES "joka"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joka"."user_roles" ADD CONSTRAINT "user_roles_fk_2" FOREIGN KEY ("tenant_id") REFERENCES "joka"."tenants"("id") ON DELETE cascade ON UPDATE no action;
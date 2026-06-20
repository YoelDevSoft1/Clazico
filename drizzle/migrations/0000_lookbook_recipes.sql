ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "lookbook_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "lookbook_slug" varchar(300);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "lookbook_title" varchar(300);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lookbook_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lookbook_id" uuid NOT NULL,
  "product_cache_id" uuid NOT NULL,
  "variant_id" uuid,
  "role" varchar(100) DEFAULT 'piece' NOT NULL,
  "label" varchar(200),
  "is_required" boolean DEFAULT true NOT NULL,
  "min_quantity" integer DEFAULT 1 NOT NULL,
  "max_quantity" integer DEFAULT 1 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "lookbook_item_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "lookbook_role" varchar(100);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lookbook_items_lookbook_id_lookbooks_id_fk'
  ) THEN
    ALTER TABLE "lookbook_items"
      ADD CONSTRAINT "lookbook_items_lookbook_id_lookbooks_id_fk"
      FOREIGN KEY ("lookbook_id") REFERENCES "public"."lookbooks"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lookbook_items_product_cache_id_product_cache_id_fk'
  ) THEN
    ALTER TABLE "lookbook_items"
      ADD CONSTRAINT "lookbook_items_product_cache_id_product_cache_id_fk"
      FOREIGN KEY ("product_cache_id") REFERENCES "public"."product_cache"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lookbook_items_variant_id_product_variants_id_fk'
  ) THEN
    ALTER TABLE "lookbook_items"
      ADD CONSTRAINT "lookbook_items_variant_id_product_variants_id_fk"
      FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_lookbook_id_lookbooks_id_fk'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_lookbook_id_lookbooks_id_fk"
      FOREIGN KEY ("lookbook_id") REFERENCES "public"."lookbooks"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_lookbook_item_id_lookbook_items_id_fk'
  ) THEN
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_lookbook_item_id_lookbook_items_id_fk"
      FOREIGN KEY ("lookbook_item_id") REFERENCES "public"."lookbook_items"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lookbook_items_lookbook_id_idx" ON "lookbook_items" USING btree ("lookbook_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lookbook_items_product_cache_id_idx" ON "lookbook_items" USING btree ("product_cache_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lookbook_items_variant_id_idx" ON "lookbook_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lookbook_items_sort_order_idx" ON "lookbook_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_lookbook_id_idx" ON "orders" USING btree ("lookbook_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_lookbook_slug_idx" ON "orders" USING btree ("lookbook_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_lookbook_item_id_idx" ON "order_items" USING btree ("lookbook_item_id");

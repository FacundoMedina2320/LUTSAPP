# Admin system rollout (LUT marketplace)

## Step 1: Final database schema SQL

Use the migration in `supabase/migrations/202503050001_admin_schema.sql` as the final schema for the LUT marketplace, including `luts`, `categories`, `lut_categories`, downloads, reviews, entitlements, purchases, subscriptions, and user library. The schema adds `tags`, file hashes/sizes, and `cube_path` for premium delivery. 【F:supabase/migrations/202503050001_admin_schema.sql†L1-L166】

## Step 2: RLS policies (admin locked by user ID)

RLS policies are included in the migration. Replace the placeholder UUID inside `public.is_admin()` with your real Supabase user ID before applying. Only the admin user can insert/update/delete LUTs and categories. Public reads are allowed for `luts`, `categories`, and `reviews`. 【F:supabase/migrations/202503050001_admin_schema.sql†L93-L166】

## Step 3: Storage policies

The same migration creates the `luts` bucket (private), allows public read only for `images/*`, and restricts all writes to the admin user ID via the `luts_admin_write` policy. Premium `.cube` files remain private and must be accessed via signed URLs. 【F:supabase/migrations/202503050001_admin_schema.sql†L168-L182】

## Step 4: Expo admin screen (admin-only)

The admin upload screen lives at `/admin` and checks `EXPO_PUBLIC_ADMIN_USER_ID`. Normal users are redirected away, with no visible navigation or buttons. It supports single and batch uploads with slug generation, category slug input, tags, premium/price fields, and uploads to structured storage paths:

- `cube/{slug}/{slug}.cube`
- `images/{slug}/before.jpg`
- `images/{slug}/after.jpg`

It upserts `luts` and refreshes `lut_categories`. 【F:app/admin/index.tsx†L1-L382】

## Step 5: Node bulk import script

Run `npm run bulk-import-luts -- import` to bulk import from:

```
import/
  LUT_NAME/
    lut.cube
    before.jpg
    after.jpg
    meta.json
```

The script validates files, generates slugs, computes SHA-256 hashes, uploads to storage, upserts LUT rows, skips duplicates by hash, and prints a report. It expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars. 【F:scripts/bulk-import-luts.mjs†L1-L221】【F:package.json†L5-L15】

## Step 6: Edge function for signed URLs

Use the `signed-lut-url` Edge Function to issue signed URLs for `.cube` files after entitlement/subscription checks. It requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be set. 【F:supabase/functions/signed-lut-url/index.ts†L1-L86】

## Manual Supabase configuration checklist

1. Set the real admin user ID in:
   - `public.is_admin()` function (SQL migration). 【F:supabase/migrations/202503050001_admin_schema.sql†L93-L99】
   - `ADMIN_USER_ID` Edge Function environment variable for `admin-upload-lut` (if used). 【F:supabase/functions/admin-upload-lut/index.ts†L31-L57】
   - `EXPO_PUBLIC_ADMIN_USER_ID` in Expo env for the admin screen. 【F:constants/admin.ts†L1-L3】
2. Apply the migration in Supabase SQL editor.
3. Ensure the `luts` storage bucket exists and is private (created by migration). 【F:supabase/migrations/202503050001_admin_schema.sql†L168-L182】
4. Deploy Edge Functions: `download-lut`, `signed-lut-url`, and `admin-upload-lut` (optional).


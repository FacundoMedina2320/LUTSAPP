import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMPORT_ROOT = process.argv[2] ?? "import";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const readJson = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

const hashFile = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return { hash, size: buffer.length, buffer };
};

const uploadBuffer = async (bucket, storagePath, buffer, contentType) => {
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
};

const buildPublicUrl = (bucket, storagePath) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
};

const report = {
  processed: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

const categoriesCache = new Map();

const loadCategories = async () => {
  const { data, error } = await supabase.from("categories").select("id,slug");
  if (error) throw error;
  data?.forEach((row) => categoriesCache.set(row.slug, row.id));
};

const resolveCategoryIds = (slugs = []) =>
  slugs.map((slug) => categoriesCache.get(slug)).filter(Boolean);

const getFolders = async (root) => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name));
};

const ensureFile = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const processFolder = async (folderPath) => {
  report.processed += 1;
  const folderName = path.basename(folderPath);
  const meta = (await readJson(path.join(folderPath, "meta.json"))) ?? {};

  const name = meta.name ?? folderName;
  const slug = slugify(meta.slug ?? name);
  if (!slug) {
    report.errors += 1;
    console.error(`[${folderName}] Invalid slug.`);
    return;
  }

  const cubePath = path.join(folderPath, "lut.cube");
  if (!(await ensureFile(cubePath))) {
    report.errors += 1;
    console.error(`[${folderName}] Missing lut.cube`);
    return;
  }

  const beforePath = path.join(folderPath, "before.jpg");
  const afterPath = path.join(folderPath, "after.jpg");
  const hasBefore = await ensureFile(beforePath);
  const hasAfter = await ensureFile(afterPath);

  const cube = await hashFile(cubePath);

  const { data: existing } = await supabase
    .from("luts")
    .select("id,slug,cube_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.cube_hash && existing.cube_hash === cube.hash) {
    report.skipped += 1;
    console.log(`[${folderName}] Skipped (duplicate hash).`);
    return;
  }

  const cubeStoragePath = `cube/${slug}/${slug}.cube`;
  await uploadBuffer("luts", cubeStoragePath, cube.buffer, "application/octet-stream");

  let beforeUrl = null;
  let beforeHash = null;
  let beforeSize = null;
  if (hasBefore) {
    const before = await hashFile(beforePath);
    const beforeStoragePath = `images/${slug}/before.jpg`;
    await uploadBuffer("luts", beforeStoragePath, before.buffer, "image/jpeg");
    beforeUrl = buildPublicUrl("luts", beforeStoragePath);
    beforeHash = before.hash;
    beforeSize = before.size;
  }

  let afterUrl = null;
  let afterHash = null;
  let afterSize = null;
  if (hasAfter) {
    const after = await hashFile(afterPath);
    const afterStoragePath = `images/${slug}/after.jpg`;
    await uploadBuffer("luts", afterStoragePath, after.buffer, "image/jpeg");
    afterUrl = buildPublicUrl("luts", afterStoragePath);
    afterHash = after.hash;
    afterSize = after.size;
  }

  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const categorySlugs = Array.isArray(meta.categories) ? meta.categories : [];
  const categoryIds = resolveCategoryIds(categorySlugs);

  const payload = {
    name,
    slug,
    description: meta.description ?? null,
    is_premium: Boolean(meta.is_premium),
    price_cents: Number(meta.price_cents ?? 0),
    currency: meta.currency ?? "USD",
    before_url: beforeUrl,
    after_url: afterUrl,
    cube_path: cubeStoragePath,
    cube_hash: cube.hash,
    cube_size: cube.size,
    before_hash: beforeHash,
    before_size: beforeSize,
    after_hash: afterHash,
    after_size: afterSize,
    tags,
    category_id: categoryIds[0] ?? null,
  };

  const { data: upserted, error } = await supabase
    .from("luts")
    .upsert(payload, { onConflict: "slug" })
    .select("id")
    .single();

  if (error || !upserted?.id) {
    report.errors += 1;
    console.error(`[${folderName}] Upsert failed:`, error?.message ?? "Unknown error");
    return;
  }

  if (categoryIds.length > 0) {
    await supabase.from("lut_categories").delete().eq("lut_id", upserted.id);
    await supabase.from("lut_categories").insert(
      categoryIds.map((categoryId) => ({ lut_id: upserted.id, category_id: categoryId }))
    );
  }

  if (existing?.id) {
    report.updated += 1;
  } else {
    report.created += 1;
  }

  console.log(`[${folderName}] Imported ${slug}`);
};

const run = async () => {
  try {
    await loadCategories();
    const folders = await getFolders(IMPORT_ROOT);
    for (const folder of folders) {
      await processFolder(folder);
    }

    console.log("\nImport report:");
    console.table(report);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
};

run();

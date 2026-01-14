import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const getString = (form: FormData, key: string) =>
  typeof form.get(key) === "string" ? String(form.get(key)) : "";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const getFileExt = (filename: string) => {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts.pop()}` : "";
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminUserId = Deno.env.get("ADMIN_USER_ID");

    if (!supabaseUrl || !supabaseServiceKey || !adminUserId) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (userData.user.id !== adminUserId) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse({ error: "Expected multipart/form-data" }, 400);
    }

    const form = await req.formData();
    const name = getString(form, "name");
    const slug = getString(form, "slug");
    const description = getString(form, "description");
    const categoryIds = getString(form, "category_ids");
    const currency = getString(form, "currency") || "USD";
    const tags = getString(form, "tags");
    const isPremium = getString(form, "is_premium") === "true";
    const priceCents = Number(getString(form, "price_cents") || "0");
    const cubeFile = form.get("cube_file");
    const beforeFile = form.get("before_file");
    const afterFile = form.get("after_file");

    const safeSlug = slugify(slug || name);
    if (!name || !safeSlug) {
      return jsonResponse({ error: "name and slug required" }, 400);
    }

    if (!Number.isFinite(priceCents) || priceCents < 0) {
      return jsonResponse({ error: "price_cents invalid" }, 400);
    }

    if (!(cubeFile instanceof File)) {
      return jsonResponse({ error: "cube_file required" }, 400);
    }

    const fileExt = cubeFile.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "cube") {
      return jsonResponse({ error: "Only .cube files allowed" }, 400);
    }

    const storagePath = `cube/${safeSlug}/${safeSlug}${getFileExt(cubeFile.name) || ".cube"}`;
    const { error: uploadError } = await supabase.storage
      .from("luts")
      .upload(storagePath, cubeFile, {
        contentType: "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse({ error: "Upload failed", details: uploadError.message }, 500);
    }

    let beforeUrl: string | null = null;
    if (beforeFile instanceof File) {
      const beforePath = `images/${safeSlug}/before${getFileExt(beforeFile.name) || ".jpg"}`;
      const { error: beforeError } = await supabase.storage
        .from("luts")
        .upload(beforePath, beforeFile, {
          contentType: beforeFile.type || "image/jpeg",
          upsert: true,
        });
      if (beforeError) {
        return jsonResponse({ error: "Before upload failed", details: beforeError.message }, 500);
      }
      beforeUrl = supabase.storage.from("luts").getPublicUrl(beforePath).data.publicUrl;
    }

    let afterUrl: string | null = null;
    if (afterFile instanceof File) {
      const afterPath = `images/${safeSlug}/after${getFileExt(afterFile.name) || ".jpg"}`;
      const { error: afterError } = await supabase.storage
        .from("luts")
        .upload(afterPath, afterFile, {
          contentType: afterFile.type || "image/jpeg",
          upsert: true,
        });
      if (afterError) {
        return jsonResponse({ error: "After upload failed", details: afterError.message }, 500);
      }
      afterUrl = supabase.storage.from("luts").getPublicUrl(afterPath).data.publicUrl;
    }

    const { data: lut, error: lutError } = await supabase
      .from("luts")
      .insert({
        name,
        slug: safeSlug,
        description: description || null,
        category_id: categoryIds?.split(",")[0] || null,
        is_premium: isPremium,
        price_cents: priceCents,
        currency,
        before_url: beforeUrl,
        after_url: afterUrl,
        cube_path: storagePath,
        tags: tags ? tags.split(",").map((value) => value.trim()).filter(Boolean) : [],
      })
      .select("id, name, slug, is_premium, price_cents, currency, cube_path")
      .single();

    if (lutError) {
      await supabase.storage.from("luts").remove([storagePath]);
      return jsonResponse({ error: "Insert failed", details: lutError.message }, 500);
    }

    if (categoryIds) {
      const ids = categoryIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        await supabase
          .from("lut_categories")
          .insert(ids.map((id) => ({ lut_id: lut.id, category_id: id })));
      }
    }

    return jsonResponse({ lut }, 201);
  } catch (_error) {
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});

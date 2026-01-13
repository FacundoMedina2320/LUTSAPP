import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://fzbfuihutlhxnyhndvkf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YmZ1aWh1dGxoeG55aG5kdmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzUwNDMsImV4cCI6MjA4MzgxMTA0M30.Vjp-uaNQc-kZFDo9zKojg5MZ0pL6_HY32iVrFbNX4H8"
);

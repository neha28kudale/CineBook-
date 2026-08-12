import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export function SetupBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          <strong className="font-semibold text-amber-50">Supabase not connected.</strong> Copy{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">.env.example</code> to{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">.env</code> and add your
          Supabase URL and keys, then restart{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">npm run dev</code>. If this
          project is on Lovable, connect Supabase in the Lovable Cloud panel instead.
        </p>
      </div>
    </div>
  );
}

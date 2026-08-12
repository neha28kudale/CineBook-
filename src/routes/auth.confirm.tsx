import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clapperboard, Loader2, Ticket, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "Email confirmed — CineBook" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthConfirmPage,
});

type Status = "loading" | "success" | "error";

export function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function confirmEmail() {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = query.get("code");
        const errorDescription =
          query.get("error_description") ?? hash.get("error_description") ?? hash.get("error");

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          session = (await supabase.auth.getSession()).data.session;
        }

        const confirmedViaHash =
          hash.get("type") === "signup" ||
          hash.get("type") === "email" ||
          Boolean(hash.get("access_token"));

        if (!session && !confirmedViaHash && !code) {
          throw new Error("This confirmation link is invalid or has expired.");
        }

        if (!cancelled) {
          setHasSession(!!session);
          setStatus("success");
          setMessage(
            session
              ? "Your email is confirmed and you're signed in. Start browsing movies!"
              : "Your email is confirmed. Sign in with your password to start booking.",
          );
          window.history.replaceState({}, document.title, "/auth/confirm");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof Error ? err.message : "This confirmation link is invalid or expired.",
          );
        }
      }
    }

    void confirmEmail();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <Clapperboard className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="font-display text-4xl tracking-widest text-foreground">
            CINE<span className="text-primary">BOOK</span>
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          {status === "loading" && (
            <div className="space-y-3">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Confirming your email…</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle2 className="mx-auto h-14 w-14 text-seat-available" />
              <h2 className="text-xl font-semibold text-card-foreground">Email confirmed!</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 pt-2">
                {hasSession ? (
                  <Button className="w-full" onClick={() => navigate({ to: "/" })}>
                    <Ticket className="mr-2 h-4 w-4" /> Browse movies
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => navigate({ to: "/auth", search: {} })}>
                    Sign in
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h2 className="text-xl font-semibold text-card-foreground">Confirmation failed</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full" onClick={() => navigate({ to: "/auth", search: {} })}>
                  Go to sign in
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AuthConfirmPage } from "./auth.confirm";

/** Handles legacy/alternate Supabase redirect paths with the same confirm UI. */
export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Email confirmed — CineBook" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthConfirmPage,
});

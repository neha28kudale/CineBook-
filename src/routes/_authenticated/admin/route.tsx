import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, Film, LayoutDashboard, Loader2, MonitorPlay, Popcorn, Vote } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Reports", icon: LayoutDashboard, exact: true },
  { to: "/admin/movies", label: "Movies", icon: Film },
  { to: "/admin/theatres", label: "Theatres & Seats", icon: Clapperboard },
  { to: "/admin/shows", label: "Shows", icon: MonitorPlay },
  { to: "/admin/food", label: "Food Menu", icon: Popcorn },
  { to: "/admin/polls", label: "Movie Polls", icon: Vote },
];

function AdminLayout() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  useEffect(() => {
    if (isAdmin === undefined) return;
    setAllowed(isAdmin);
    setChecked(true);
    if (!isAdmin) {
      navigate({ to: "/" });
    }
  }, [isAdmin, navigate]);

  if (!checked) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="w-52 shrink-0">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Admin console
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

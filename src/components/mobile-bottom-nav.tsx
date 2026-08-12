import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, Home, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/theatres", label: "Theatres", icon: Building2, exact: false },
  { to: "/community", label: "Community", icon: Users, exact: false },
  { to: "/bookings", label: "Bookings", icon: Ticket, exact: false },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideOn = ["/auth", "/book/", "/admin", "/theatre"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {LINKS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

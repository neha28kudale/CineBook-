import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Clapperboard, LogOut, Ticket, LayoutDashboard, UserRound, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["admin", "theatre_admin"]);
      return (data?.length ?? 0) > 0;
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {}, replace: true });
  }

  const navLink = (to: string, label: string) => (
    <Link
      key={to}
      to={to}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        pathname === to ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <Clapperboard className="h-6 w-6 shrink-0 text-primary" />
          <span className="font-display truncate text-xl tracking-widest text-foreground sm:text-2xl">
            CINE<span className="text-primary">BOOK</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLink("/", "Home")}
          {navLink("/community", "Communities")}
          {user && navLink("/bookings", "My Bookings")}
          {user && isAdmin && navLink("/admin", "Admin")}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-8 flex flex-col gap-5">
                <SheetClose asChild>
                  <Link to="/" className="text-sm font-medium text-foreground">
                    Home
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/community" className="text-sm font-medium text-foreground">
                    Communities
                  </Link>
                </SheetClose>
                {user && (
                  <SheetClose asChild>
                    <Link to="/bookings" className="text-sm font-medium text-foreground">
                      My Bookings
                    </Link>
                  </SheetClose>
                )}
                {user && isAdmin && (
                  <SheetClose asChild>
                    <Link to="/admin" className="text-sm font-medium text-foreground">
                      Admin
                    </Link>
                  </SheetClose>
                )}
                {!user && (
                  <SheetClose asChild>
                    <Link to="/auth" className="text-sm font-medium text-primary">
                      Sign in
                    </Link>
                  </SheetClose>
                )}
                {user && (
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-2 text-left text-sm font-medium text-foreground"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserRound className="h-4 w-4" />
                  <span className="hidden max-w-32 truncate sm:inline">
                    {user.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate({ to: "/bookings" })}>
                  <Ticket className="mr-2 h-4 w-4" /> My Bookings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate({ to: "/auth", search: {} })}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
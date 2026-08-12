import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndianRupee, Popcorn, Ticket, Users, MapPin } from "lucide-react";
import { theatreDashboard } from "@/lib/admin.functions";
import { updateTheatreMedia } from "@/lib/theatre-admin.functions";
import { TheatreMediaEditor } from "@/components/theatre-media-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/theatre/")({
  head: () => ({
    meta: [
      { title: "Theatre Dashboard — CineBook" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TheatreDashboardPage,
});

function TheatreDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getDashboard = useServerFn(theatreDashboard);
  const [hasError, setHasError] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["theatre-dashboard"],
    queryFn: async () => {
      try {
        const result = await getDashboard();
        return result;
      } catch (err) {
        setHasError(true);
        throw err;
      }
    },
  });

  useEffect(() => {
    if (hasError) {
      navigate({ to: "/" });
    }
  }, [hasError, navigate]);

  if (hasError || error) {
    return null; // Redirect in effect
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { theatre, reports, scope } = data;

  // KPI cards
  const kpis = [
    { label: "Total revenue", value: inr(reports.totalRevenue), icon: IndianRupee },
    { label: "Bookings", value: String(reports.totalBookings), icon: Ticket },
    { label: "Tickets sold", value: String(reports.totalTickets), icon: Users },
    { label: "F&B revenue", value: inr(reports.foodRevenue), icon: Popcorn },
  ];

  return (
    <div className="space-y-8">
      {/* Theatre Info Header */}
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-wider text-foreground">
              {theatre?.name ?? "Theatre Dashboard"}
            </h1>
            {theatre?.address && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {theatre.address}
                  {theatre.city && `, ${theatre.city}`}
                </span>
              </div>
            )}
          </div>
          <div className="text-right text-xs uppercase tracking-widest text-muted-foreground">
            {scope.role === "theatre_admin" && "Theatre Manager"}
          </div>
        </div>
      </div>

      {theatre && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 font-display text-xl tracking-wider text-card-foreground">
            Map &amp; virtual tour
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Set your theatre location and YouTube tour video. Customers see these on the public
            theatre page, movie showtimes, and booking flow.
          </p>
          <TheatreMediaEditor
            key={theatre.id}
            theatre={theatre}
            busy={mediaBusy}
            onSave={async (values) => {
              setMediaBusy(true);
              try {
                await updateTheatreMedia({
                  data: {
                    id: theatre.id,
                    address: values.address,
                    latitude: values.latitude,
                    longitude: values.longitude,
                    image_url: values.image_url,
                    video_url: values.video_url,
                  },
                });
                toast.success("Map & virtual tour updated.");
                queryClient.invalidateQueries({ queryKey: ["theatre-dashboard"] });
                queryClient.invalidateQueries({ queryKey: ["theatres"] });
                queryClient.invalidateQueries({ queryKey: ["theatre", theatre.id] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to save.");
                throw err;
              } finally {
                setMediaBusy(false);
              }
            }}
          />
        </section>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
              <k.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                {k.label}
              </span>
            </div>
            <p className="font-display mt-2 truncate text-xl text-card-foreground sm:text-3xl">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Daily revenue</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={reports.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.7 0.02 260)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.7 0.02 260)" />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.19 0.02 260)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [inr(Number(v)), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.75 0.18 55)" fill="oklch(0.75 0.18 55 / 25%)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Revenue by movie</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reports.movieStats.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.7 0.02 260)" />
              <YAxis
                type="category"
                dataKey="title"
                width={100}
                tick={{ fontSize: 10 }}
                stroke="oklch(0.7 0.02 260)"
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.19 0.02 260)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [inr(Number(v)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="oklch(0.75 0.18 55)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Occupancy List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-card-foreground">Occupancy by show</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {reports.occupancy.length > 0 ? (
            reports.occupancy.map((show) => (
              <div key={show.label} className="flex items-center justify-between rounded bg-background/40 px-3 py-2">
                <span className="truncate text-xs text-muted-foreground sm:text-sm">{show.label}</span>
                <div className="ml-4 flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-muted sm:w-32">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${show.pct}%` }}
                    />
                  </div>
                  <span className="font-display w-12 text-right text-sm text-card-foreground">
                    {show.pct}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">No occupancy data</p>
          )}
        </div>
      </div>

      {/* Food Stats */}
      {reports.foodStats.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Top F&B items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reports.foodStats.slice(0, 10).map((item) => (
                  <tr key={item.name} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-3 py-2 text-card-foreground">{item.name}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.qty}</td>
                    <td className="px-3 py-2 text-right font-display text-card-foreground">{inr(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

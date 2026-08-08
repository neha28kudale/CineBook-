import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { IndianRupee, Popcorn, Ticket, Users } from "lucide-react";
import { adminReports } from "@/lib/admin.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Reports — CineBook Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => adminReports(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const kpis = [
    { label: "Total revenue", value: inr(data.totalRevenue), icon: IndianRupee },
    { label: "Bookings", value: String(data.totalBookings), icon: Ticket },
    { label: "Tickets sold", value: String(data.totalTickets), icon: Users },
    { label: "F&B revenue", value: inr(data.foodRevenue), icon: Popcorn },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-wider text-foreground">Reports</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wide">{k.label}</span>
            </div>
            <p className="mt-2 font-display text-3xl text-card-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Daily revenue</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.dailyRevenue}>
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
            <BarChart data={data.movieStats.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.7 0.02 260)" />
              <YAxis
                type="category"
                dataKey="title"
                width={110}
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
              <Bar dataKey="revenue" fill="oklch(0.75 0.18 55)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Show occupancy</h2>
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {data.occupancy.slice(0, 15).map((o, i) => (
              <div key={i}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">{o.label}</span>
                  <span className="font-semibold text-card-foreground">
                    {o.booked}/{o.total} · {o.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, o.pct)}%` }}
                  />
                </div>
              </div>
            ))}
            {data.occupancy.length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-card-foreground">Top food items</h2>
          <div className="space-y-2">
            {data.foodStats.slice(0, 8).map((f) => (
              <div key={f.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {f.name} <span className="text-xs">× {f.qty}</span>
                </span>
                <span className="font-semibold text-card-foreground">{inr(f.revenue)}</span>
              </div>
            ))}
            {data.foodStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No food orders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listTheatresAdmin,
  listTheatreAdmins,
  assignTheatreAdmin,
  removeTheatreAdmin,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/theatre-access")({
  head: () => ({
    meta: [
      { title: "Theatre Access — CineBook Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TheatreAccessPage,
});

function TheatreAccessPage() {
  const getTheatres = useServerFn(listTheatresAdmin);
  const getAdmins = useServerFn(listTheatreAdmins);
  const assignAdmin = useServerFn(assignTheatreAdmin);
  const removeAdmin = useServerFn(removeTheatreAdmin);

  const [email, setEmail] = useState("");
  const [theatreId, setTheatreId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const { data: theatres, isLoading: theatresLoading } = useQuery({
    queryKey: ["theatres-admin"],
    queryFn: () => getTheatres(),
  });

  const { data: admins, isLoading: adminsLoading, refetch: refetchAdmins } = useQuery({
    queryKey: ["theatre-admins"],
    queryFn: () => getAdmins(),
  });

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !theatreId) {
      toast.error("Please fill in all fields");
      return;
    }

    setAssigning(true);
    try {
      await assignAdmin({ email, theatreId });
      toast.success(`Assigned ${email} as theatre manager`);
      setEmail("");
      setTheatreId("");
      await refetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this theatre manager assignment?")) return;

    try {
      await removeAdmin({ id });
      toast.success("Theatre manager removed");
      await refetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Removal failed");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-wider text-foreground">Theatre Access</h1>

      {/* Assignment Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Assign a theatre manager</h2>

        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@example.com"
                disabled={assigning}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="theatre">Theatre</Label>
              <Select value={theatreId} onValueChange={setTheatreId} disabled={assigning || theatresLoading}>
                <SelectTrigger id="theatre">
                  <SelectValue placeholder="Select a theatre" />
                </SelectTrigger>
                <SelectContent>
                  {theatres?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={assigning || !email || !theatreId}>
            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {assigning ? "Assigning..." : "Assign manager"}
          </Button>
        </form>
      </div>

      {/* Current Assignments */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Current theatre managers</h2>

        {adminsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
          </div>
        ) : admins && admins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Theatre</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-4 py-3 text-card-foreground">{admin.email}</td>
                    <td className="px-4 py-3 text-card-foreground">
                      {admin.theatre?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(admin.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">No theatre managers assigned yet</p>
        )}
      </div>
    </div>
  );
}

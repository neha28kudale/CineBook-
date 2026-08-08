import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listFoodItems } from "@/lib/movies.functions";
import { deleteFoodItem, upsertFoodItem } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inr } from "@/lib/pricing";
import type { z } from "zod";
import type { foodItemInput } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/admin/food")({
  head: () => ({
    meta: [
      { title: "Food Menu — CineBook Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFoodPage,
});

type FoodForm = z.infer<typeof foodItemInput>;

const EMPTY: FoodForm = {
  name: "",
  category: "Combos",
  price: 199,
  image_url: "",
  is_veg: true,
  is_available: true,
};

const CATEGORIES = ["Combos", "Popcorn", "Beverages", "Snacks"];

function AdminFoodPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-food"],
    queryFn: () => listFoodItems({ data: { includeUnavailable: true } }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-food"] });
    queryClient.invalidateQueries({ queryKey: ["food-items"] });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertFoodItem({ data: form });
      toast.success(form.id ? "Item updated." : "Item added.");
      setOpen(false);
      setForm(EMPTY);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this food item?")) return;
    try {
      await deleteFoodItem({ data: { id } });
      toast.success("Item deleted.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-foreground">Food Menu</h1>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add item
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell className="text-right">{inr(f.price)}</TableCell>
                  <TableCell>{f.is_veg ? "Veg" : "Non-veg"}</TableCell>
                  <TableCell>
                    <Badge variant={f.is_available ? "default" : "secondary"}>
                      {f.is_available ? "Available" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setForm({ ...EMPTY, ...f });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fname">Name</Label>
              <Input
                id="fname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fprice">Price (₹)</Label>
                <Input
                  id="fprice"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fimg">Image URL</Label>
              <Input
                id="fimg"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="/images/food/example.jpg"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fveg">Vegetarian</Label>
              <Switch
                id="fveg"
                checked={form.is_veg}
                onCheckedChange={(v) => setForm({ ...form, is_veg: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="favail">Available for pre-order</Label>
              <Switch
                id="favail"
                checked={form.is_available}
                onCheckedChange={(v) => setForm({ ...form, is_available: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Save item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMemo } from "react";
import { Minus, Plus, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
};

const CATEGORY_ORDER = ["combo", "popcorn", "beverage", "snack"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  combo: "Combos",
  popcorn: "Popcorn",
  beverage: "Beverages",
  snack: "Snacks",
};

function normalizeCategory(category: string): string {
  const c = category.trim().toLowerCase();
  if (c.startsWith("combo")) return "combo";
  if (c.startsWith("popcorn")) return "popcorn";
  if (c.startsWith("beverage") || c.startsWith("drink")) return "beverage";
  if (c.startsWith("snack")) return "snack";
  return c || "snack";
}

export function FoodMenu({
  items,
  quantities,
  onChange,
}: {
  items: FoodItem[];
  quantities: Record<string, number>;
  onChange: (id: string, quantity: number) => void;
}) {
  const suggestion = useMemo(() => {
    const selected = items.filter((i) => (quantities[i.id] ?? 0) > 0);
    const hasPopcorn = selected.some((i) => normalizeCategory(i.category) === "popcorn");
    const hasBeverage = selected.some((i) => normalizeCategory(i.category) === "beverage");
    if (hasPopcorn === hasBeverage) return null;
    const missing = hasPopcorn ? "beverage" : "popcorn";
    const picks = items.filter(
      (i) =>
        normalizeCategory(i.category) === missing &&
        i.is_available &&
        !(quantities[i.id] ?? 0),
    );
    if (!picks.length) return null;
    return { missing, picks: picks.slice(0, 3) };
  }, [items, quantities]);

  const grouped = useMemo(() => {
    const byCat = new Map<string, FoodItem[]>();
    for (const item of items) {
      const cat = normalizeCategory(item.category);
      const list = byCat.get(cat) ?? [];
      list.push(item);
      byCat.set(cat, list);
    }
    return [...byCat.entries()]
      .sort(
        ([a], [b]) =>
          (CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]) === -1
            ? CATEGORY_ORDER.length
            : CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number])) -
          (CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]) === -1
            ? CATEGORY_ORDER.length
            : CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number])),
      )
      .map(([cat, catItems]) => ({ cat, items: catItems }));
  }, [items]);

  return (
    <div className="space-y-8">
      {suggestion && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Complete your combo — add a {suggestion.missing}?
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestion.picks.map((pick) => (
              <Button
                key={pick.id}
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => onChange(pick.id, 1)}
              >
                <Plus className="mr-1 h-3 w-3" />
                {pick.name} · {inr(pick.price)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.cat} className="space-y-3">
          <h3 className="font-display text-xl tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[group.cat] ??
              `${group.cat.charAt(0).toUpperCase()}${group.cat.slice(1)}`}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((item) => {
              const qty = quantities[item.id] ?? 0;
              const unavailable = !item.is_available;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-card transition-colors",
                    qty > 0 ? "border-primary/60 shadow-marquee" : "border-border",
                    unavailable && "opacity-50",
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className={cn("h-full w-full object-cover", unavailable && "grayscale")}
                    />
                    {item.is_veg && (
                      <span className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-sm border border-seat-available bg-background/80">
                        <Leaf className="h-2.5 w-2.5 text-seat-available" />
                      </span>
                    )}
                    {unavailable && (
                      <Badge className="absolute right-2 top-2 bg-seat-booked/80 text-white">
                        Sold out
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div>
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm font-bold text-primary">{inr(item.price)}</p>
                    </div>
                    {!unavailable &&
                      (qty === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => onChange(item.id, 1)}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between rounded-md border border-primary/40">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary"
                            onClick={() => onChange(item.id, qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-bold text-primary">{qty}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary"
                            onClick={() => onChange(item.id, Math.min(10, qty + 1))}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

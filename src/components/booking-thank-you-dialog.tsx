import { CheckCircle2, Popcorn, QrCode, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inr } from "@/lib/pricing";

type BookingThankYouDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movieTitle: string;
  theatreName: string;
  showDate: string;
  showTime: string;
  seatLabels: string[];
  totalAmount: number;
  foodCount: number;
  onViewTicket: () => void;
  onBookAnother: () => void;
};

export function BookingThankYouDialog({
  open,
  onOpenChange,
  movieTitle,
  theatreName,
  showDate,
  showTime,
  seatLabels,
  totalAmount,
  foodCount,
  onViewTicket,
  onBookAnother,
}: BookingThankYouDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-seat-available/15 animate-in zoom-in duration-500">
            <CheckCircle2 className="h-10 w-10 text-seat-available" />
          </div>
          <DialogTitle className="font-display text-3xl tracking-wider">
            Thank you for booking!
          </DialogTitle>
          <DialogDescription className="text-sm">
            Your tickets are confirmed. Show your QR code at the entrance — no print needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-card-foreground">{movieTitle}</p>
          <p className="text-muted-foreground">
            {theatreName} · {showDate} · {showTime}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <Ticket className="h-3 w-3" />
              {seatLabels.join(", ")}
            </span>
            {foodCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <Popcorn className="h-3 w-3" />
                {foodCount} snack{foodCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="flex items-center justify-between border-t border-border pt-3 font-semibold">
            <span>Total paid</span>
            <span className="text-primary">{inr(totalAmount)}</span>
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={onViewTicket}
          >
            <QrCode className="mr-2 h-4 w-4" /> View digital ticket
          </Button>
          <Button variant="outline" className="w-full" onClick={onBookAnother}>
            Book another show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

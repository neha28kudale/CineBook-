import { useState } from "react";
import { CreditCard, Smartphone, Building2, Wallet, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/pricing";

export type PaymentMethod = "card" | "upi" | "netbanking" | "wallet";

export function PaymentDialog({
  open,
  onOpenChange,
  amount,
  processing,
  onPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  processing: boolean;
  onPay: (method: PaymentMethod, simulateFailure: boolean) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [simulateFailure, setSimulateFailure] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wider">
            Payment · {inr(amount)}
          </DialogTitle>
          <DialogDescription>
            Test mode — no real money is charged. Pick a method and pay.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="card" className="text-xs">
              <CreditCard className="mr-1 h-3.5 w-3.5" /> Card
            </TabsTrigger>
            <TabsTrigger value="upi" className="text-xs">
              <Smartphone className="mr-1 h-3.5 w-3.5" /> UPI
            </TabsTrigger>
            <TabsTrigger value="netbanking" className="text-xs">
              <Building2 className="mr-1 h-3.5 w-3.5" /> Bank
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">
              <Wallet className="mr-1 h-3.5 w-3.5" /> Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label htmlFor="cc-num">Card number</Label>
              <Input id="cc-num" defaultValue="4111 1111 1111 1111" inputMode="numeric" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cc-exp">Expiry</Label>
                <Input id="cc-exp" defaultValue="12/28" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cc-cvv">CVV</Label>
                <Input id="cc-cvv" type="password" defaultValue="123" maxLength={4} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upi" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input id="upi-id" defaultValue="moviebuff@okhdfc" />
            </div>
            <p className="text-xs text-muted-foreground">
              A collect request will be sent to your UPI app (simulated).
            </p>
          </TabsContent>

          <TabsContent value="netbanking" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Select bank</Label>
              <Select defaultValue="hdfc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hdfc">HDFC Bank</SelectItem>
                  <SelectItem value="sbi">State Bank of India</SelectItem>
                  <SelectItem value="icici">ICICI Bank</SelectItem>
                  <SelectItem value="axis">Axis Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Select wallet</Label>
              <Select defaultValue="paytm">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paytm">Paytm Wallet</SelectItem>
                  <SelectItem value="phonepe">PhonePe Wallet</SelectItem>
                  <SelectItem value="amazonpay">Amazon Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Label htmlFor="sim-fail" className="text-xs text-muted-foreground">
            Simulate payment failure
          </Label>
          <Switch
            id="sim-fail"
            checked={simulateFailure}
            onCheckedChange={setSimulateFailure}
            disabled={processing}
          />
        </div>

        <Button
          className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          disabled={processing}
          onClick={() => onPay(method, simulateFailure)}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
            </>
          ) : (
            <>Pay {inr(amount)}</>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> 256-bit encrypted · PCI-DSS compliant (simulated)
        </p>
      </DialogContent>
    </Dialog>
  );
}

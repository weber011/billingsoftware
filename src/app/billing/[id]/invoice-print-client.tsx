"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { recordPayment } from "@/actions/billing";
import { Invoice } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, CreditCard, Receipt, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InvoicePrintClient({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [thermalOpen, setThermalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(invoice.balanceDue.toString());
  const [payMethod, setPayMethod] = useState<"UPI" | "CASH" | "CARD" | "BANK_TRANSFER">("UPI");
  const [txnRef, setTxnRef] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePrintA4 = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await recordPayment({
        invoiceId: invoice.id,
        amount: amt,
        paymentMethod: payMethod,
        transactionRef: txnRef || undefined,
      });

      if (res.success && res.payment) {
        toast.success(`Payment of ${formatCurrency(amt)} recorded!`);
        setPaymentOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {invoice.balanceDue > 0 && (
        <Button
          size="sm"
          onClick={() => setPaymentOpen(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs gap-1.5 shadow-sm"
        >
          <CreditCard className="h-4 w-4" /> Record Payment
        </Button>
      )}

      <Button size="sm" variant="outline" onClick={() => setThermalOpen(true)} className="text-xs gap-1.5">
        <Receipt className="h-4 w-4" /> Thermal Slip
      </Button>

      <Button size="sm" onClick={handlePrintA4} className="bg-slate-900 text-white text-xs gap-1.5 shadow-sm">
        <Printer className="h-4 w-4" /> Print A4 Invoice
      </Button>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for {invoice.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Outstanding balance:{" "}
              <span className="font-bold font-mono text-amber-700">
                {formatCurrency(invoice.balanceDue)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="payAmount">Payment Amount (₹)</Label>
              <Input
                id="payAmount"
                type="number"
                max={invoice.balanceDue}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payMethod">Payment Channel</Label>
              <select
                id="payMethod"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
              >
                <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txnRef">Transaction Reference / UTR (Optional)</Label>
              <Input
                id="txnRef"
                placeholder="e.g. UPI Ref / Bank Txn ID"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-700 text-white font-medium">
                {loading ? "Recording..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Thermal POS Receipt Modal */}
      <Dialog open={thermalOpen} onOpenChange={setThermalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-sm">Thermal Slip Preview (80mm)</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-slate-50 border rounded font-mono text-[11px] text-slate-800 space-y-2">
            <div className="text-center border-b pb-2">
              <p className="font-bold text-sm">LENSART EYEWEAR</p>
              <p className="text-[10px]">Shop 12, Trinity Galleria, Mumbai</p>
              <p className="text-[10px]">GSTIN: 27AABCL1234F1Z8</p>
              <p className="text-[10px]">Ph: +91 98200 12345</p>
            </div>

            <div className="border-b pb-2 text-[10px]">
              <p>INV: {invoice.invoiceNumber}</p>
              <p>DATE: {formatDate(invoice.invoiceDate)}</p>
              <p>PATIENT: {invoice.customerName}</p>
              {invoice.customerPhone && <p>TEL: {invoice.customerPhone}</p>}
            </div>

            <div className="space-y-1 border-b pb-2 text-[10px]">
              {invoice.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate max-w-[180px]">
                    {it.quantity}x {it.description}
                  </span>
                  <span>{formatCurrency(it.totalAmount)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right text-[10px]">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax:</span>
                <span>{formatCurrency(invoice.totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t">
                <span>TOTAL:</span>
                <span>{formatCurrency(invoice.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>PAID:</span>
                <span>{formatCurrency(invoice.amountPaid)}</span>
              </div>
              {invoice.balanceDue > 0 && (
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>BALANCE DUE:</span>
                  <span>{formatCurrency(invoice.balanceDue)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 border-t text-[9px] text-slate-500">
              <p>Thank you for choosing LensArt!</p>
              <p>Goods once sold subject to warranty terms.</p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => window.print()} className="w-full bg-slate-900 text-white">
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Thermal Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

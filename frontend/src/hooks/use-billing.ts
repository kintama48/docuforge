"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/src/lib/api";

type CheckoutResponse = { checkout_url: string };

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (payload: { plan: "dev" | "starter" | "pro" }) =>
      api.post<CheckoutResponse>("/v1/billing/checkout", payload),
    onSuccess: (data) => {
      if (typeof window !== "undefined") {
        window.location.href = data.checkout_url;
      }
    },
  });
}

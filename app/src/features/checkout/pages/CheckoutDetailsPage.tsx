import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/form/FormField";
import { detailsSchema, type DetailsFormValues } from "../schemas/detailsSchema";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";
import { useProfile } from "@/features/account/hooks/useAccount";
import { CheckoutSummary } from "../components/CheckoutSummary";

/** Screen 6 — Checkout: Details (F-011, F-012). */
export function CheckoutDetailsPage() {
  const navigate = useNavigate();
  const setDetails = useCheckoutDraftStore((s) => s.setDetails);
  const draft = useCheckoutDraftStore((s) => s.details);
  const customerToken = useCustomerSessionStore((s) => s.token);
  const customerUser = useCustomerSessionStore((s) => s.user);
  const profileQuery = useProfile(!!customerToken && !draft);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: draft
      ? {
          fullName: draft.fullName,
          email: draft.email,
          phone: draft.phone,
          fulfillmentMethod: draft.fulfillmentMethod,
          addressLine1: draft.address?.line1 ?? "",
          addressLine2: draft.address?.line2 ?? "",
          addressCity: draft.address?.city ?? "",
          addressPostalCode: draft.address?.postalCode ?? "",
        }
      : { fulfillmentMethod: "pickup" },
  });

  useEffect(() => {
    if (!draft && profileQuery.data) {
      setValue("fullName", profileQuery.data.name);
      setValue("email", profileQuery.data.email);
      if (profileQuery.data.phone) setValue("phone", profileQuery.data.phone);
    }
  }, [profileQuery.data, draft, setValue]);

  const fulfillmentMethod = watch("fulfillmentMethod");

  function onSubmit(values: DetailsFormValues) {
    setDetails({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      fulfillmentMethod: values.fulfillmentMethod,
      address:
        values.fulfillmentMethod === "delivery"
          ? {
              line1: values.addressLine1 || "",
              line2: values.addressLine2 || null,
              city: values.addressCity || "",
              postalCode: values.addressPostalCode || "",
            }
          : null,
    });
    navigate("/checkout/payment");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Checkout — Your Details</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField id="fullName" label="Full name" required error={errors.fullName?.message}>
            <Input {...register("fullName")} />
          </FormField>
          <FormField id="email" label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField id="phone" label="Phone" required error={errors.phone?.message} description="8–15 digits, optional leading +">
            <Input type="tel" {...register("phone")} />
          </FormField>

          <div className="space-y-2">
            <Label>Fulfillment method</Label>
            <RadioGroup
              value={fulfillmentMethod}
              onValueChange={(v) => setValue("fulfillmentMethod", v as DetailsFormValues["fulfillmentMethod"])}
            >
              {[
                { value: "pickup", label: "Pickup" },
                { value: "dine-in", label: "Dine-in" },
                { value: "delivery", label: "Delivery" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`fm-${opt.value}`} />
                  <Label htmlFor={`fm-${opt.value}`} className="font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {fulfillmentMethod === "delivery" && (
            <div className="space-y-4 rounded-md border p-4">
              <FormField id="addressLine1" label="Address line 1" required error={errors.addressLine1?.message}>
                <Input {...register("addressLine1")} />
              </FormField>
              <FormField id="addressLine2" label="Address line 2" error={errors.addressLine2?.message}>
                <Input {...register("addressLine2")} />
              </FormField>
              <FormField id="addressCity" label="City" required error={errors.addressCity?.message}>
                <Input {...register("addressCity")} />
              </FormField>
              <FormField id="addressPostalCode" label="Postal code" required error={errors.addressPostalCode?.message}>
                <Input {...register("addressPostalCode")} />
              </FormField>
            </div>
          )}

          {!customerToken && (
            <p className="text-sm text-muted-foreground">
              Checking out as a guest.{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => navigate("/register?returnTo=/checkout/details")}
              >
                Create an account
              </button>{" "}
              to save your details.
            </p>
          )}
          {customerUser && <p className="text-sm text-muted-foreground">Signed in as {customerUser.email}</p>}

          <Button type="submit" size="lg" className="w-full">
            Continue to Payment
          </Button>
        </form>
      </div>
      <CheckoutSummary />
    </div>
  );
}

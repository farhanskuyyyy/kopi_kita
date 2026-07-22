import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { staffLoginSchema, type StaffLoginFormValues } from "../schemas/authForms.schemas";
import { useLoginStaff } from "../hooks/useAuth";
import { ApiError } from "@/lib/api/ApiError";

/** Screen 17 — Admin Login (F-029, D7): shared staff auth entry, role-based redirect. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/admin";
  const loginStaff = useLoginStaff();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginFormValues>({ resolver: zodResolver(staffLoginSchema) });

  function onSubmit(values: StaffLoginFormValues) {
    setFormError(null);
    loginStaff.mutate(values, {
      onSuccess: () => navigate(returnTo, { replace: true }),
      onError: (err) => {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Staff Login</h1>
        <p className="text-sm text-muted-foreground">Catalog Admin & Fulfillment Staff shared entry point.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="username" label="Username" required error={errors.username?.message}>
          <Input autoComplete="username" {...register("username")} />
        </FormField>
        <FormField id="password" label="Password" required error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </FormField>

        {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}

        <Button type="submit" className="w-full" isLoading={loginStaff.isPending}>
          Log in
        </Button>
      </form>
    </div>
  );
}

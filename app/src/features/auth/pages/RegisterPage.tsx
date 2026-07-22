import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { registerSchema, type RegisterFormValues } from "../schemas/authForms.schemas";
import { useRegisterCustomer } from "../hooks/useAuth";
import { ApiError } from "@/lib/api/ApiError";

/** Screen 12 — Register (F-018). */
export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/account";
  const registerCustomer = useRegisterCustomer();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    registerCustomer.mutate(values, {
      onSuccess: () => navigate(returnTo, { replace: true }),
      onError: (err) => {
        if (err instanceof ApiError && err.code === "EMAIL_EXISTS") {
          setError("email", { message: "An account with this email already exists." });
          return;
        }
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Create an account</h1>
        <p className="text-sm text-muted-foreground">Join Kopi Kita to track orders and save favorites.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="name" label="Name" required error={errors.name?.message}>
          <Input autoComplete="name" {...register("name")} />
        </FormField>
        <FormField id="email" label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField id="password" label="Password" required error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" required error={errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
        </FormField>

        {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}

        <Button type="submit" className="w-full" isLoading={registerCustomer.isPending}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

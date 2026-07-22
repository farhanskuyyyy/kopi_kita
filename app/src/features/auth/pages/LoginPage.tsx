import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/form/FormField";
import { loginSchema, type LoginFormValues } from "../schemas/authForms.schemas";
import { useLoginCustomer } from "../hooks/useAuth";
import { ApiError } from "@/lib/api/ApiError";
import { useState } from "react";

/** Screen 11 — Login (F-019). */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/account";
  const login = useLoginCustomer();
  const [formError, setFormError] = useState<string | null>(null);

  const [rememberMe, setRememberMe] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginFormValues) {
    setFormError(null);
    login.mutate(
      { ...values, rememberMe },
      {
        onSuccess: () => navigate(returnTo, { replace: true }),
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Log in</h1>
        <p className="text-sm text-muted-foreground">Welcome back to Kopi Kita.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="email" label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField id="password" label="Password" required error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </FormField>
        <div className="flex items-center gap-2">
          <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
          <Label htmlFor="rememberMe" className="font-normal">
            Remember me
          </Label>
        </div>

        {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}

        <Button type="submit" className="w-full" isLoading={login.isPending}>
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

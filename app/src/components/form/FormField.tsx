import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared RHF + Zod field wrapper (Frontend-Architecture §6): binds label/error/description
 * consistently via aria-describedby so every form doesn't hand-roll accessibility wiring.
 * Field-level errors render inline (spec §3.10), never toast-only.
 */
export function FormField({ id, label, error, description, required, className, children }: FormFieldProps) {
  const descId = description ? `${id}-description` : undefined;
  const errId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-describedby": [descId, errId].filter(Boolean).join(" ") || undefined,
            "aria-invalid": !!error || undefined,
          })
        : children}
      {description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

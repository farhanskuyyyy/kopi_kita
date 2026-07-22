/**
 * Thin wrapper around sonner's imperative API — spec §3.6: success/info auto-dismiss ~4s,
 * error/warning persist ~8s. Feature code calls this, never `sonner` directly, so timing
 * can't drift per call-site.
 */
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) => sonnerToast.success(message, { description, duration: 4000 }),
  info: (message: string, description?: string) => sonnerToast.info(message, { description, duration: 4000 }),
  error: (message: string, description?: string) => sonnerToast.error(message, { description, duration: 8000 }),
  warning: (message: string, description?: string) => sonnerToast.warning(message, { description, duration: 8000 }),
};

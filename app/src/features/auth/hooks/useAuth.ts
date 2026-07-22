import { useMutation } from "@tanstack/react-query";
import { loginCustomer, loginStaff, logout, registerCustomer } from "../api/authApi";
import { useCustomerSessionStore } from "../store/customerSessionStore";
import { useStaffSessionStore } from "../store/staffSessionStore";

export function useRegisterCustomer() {
  const setSession = useCustomerSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: registerCustomer,
    onSuccess: (result) => setSession(result.sessionToken, result.user),
  });
}

export function useLoginCustomer() {
  const setSession = useCustomerSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: loginCustomer,
    onSuccess: (result) => setSession(result.sessionToken, result.user),
  });
}

export function useLoginStaff() {
  const setSession = useStaffSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: loginStaff,
    onSuccess: (result) => setSession(result.sessionToken, result.staffUser),
  });
}

export function useLogoutCustomer() {
  const clear = useCustomerSessionStore((s) => s.clear);
  return useMutation({
    mutationFn: () => logout("customer"),
    meta: { authDomain: "customer" },
    onSettled: () => clear(),
  });
}

export function useLogoutStaff() {
  const clear = useStaffSessionStore((s) => s.clear);
  return useMutation({
    mutationFn: () => logout("staff"),
    meta: { authDomain: "staff" },
    onSettled: () => clear(),
  });
}

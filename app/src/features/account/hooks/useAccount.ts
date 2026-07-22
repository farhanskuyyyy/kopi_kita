import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFavorite, getProfile, listFavorites, listMyOrders, removeFavorite, reorder, updateProfile } from "../api/accountApi";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";

export const accountKeys = {
  profile: ["account", "profile"] as const,
  orders: (status: string) => ["account", "orders", status] as const,
  favorites: ["account", "favorites"] as const,
};

export function useProfile(enabled = true) {
  return useQuery({ queryKey: accountKeys.profile, queryFn: getProfile, enabled, meta: { authDomain: "customer" } });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useCustomerSessionStore((s) => s.updateUser);
  return useMutation({
    mutationFn: updateProfile,
    meta: { authDomain: "customer" },
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(accountKeys.profile, user);
    },
  });
}

export function useMyOrders(status: "all" | "active" | "completed" = "all") {
  return useQuery({ queryKey: accountKeys.orders(status), queryFn: () => listMyOrders({ status }), meta: { authDomain: "customer" } });
}

export function useReorder() {
  return useMutation({ mutationFn: reorder, meta: { authDomain: "customer" } });
}

export function useFavorites() {
  return useQuery({ queryKey: accountKeys.favorites, queryFn: listFavorites, meta: { authDomain: "customer" } });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addFavorite,
    meta: { authDomain: "customer" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.favorites }),
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFavorite,
    meta: { authDomain: "customer" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.favorites }),
  });
}

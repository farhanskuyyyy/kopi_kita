import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useProfile, useUpdateProfile } from "../hooks/useAccount";
import { useLogoutCustomer } from "@/features/auth/hooks/useAuth";
import { formatDate } from "@/lib/format/date";
import { toast } from "@/lib/toast";

/** Screen 13 — Account Home. */
export function AccountHomePage() {
  const navigate = useNavigate();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const logout = useLogoutCustomer();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name);
      setPhone(profileQuery.data.phone ?? "");
    }
  }, [profileQuery.data]);

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <ErrorBanner message="Couldn't load your profile." onRetry={() => profileQuery.refetch()} />;
  }

  const profile = profileQuery.data;

  function handleSave() {
    updateProfile.mutate(
      { name, phone },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          setEditing(false);
        },
        onError: () => toast.error("Couldn't update profile."),
      },
    );
  }

  function handleLogout() {
    // QA Defect #3: navigate away from the guarded /account route *before* the session
    // clears. Waiting for the mutation to settle (then clearing + navigating) let
    // RequireCustomerAuth's reactive redirect — which fires the instant `token` goes
    // null while still mounted on /account — win the race and land on
    // `/login?returnTo=%2Faccount` instead of `/` per spec. `useLogoutCustomer` already
    // clears the session in its own `onSettled`; navigating first means that guard is
    // long unmounted (we're on `/`) by the time the token actually clears.
    navigate("/", { replace: true });
    logout.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Account</h1>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          {editing ? (
            <>
              <FormField id="name" label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField id="phone" label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormField>
              <div className="flex gap-2">
                <Button onClick={handleSave} isLoading={updateProfile.isPending}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="font-medium">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
              <p className="text-xs text-muted-foreground">Member since {formatDate(profile.memberSince)}</p>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

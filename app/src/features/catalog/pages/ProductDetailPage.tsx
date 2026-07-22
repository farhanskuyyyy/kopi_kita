import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Coffee, Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useProduct } from "../hooks/useCatalog";
import { NotFoundError } from "@/lib/api/ApiError";
import { formatIDR } from "@/lib/format/currency";
import { computeUnitPrice, summarizeSelection } from "@/features/cart/lib/pricing";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";
import { useAddFavorite } from "@/features/account/hooks/useAccount";
import { toast } from "@/lib/toast";

/** Screen 4 — Product Detail (F-002, F-006, F-027). */
export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const productQuery = useProduct(productId);
  const addLine = useCartStore((s) => s.addLine);
  const customerToken = useCustomerSessionStore((s) => s.token);
  const addFavorite = useAddFavorite();

  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const product = productQuery.data;

  const selectedOptionIds = useMemo(() => Object.values(selectedByGroup).flat(), [selectedByGroup]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return computeUnitPrice(product.basePrice, product.customizationGroups, selectedOptionIds);
  }, [product, selectedOptionIds]);

  if (productQuery.isError && productQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (productQuery.isLoading) {
    return <DetailSkeleton />;
  }

  if (productQuery.isError || !product) {
    return <ErrorBanner message="Couldn't load this product." onRetry={() => productQuery.refetch()} />;
  }

  function selectSingle(groupId: string, optionId: string) {
    setSelectedByGroup((prev) => ({ ...prev, [groupId]: [optionId] }));
    setValidationError(null);
  }

  function toggleMulti(groupId: string, optionId: string) {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  }

  function handleAddToCart() {
    const missingRequired = product!.customizationGroups.find(
      (g) => g.required && (selectedByGroup[g.id] ?? []).length === 0,
    );
    if (missingRequired) {
      setValidationError(`Please select a ${missingRequired.name.toLowerCase()}.`);
      return;
    }
    addLine({
      productId: product!.id,
      name: product!.name,
      image: product!.image,
      customizationSummary: summarizeSelection(product!.customizationGroups, selectedOptionIds),
      selectedOptionIds,
      unitPrice,
      quantity,
    });
    toast.success("Added to cart", `${product!.name} × ${quantity}`);
  }

  function handleFavorite() {
    if (!customerToken) {
      navigate(`/login?returnTo=${encodeURIComponent(`/product/${product!.id}`)}`);
      return;
    }
    addFavorite.mutate(product!.id, {
      onSuccess: () => toast.success("Added to favorites"),
      onError: () => toast.error("Couldn't add to favorites."),
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Coffee className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Button variant="outline" size="icon" aria-label="Add to favorites" onClick={handleFavorite}>
              <Heart className="h-5 w-5" />
            </Button>
          </div>
          {!product.available && <Badge variant="secondary" className="mt-2">Out of stock</Badge>}
          <p className="mt-2 text-xl font-semibold text-primary">{formatIDR(unitPrice)}</p>
          <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>
        </div>

        {product.customizationGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <Label className="text-base">
              {group.name}
              {group.required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            {group.type === "single" ? (
              <RadioGroup value={(selectedByGroup[group.id] ?? [])[0] ?? ""} onValueChange={(v) => selectSingle(group.id, v)}>
                {group.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.id} id={`${group.id}-${opt.id}`} />
                    <Label htmlFor={`${group.id}-${opt.id}`} className="font-normal">
                      {opt.label} {opt.priceDelta > 0 && `(+${formatIDR(opt.priceDelta)})`}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {group.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`${group.id}-${opt.id}`}
                      checked={(selectedByGroup[group.id] ?? []).includes(opt.id)}
                      onCheckedChange={() => toggleMulti(group.id, opt.id)}
                    />
                    <Label htmlFor={`${group.id}-${opt.id}`} className="font-normal">
                      {opt.label} {opt.priceDelta > 0 && `(+${formatIDR(opt.priceDelta)})`}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {validationError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {validationError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Label className="text-base">Quantity</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center">{quantity}</span>
            <Button variant="outline" size="icon" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={!product.available} onClick={handleAddToCart}>
          {product.available ? `Add to Cart — ${formatIDR(unitPrice * quantity)}` : "Out of stock"}
        </Button>
      </div>
    </div>
  );
}

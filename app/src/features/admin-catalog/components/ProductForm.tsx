import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form/FormField";
import { CustomizationGroupsEditor } from "./CustomizationGroupsEditor";
import { productFormSchema, type ProductFormValues } from "../schemas/productSchema";
import { useAdminCategories } from "../hooks/useAdminCategories";
import { toast } from "@/lib/toast";
import type { Category } from "@/features/catalog/schemas/catalog.schemas";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues> & { image?: string | null };
  onSubmit: (values: ProductFormValues & { image: string | null }) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function ProductForm({ defaultValues, onSubmit, isSubmitting, submitLabel }: ProductFormProps) {
  const categoriesQuery = useAdminCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(defaultValues?.image ?? null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      price: defaultValues?.price ?? 0,
      description: defaultValues?.description ?? "",
      available: defaultValues?.available ?? true,
      customizationGroups: defaultValues?.customizationGroups ?? [],
    },
  });

  const categoryId = watch("categoryId");
  const available = watch("available");
  const customizationGroups = watch("customizationGroups");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  const categories: Category[] = categoriesQuery.data ?? [];

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, image }))} className="max-w-2xl space-y-5" noValidate>
      <FormField id="name" label="Name" required error={errors.name?.message}>
        <Input {...register("name")} />
      </FormField>

      {categories.length === 0 && !categoriesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">
          No categories yet.{" "}
          <a href="/admin/categories/new" className="font-medium text-primary underline-offset-4 hover:underline">
            Create a category first
          </a>
          .
        </p>
      ) : (
        <FormField id="categoryId" label="Category" required error={errors.categoryId?.message}>
          <Select value={categoryId} onValueChange={(v) => setValue("categoryId", v)}>
            <SelectTrigger id="categoryId">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <FormField id="price" label="Price (IDR)" required error={errors.price?.message}>
        <Input type="number" min={1} step={1} {...register("price")} />
      </FormField>

      <FormField id="description" label="Description" required error={errors.description?.message}>
        <Textarea rows={4} {...register("description")} />
      </FormField>

      <div className="space-y-1.5">
        <Label htmlFor="image">Image</Label>
        <input ref={fileInputRef} id="image" type="file" accept="image/png,image/jpeg" onChange={handleImageChange} />
        {image && <img src={image} alt="Preview" className="mt-2 h-24 w-24 rounded-md object-cover" />}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox checked={available} onCheckedChange={(checked) => setValue("available", checked === true)} id="available" />
        <Label htmlFor="available" className="font-normal">
          Available
        </Label>
      </div>

      <CustomizationGroupsEditor
        control={control}
        register={register}
        errors={errors}
        watchGroups={customizationGroups}
        setValue={setValue}
      />

      <Button type="submit" isLoading={isSubmitting} disabled={categories.length === 0 && !categoriesQuery.isLoading}>
        {submitLabel}
      </Button>
    </form>
  );
}

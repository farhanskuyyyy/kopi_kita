import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProductFormValues } from "../schemas/productSchema";

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

interface GroupEditorProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  groupIndex: number;
  onRemoveGroup: () => void;
  errors: FieldErrors<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  watchType: "single" | "multi";
  watchRequired: boolean;
}

function GroupEditor({ control, register, groupIndex, onRemoveGroup, errors, setValue, watchType, watchRequired }: GroupEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: `customizationGroups.${groupIndex}.options` });
  const groupErrors = errors.customizationGroups?.[groupIndex];

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <Label>Group name</Label>
          <Input {...register(`customizationGroups.${groupIndex}.name`)} placeholder="e.g. Size" />
          {groupErrors?.name && <p className="text-xs text-destructive">{groupErrors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select
            value={watchType}
            onValueChange={(v) => setValue(`customizationGroups.${groupIndex}.type`, v as "single" | "multi")}
          >
            <SelectTrigger className="w-32" aria-label={`Group ${groupIndex + 1} selection type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single-select</SelectItem>
              <SelectItem value="multi">Multi-select</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            checked={watchRequired}
            onCheckedChange={(checked) => setValue(`customizationGroups.${groupIndex}.required`, checked === true)}
          />
          <Label className="font-normal">Required</Label>
        </div>
        <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label="Remove group" onClick={onRemoveGroup}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        {fields.map((field, optionIndex) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              {...register(`customizationGroups.${groupIndex}.options.${optionIndex}.label`)}
              placeholder="Label"
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              {...register(`customizationGroups.${groupIndex}.options.${optionIndex}.priceDelta`)}
              placeholder="Price delta"
              className="w-32"
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove option" onClick={() => remove(optionIndex)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {groupErrors?.options?.message && <p className="text-xs text-destructive">{groupErrors.options.message as string}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ id: genId("opt"), label: "", priceDelta: 0 })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add option
        </Button>
      </div>
    </div>
  );
}

interface CustomizationGroupsEditorProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  watchGroups: ProductFormValues["customizationGroups"];
  setValue: UseFormSetValue<ProductFormValues>;
}

export function CustomizationGroupsEditor({ control, register, errors, watchGroups, setValue }: CustomizationGroupsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "customizationGroups" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Customization groups</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ id: genId("grp"), name: "", type: "single", required: false, options: [{ id: genId("opt"), label: "", priceDelta: 0 }] })
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add group
        </Button>
      </div>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">No customization groups (optional).</p>}
      {fields.map((field, index) => (
        <GroupEditor
          key={field.id}
          control={control}
          register={register}
          groupIndex={index}
          onRemoveGroup={() => remove(index)}
          errors={errors}
          setValue={setValue}
          watchType={watchGroups?.[index]?.type ?? "single"}
          watchRequired={watchGroups?.[index]?.required ?? false}
        />
      ))}
    </div>
  );
}

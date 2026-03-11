"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Severity = "DANGER" | "WARNING" | "CAUTION";

interface WarningData {
  id: string;
  title: string;
  description: string;
  severity: Severity;
}

interface WarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warning?: WarningData | null;
  onSuccess: () => void;
}

export function WarningDialog({
  open,
  onOpenChange,
  warning,
  onSuccess,
}: WarningDialogProps) {
  const isEdit = !!warning;
  const [title, setTitle] = useState(warning?.title || "");
  const [description, setDescription] = useState(warning?.description || "");
  const [severity, setSeverity] = useState<Severity>(warning?.severity || "WARNING");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle(warning?.title || "");
    setDescription(warning?.description || "");
    setSeverity(warning?.severity || "WARNING");
    setErrors({});
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!severity) newErrors.severity = "Severity is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/warnings/${warning!.id}` : "/api/warnings";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), severity }),
      });

      if (res.ok) {
        toast.success(isEdit ? "Warning updated" : "Warning created");
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Warning" : "Create Warning"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the warning details below."
              : "Fill in the details to create a new warning."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Warning title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Warning description"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select
              name="severity"
              value={severity}
              onValueChange={(value) => setSeverity(value as Severity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DANGER">Danger</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CAUTION">Caution</SelectItem>
              </SelectContent>
            </Select>
            {errors.severity && (
              <p className="text-sm text-destructive">{errors.severity}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

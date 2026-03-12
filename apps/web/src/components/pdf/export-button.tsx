"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { LanguageSelectDialog } from "@/components/pdf/language-select-dialog";
import { toast } from "sonner";

interface ExportButtonProps {
  manualId: string;
  languages: { code: string; name: string; translated: number; total: number }[];
}

export function ExportButton({ manualId, languages }: ExportButtonProps) {
  const { exportPdf, exporting, error } = usePdfExport();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  async function handleExport(language?: string) {
    const lang = language || languages[0]?.code || "en";
    await exportPdf(manualId, lang);
  }

  function handleClick() {
    if (languages.length > 1) {
      setDialogOpen(true);
    } else {
      handleExport();
    }
  }

  return (
    <>
      <Button
        data-testid="export-pdf-button"
        variant="outline"
        onClick={handleClick}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2
            data-testid="export-spinner"
            role="status"
            className="mr-1 h-4 w-4 animate-spin"
          />
        ) : (
          <Download className="mr-1 h-4 w-4" />
        )}
        Export PDF
      </Button>

      <LanguageSelectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        languages={languages}
        onSelect={(lang) => {
          setDialogOpen(false);
          handleExport(lang);
        }}
      />
    </>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { ReviewPageClient } from "./review-client";

interface ReviewPageProps {
  params: { importId: string };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const importRecord = await prisma.pdfImport.findFirst({
    where: {
      id: params.importId,
      userId: session.user.id,
    },
  });

  if (!importRecord) {
    redirect("/manuals");
  }

  if (importRecord.status !== "READY_FOR_REVIEW") {
    redirect("/manuals");
  }

  const extractedData = importRecord.extractedData as any;
  const confidence = importRecord.confidence as any;

  return (
    <ReviewPageClient
      importId={importRecord.id}
      sourceFilename={importRecord.sourceFilename}
      extractedData={extractedData}
      confidence={confidence}
      detectedLanguage={importRecord.detectedLanguage ?? "en"}
      rawTextLength={importRecord.rawText?.length ?? 0}
    />
  );
}

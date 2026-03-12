export function generatePdfFilename(
  productName: string,
  language: string,
  version: number
): string {
  const sanitized = productName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  const lang = language.toUpperCase();

  return `${sanitized}_${lang}_v${version}.pdf`;
}

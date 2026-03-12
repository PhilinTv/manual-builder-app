import { describe, it, expect } from "vitest";
import { renderManualToHtml } from "@/services/pdf/template";

const manualFixture = {
  productName: "TestProduct",
  overview: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Overview text here" }] }] },
  instructions: [
    { id: "1", title: "Setup Guide", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Step 1" }] }] }, order: 0 },
    { id: "2", title: "Usage", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Step 2" }] }] }, order: 1 },
    { id: "3", title: "Maintenance", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Step 3" }] }] }, order: 2 },
  ],
  warnings: [
    { id: "w1", title: "High Voltage", description: "Do not open", severity: "DANGER", order: 0 },
    { id: "w2", title: "Hot Surface", description: "Let cool before handling", severity: "WARNING", order: 1 },
  ],
};

describe("renderManualToHtml", () => {
  it("returns HTML containing an h1 with the product name", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("<h1");
    expect(html).toContain("TestProduct");
  });
  it("contains inline SVG for each danger warning", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("<svg");
    const svgCount = (html.match(/<svg/g) || []).length;
    expect(svgCount).toBeGreaterThanOrEqual(2);
  });
  it("contains text labels matching severity", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("DANGER");
    expect(html).toContain("WARNING");
  });
  it("contains @page CSS rule for page numbers", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("@page");
  });
  it("contains all instruction titles", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("Setup Guide");
    expect(html).toContain("Usage");
    expect(html).toContain("Maintenance");
  });
  it("contains overview text", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("Overview text here");
  });

  it("contains Table of Contents with anchor links", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain("Table of Contents");
    expect(html).toContain('href="#overview"');
    expect(html).toContain('href="#warnings"');
    expect(html).toContain('href="#instruction-1"');
    expect(html).toContain('href="#instruction-2"');
    expect(html).toContain('href="#instruction-3"');
  });

  it("has id attributes on sections for TOC anchors", () => {
    const html = renderManualToHtml(manualFixture, "en");
    expect(html).toContain('id="overview"');
    expect(html).toContain('id="warnings"');
    expect(html).toContain('id="instruction-1"');
    expect(html).toContain('id="instruction-2"');
    expect(html).toContain('id="instruction-3"');
  });
});

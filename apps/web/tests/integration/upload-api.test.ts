import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
vi.mock("@wapp/db", () => ({
  prisma: {
    pdfImport: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

// Mock processImport
const mockProcessImport = vi.fn();
vi.mock("@/services/import/pipeline", () => ({
  processImport: (...args: any[]) => mockProcessImport(...args),
}));

// Mock fs
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
vi.mock("fs/promises", () => ({
  mkdir: (...args: any[]) => mockMkdir(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
}));

function createPdfFile(name = "test.pdf", size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type: "application/pdf" });
}

function createFormDataRequest(file: File): NextRequest {
  const formData = new FormData();
  formData.append("file", file);
  return new NextRequest("http://localhost:3001/api/imports/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/imports/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockProcessImport.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 409 when an import is already in progress", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "existing-import" });

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("An import is already in progress");
  });

  it("returns 400 when no file is provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = new NextRequest("http://localhost:3001/api/imports/upload", {
      method: "POST",
      body: new FormData(),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No file provided");
  });

  it("returns 400 when file is not a PDF", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/imports/upload/route");
    const file = new File([new ArrayBuffer(100)], "test.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("file", file);
    const request = new NextRequest(
      "http://localhost:3001/api/imports/upload",
      { method: "POST", body: formData }
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Only PDF files are accepted");
  });

  it("returns 400 when file exceeds 10MB", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/imports/upload/route");
    const file = createPdfFile("large.pdf", 11 * 1024 * 1024);
    const request = createFormDataRequest(file);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("File size exceeds 10MB limit");
  });

  it("returns 201 with importId on successful upload", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "import-123" });

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.importId).toBe("import-123");

    // Verify prisma.pdfImport.create was called with correct data
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sourceFilename: "test.pdf",
        fileSize: 1024,
        filePath: expect.stringContaining("test.pdf"),
        status: "UPLOADING",
      },
    });

    // Verify processImport was triggered
    expect(mockProcessImport).toHaveBeenCalledWith("import-123");
  });

  it("saves the file to disk before creating the record", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "import-456" });

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    await POST(request);

    // mkdir should be called with recursive option
    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });

    // writeFile should be called with file path and buffer
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("test.pdf"),
      expect.any(Buffer)
    );
  });

  it("returns 500 with error message when database create fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Upload failed. Please try again.");
  });

  it("returns 500 with error message when file write fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);
    mockWriteFile.mockRejectedValue(new Error("Disk full"));

    const { POST } = await import("@/app/api/imports/upload/route");
    const request = createFormDataRequest(createPdfFile());
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Upload failed. Please try again.");
  });
});

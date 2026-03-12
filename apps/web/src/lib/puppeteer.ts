let browserInstance: any = null;

export async function getBrowser() {
  if (browserInstance) return browserInstance;

  try {
    const puppeteer = await import("puppeteer");
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    return browserInstance;
  } catch {
    return null;
  }
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

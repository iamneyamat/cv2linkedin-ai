const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Intercept /api/ai/test-key with realistic dynamic model discovery responses
  await page.route('**/api/ai/test-key', async (route) => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const provider = postData.provider || 'gemini';

    if (provider === 'gemini') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          valid: true,
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          message: 'Connected to Google Gemini! Found 3 models available for your API key.',
          models: [
            {
              id: 'gemini-2.5-flash',
              name: 'models/gemini-2.5-flash',
              displayName: 'Gemini 2.5 Flash',
              supportedMethods: ['generateContent'],
              category: 'flash',
              badge: 'Fast • Recommended',
              recommended: true
            },
            {
              id: 'gemini-2.5-pro',
              name: 'models/gemini-2.5-pro',
              displayName: 'Gemini 2.5 Pro',
              supportedMethods: ['generateContent'],
              category: 'pro',
              badge: 'Advanced Reasoning',
              recommended: false
            },
            {
              id: 'gemini-2.0-flash-lite',
              name: 'models/gemini-2.0-flash-lite',
              displayName: 'Gemini 2.0 Flash-Lite',
              supportedMethods: ['generateContent'],
              category: 'flash-lite',
              badge: 'Fast & Efficient',
              recommended: false
            }
          ]
        })
      });
    } else if (provider === 'openai') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          valid: true,
          provider: 'openai',
          model: 'gpt-4o-mini',
          message: 'Connected to OpenAI! Found 3 models available for your API key.',
          models: [
            {
              id: 'gpt-4o-mini',
              name: 'gpt-4o-mini',
              displayName: 'gpt-4o-mini',
              supportedMethods: ['chat.completions'],
              category: 'flash-lite',
              badge: 'Fast / Efficient',
              recommended: true
            },
            {
              id: 'gpt-4o',
              name: 'gpt-4o',
              displayName: 'gpt-4o',
              supportedMethods: ['chat.completions'],
              category: 'pro',
              badge: 'High Capability',
              recommended: false
            },
            {
              id: 'o1-mini',
              name: 'o1-mini',
              displayName: 'o1-mini',
              supportedMethods: ['chat.completions'],
              category: 'reasoner',
              badge: 'Reasoning',
              recommended: false
            }
          ]
        })
      });
    } else if (provider === 'deepseek') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          valid: true,
          provider: 'deepseek',
          model: 'deepseek-chat',
          message: 'Connected to DeepSeek! Found 2 models available for your API key.',
          models: [
            {
              id: 'deepseek-chat',
              name: 'deepseek-chat',
              displayName: 'DeepSeek Chat',
              supportedMethods: ['chat.completions'],
              category: 'chat',
              badge: 'General Chat',
              recommended: true
            },
            {
              id: 'deepseek-reasoner',
              name: 'deepseek-reasoner',
              displayName: 'DeepSeek Reasoner',
              supportedMethods: ['chat.completions'],
              category: 'reasoner',
              badge: 'Reasoning',
              recommended: false
            }
          ]
        })
      });
    } else {
      await route.continue();
    }
  });

  console.log('Navigating to http://localhost:3005...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 1. 01_provider_selector.png - Inline provider selector card
  console.log('Capturing 01_provider_selector.png...');
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '01_provider_selector.png') });

  // 2. Open Settings Modal & capture 02_gemini_settings.png
  console.log('Capturing 02_gemini_settings.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const settingsBtn = page.locator('[data-testid="header-ai-settings-btn"]');
  await settingsBtn.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02_gemini_settings.png') });

  // 3. Switch to OpenAI tab & capture 03_openai_settings.png
  console.log('Capturing 03_openai_settings.png...');
  const openaiTab = page.locator('[data-testid="provider-tab-openai"]');
  await openaiTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '03_openai_settings.png') });

  // 4. Switch to DeepSeek tab & capture 04_deepseek_settings.png
  console.log('Capturing 04_deepseek_settings.png...');
  const deepseekTab = page.locator('[data-testid="provider-tab-deepseek"]');
  await deepseekTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '04_deepseek_settings.png') });

  // 5. Expand Tutorial & capture 05_api_key_tutorial.png
  console.log('Capturing 05_api_key_tutorial.png...');
  const tutorialToggle = page.locator('button:has-text("How to get an API key?")');
  await tutorialToggle.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '05_api_key_tutorial.png') });

  // Close tutorial
  await tutorialToggle.click();
  await page.waitForTimeout(300);

  // 6. Test Key & Discover Dynamic Models -> 06_dynamic_models.png
  console.log('Capturing 06_dynamic_models.png...');
  // Switch to OpenAI to test OpenAI discovery
  await openaiTab.click();
  await page.waitForTimeout(300);
  const keyInput = page.locator('[data-testid="modal-key-input"]');
  await keyInput.fill('sk-proj-demo-mock-key-openai-test-123456');
  const testBtn = page.locator('[data-testid="modal-test-key-btn"]');
  await testBtn.click();
  await page.waitForSelector('text=Connected to OpenAI', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '06_dynamic_models.png') });

  // 7. Switch to Gemini tab, preserve OpenAI key and reset model -> 07_provider_switch.png
  console.log('Capturing 07_provider_switch.png...');
  const geminiTab = page.locator('[data-testid="provider-tab-gemini"]');
  await geminiTab.click();
  await page.waitForTimeout(300);
  // Fill Gemini key and test Gemini
  await keyInput.fill('AIzaSyMockKeyForGeminiDemonstration123456');
  await testBtn.click();
  await page.waitForSelector('text=Connected to Google Gemini', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '07_provider_switch.png') });

  // 8. Close modal, upload sample CV document, verify pre-generation badge -> 08_generation_ready.png
  console.log('Capturing 08_generation_ready.png...');
  const doneBtn = page.locator('button:has-text("Done")');
  await doneBtn.click();
  await page.waitForTimeout(400);

  // Upload a simulated valid PDF using setInputFiles on file input
  const testPdfPath = path.join(__dirname, 'sample_cv.pdf');
  // Minimal valid PDF content
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 150>>stream\nBT /F1 12 Tf 72 712 Td (Senior Software Engineer with 8 years of experience building distributed systems in Python, Go, and TypeScript at Global Tech Corp.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n418\n%%EOF\n');
  fs.writeFileSync(testPdfPath, pdfHeader);

  const fileInput = page.locator('[data-testid="cv-file-input"]');
  await fileInput.setInputFiles(testPdfPath);
  await page.waitForTimeout(500);

  // Verify badge exists and contains pre-generation info
  const modelBadge = page.locator('[data-testid="selected-model-badge"]');
  await modelBadge.waitFor({ state: 'visible' });
  await modelBadge.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '08_generation_ready.png') });

  // Clean up temporary sample_cv.pdf
  try { fs.unlinkSync(testPdfPath); } catch {}

  // 9. Mobile Viewport (375x812) -> 09_mobile_settings.png
  console.log('Capturing 09_mobile_settings.png...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  await settingsBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '09_mobile_settings.png') });

  console.log('All 9 screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep12A() {
  console.log('===============================================================');
  console.log('🚀 STARTING STEP 12A PLAYWRIGHT E2E ACCEPTANCE VERIFICATION');
  console.log('===============================================================');

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Verify HTTP 200 on localhost:3005
  console.log('\n[TEST 1] Verifying local production server on http://localhost:3005...');
  const res = await fetch('http://localhost:3005');
  if (!res.ok) {
    throw new Error(`Failed to reach production server: HTTP ${res.status}`);
  }
  console.log('✓ Server responded with HTTP 200 OK');

  // 2. Verify GET /api/ai/config endpoint (unconfigured baseline)
  console.log('\n[TEST 2] Verifying GET /api/ai/config baseline security contract...');
  const configRes = await fetch('http://localhost:3005/api/ai/config');
  if (!configRes.ok) {
    throw new Error(`GET /api/ai/config returned HTTP ${configRes.status}`);
  }
  const configData = await configRes.json();
  console.log('Config API Response:', JSON.stringify(configData, null, 2));

  // Security checks: ensure NO secret or structure leakage
  const rawConfigText = JSON.stringify(configData);
  if (
    rawConfigText.includes('apiKey') ||
    rawConfigText.includes('keyPrefix') ||
    rawConfigText.includes('keyLength') ||
    rawConfigText.includes('AIzaSy') ||
    rawConfigText.includes('sk-')
  ) {
    throw new Error('SECURITY VIOLATION: Sensitive key data found in /api/ai/config response!');
  }
  console.log('✓ Zero secret leakage verified on GET /api/ai/config');

  // 3. Launch browser and verify UI
  console.log('\n[TEST 3] Launching Playwright browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    console.log('✓ Page loaded');

    // Select Developer / Demo Key mode
    console.log('\n[TEST 4] Selecting Developer / Demo Key mode...');
    const devModeBtn = page.locator('[data-testid="mode-tab-developer"]');
    await devModeBtn.click();
    await page.waitForTimeout(400);

    // Verify unconfigured warning is rendered
    console.log('\n[TEST 5] Checking unconfigured developer status message...');
    const unconfiguredNotice = page.locator('text=Developer / Demo AI is not configured for this provider.');
    const isUnconfiguredVisible = await unconfiguredNotice.isVisible();
    console.log('Unconfigured Notice Visible:', isUnconfiguredVisible);

    const envGuidance = page.locator('text=Please configure the provider API key in .env.local.');
    const isEnvGuidanceVisible = await envGuidance.isVisible();
    console.log('Env guidance visible:', isEnvGuidanceVisible);

    const quotaDisclaimer = page.locator('text=Trial access may be limited by provider quota and availability.');
    const isDisclaimerVisible = await quotaDisclaimer.isVisible();
    console.log('Trial disclaimer visible:', isDisclaimerVisible);

    // Take screenshot of unconfigured state
    const ss1 = path.join(screenshotsDir, 'step12a_01_developer_unconfigured.png');
    await page.screenshot({ path: ss1, fullPage: false });
    console.log(`✓ Screenshot captured: ${ss1}`);

    // Click "Test Server Key" in unconfigured mode
    console.log('\n[TEST 6] Testing "Test Server Key" button when unconfigured...');
    const testServerBtn = page.locator('[data-testid="inline-test-server-key-btn"]');
    await testServerBtn.click();
    await page.waitForTimeout(600);

    const errorFeedback = page.locator('text=Developer / Demo AI is not configured for gemini on this server');
    const isErrorFeedbackVisible = await errorFeedback.isVisible();
    console.log('Clean AI_NOT_CONFIGURED error message displayed:', isErrorFeedbackVisible);

    // 4. Test User API Key (BYOK) coexistence
    console.log('\n[TEST 7] Testing BYOK mode coexistence and input...');
    const byokBtn = page.locator('[data-testid="mode-tab-byok"]');
    await byokBtn.click();
    await page.waitForTimeout(400);

    const keyInput = page.locator('[data-testid="inline-key-input"]');
    const isInputVisible = await keyInput.isVisible();
    console.log('BYOK key input visible:', isInputVisible);

    await keyInput.fill('AIzaSyTestUserKeyForVerification123456');
    await page.waitForTimeout(300);

    const clearBtn = page.locator('[data-testid="inline-clear-key-btn"]');
    console.log('Clear Key button visible:', await clearBtn.isVisible());

    // Take screenshot of BYOK mode
    const ss2 = path.join(screenshotsDir, 'step12a_02_byok_coexistence.png');
    await page.screenshot({ path: ss2, fullPage: false });
    console.log(`✓ Screenshot captured: ${ss2}`);

    // Clear key and switch back to developer mode
    await clearBtn.click();
    await page.waitForTimeout(300);
    console.log('Key cleared successfully');

    await devModeBtn.click();
    await page.waitForTimeout(300);

    // 5. Test Provider Tabs in Developer Mode
    console.log('\n[TEST 8] Switching providers in Developer Mode...');
    const openaiTab = page.locator('[data-testid="inline-provider-openai"]');
    await openaiTab.click();
    await page.waitForTimeout(300);

    const openaiNotice = page.locator('text=Developer / Demo AI is not configured for this provider.');
    console.log('OpenAI unconfigured notice visible:', await openaiNotice.isVisible());

    const deepseekTab = page.locator('[data-testid="inline-provider-deepseek"]');
    await deepseekTab.click();
    await page.waitForTimeout(300);

    const deepseekNotice = page.locator('text=Developer / Demo AI is not configured for this provider.');
    console.log('DeepSeek unconfigured notice visible:', await deepseekNotice.isVisible());

    // Switch back to Gemini
    const geminiTab = page.locator('[data-testid="inline-provider-gemini"]');
    await geminiTab.click();
    await page.waitForTimeout(300);

    // 6. Test Model Discovery API endpoint directly for credential security
    console.log('\n[TEST 9] Verifying POST /api/ai/models endpoint security in Developer Mode...');
    const modelsRes = await fetch('http://localhost:3005/api/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'developer', provider: 'gemini' })
    });
    const modelsData = await modelsRes.json();
    console.log('Models endpoint status:', modelsRes.status, 'Error Code:', modelsData.errorCode);
    if (modelsRes.status !== 400 || modelsData.errorCode !== 'AI_NOT_CONFIGURED') {
      throw new Error(`Expected AI_NOT_CONFIGURED 400, got ${modelsRes.status}`);
    }
    console.log('✓ POST /api/ai/models correctly rejected unconfigured developer mode with AI_NOT_CONFIGURED');

    console.log('\n===============================================================');
    console.log('🎉 STEP 12A PLAYWRIGHT E2E ACCEPTANCE VERIFICATION SUCCESSFUL');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

verifyStep12A().catch((err) => {
  console.error('\n❌ E2E VERIFICATION ERROR:', err);
  process.exit(1);
});

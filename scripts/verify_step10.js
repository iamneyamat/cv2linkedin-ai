const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep10() {
  console.log('--- STARTING STEP 10 PLAYWRIGHT ACCEPTANCE VERIFICATION ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const samplePackage = {
    headline: 'Senior Cloud Solutions Architect | Kubernetes, AWS & Distributed Systems',
    about: 'Visionary technology leader with 10+ years architecting enterprise distributed cloud architectures. Specialized in high-throughput data streaming and multi-region resilient microservices.',
    experience: [
      {
        company: 'CloudScale Technologies',
        role: 'Lead Cloud Architect',
        dates: '2021 - Present',
        location: 'San Francisco, CA',
        bullets: [
          'Architected Kubernetes-based payment streaming engine processing $100M+ ARR with 99.999% SLA.',
          'Mentored team of 14 cloud infrastructure engineers across 3 time zones.'
        ]
      }
    ],
    education: [
      {
        institution: 'University of Washington',
        degree: 'B.S. in Computer Science',
        dates: '2015 - 2019'
      }
    ],
    skills: ['Kubernetes', 'Go', 'AWS Architecture', 'Kafka', 'Terraform'],
    certifications: ['AWS Solutions Architect Professional', 'CKA: Certified Kubernetes Administrator'],
    projects: [
      {
        name: 'Distributed Event Bridge',
        description: 'Low-latency event broker handling 50k msgs/sec.',
        technologies: ['Go', 'gRPC', 'PostgreSQL']
      }
    ],
    achievements: ['Decreased cloud infrastructure costs by 32% year-over-year.'],
    suggestedKeywords: ['Cloud Architecture', 'Kubernetes', 'High Availability', 'Distributed Systems']
  };

  // Intercept generate-profile
  await page.route('**/api/generate-profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: samplePackage,
        modeUsed: 'byok'
      })
    });
  });

  // Intercept test-key
  await page.route('**/api/ai/test-key', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        valid: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        message: 'Connected to Google Gemini! Found 1 model.',
        models: [
          {
            id: 'gemini-2.5-flash',
            name: 'models/gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            supportedMethods: ['generateContent'],
            category: 'flash',
            recommended: true
          }
        ]
      })
    });
  });

  // 1. Verify Landing Page
  console.log('[1/7] Testing Landing Page on http://localhost:3005...');
  const response = await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
  if (response.status() !== 200) {
    throw new Error(`Expected HTTP 200 on landing page, got ${response.status()}`);
  }
  console.log('✓ Landing page returned HTTP 200 OK');

  // 2. Open AI Settings and verify multi-provider support
  console.log('[2/7] Testing Multi-Provider AI Settings...');
  await page.click('button:has-text("AI Settings")');
  await page.waitForSelector('text=Select AI Provider');
  await page.waitForSelector('text=Google Gemini');
  await page.waitForSelector('text=OpenAI');
  await page.waitForSelector('text=DeepSeek');

  // Input key and test
  const keyInput = page.locator('[data-testid="modal-key-input"]');
  await keyInput.fill('AIzaSyMockKeyForGeminiDemonstration123456');
  await page.click('[data-testid="modal-test-key-btn"]');
  await page.waitForSelector('text=Connected to Google Gemini');
  console.log('✓ Multi-provider selection and dynamic discovery verified');
  await page.screenshot({ path: path.join(screenshotsDir, 'step10_01_multi_provider.png') });

  // Close modal
  await page.click('button:has-text("Done")');
  await page.waitForTimeout(300);

  // 3. Upload CV and trigger Generation
  console.log('[3/7] Uploading CV and generating profile...');
  const testPdfPath = path.join(__dirname, 'sample_cv_test10.pdf');
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 150>>stream\nBT /F1 12 Tf 72 712 Td (Senior Cloud Solutions Architect with 10 years of experience in Kubernetes, AWS, and Distributed Systems at CloudScale Technologies.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n418\n%%EOF\n');
  fs.writeFileSync(testPdfPath, pdfHeader);

  const fileInput = page.locator('[data-testid="cv-file-input"]');
  await fileInput.setInputFiles(testPdfPath);
  await page.waitForTimeout(500);

  // Click generate button
  const generateBtn = page.locator('[data-testid="generate-profile-btn"]');
  await generateBtn.click();

  // Wait for profile result view
  await page.waitForSelector('[data-testid="linkedin-connection-container"]');
  console.log('✓ LinkedIn connection container is mounted and visible in generated profile view');

  // Verify NOT_CONNECTED state
  await page.waitForSelector('text=Connect your LinkedIn profile to optimize it with your CV and AI.');
  await page.waitForSelector('[data-testid="connect-linkedin-btn"]');
  console.log('✓ NOT_CONNECTED state displayed correctly with "Connect LinkedIn" button');
  await page.screenshot({ path: path.join(screenshotsDir, 'step10_02_linkedin_not_connected.png') });

  // 4. Test Connect Button with unconfigured credentials
  console.log('[4/7] Testing Connect button behavior with unconfigured credentials...');
  await page.click('[data-testid="connect-linkedin-btn"]');
  await page.waitForSelector('text=LinkedIn Connection Notice');
  await page.waitForSelector('text=How to configure LinkedIn OAuth:');
  console.log('✓ Clean configuration setup notice displayed gracefully without application crash');
  await page.screenshot({ path: path.join(screenshotsDir, 'step10_03_unconfigured_notice.png') });

  // Dismiss notice
  await page.click('button:has-text("Dismiss")');
  await page.waitForSelector('[data-testid="connect-linkedin-btn"]');
  console.log('✓ Dismissed notice returned to NOT_CONNECTED state');

  // 5. Test Deep Edit Links on Headline and About
  console.log('[5/7] Verifying LinkedIn Section Deep Edit Links...');
  const introLink = await page.getAttribute('a[title="Open LinkedIn Intro Editor in new tab"]', 'href');
  const aboutLink = await page.getAttribute('a[title="Open LinkedIn About Editor in new tab"]', 'href');

  if (introLink !== 'https://www.linkedin.com/in/me/edit/intro/') {
    throw new Error(`Unexpected headline deep link: ${introLink}`);
  }
  if (aboutLink !== 'https://www.linkedin.com/in/me/edit/about/') {
    throw new Error(`Unexpected about deep link: ${aboutLink}`);
  }
  console.log('✓ Section deep edit links verified for headline and about');

  // 6. Test Mobile Viewport
  console.log('[6/7] Testing Mobile Layout (375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);
  await page.waitForSelector('[data-testid="linkedin-connection-container"]');
  console.log('✓ Mobile viewport displays LinkedIn connection container cleanly');
  await page.screenshot({ path: path.join(screenshotsDir, 'step10_04_mobile_view.png') });

  // 7. Test Start Over button
  console.log('[7/7] Testing Start Over button...');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('[data-testid="start-over-btn"]');
  await page.waitForSelector('text=Simple 3-Step Process');
  console.log('✓ Start Over successfully resets view back to landing upload state');

  // Clean up
  try { fs.unlinkSync(testPdfPath); } catch {}
  await browser.close();
  console.log('--- ALL STEP 10 ACCEPTANCE VERIFICATIONS PASSED SUCCESSFULLY ---');
}

verifyStep10().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});

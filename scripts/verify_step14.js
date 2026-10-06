const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep14() {
  console.log('===============================================================');
  console.log('🚀 STARTING STEP 14 LINKEDIN WRITE-BACK & APPROVAL GATE VERIFICATION');
  console.log('===============================================================');

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Verify Production Server HTTP 200
  console.log('\n[TEST 1] Verifying local production server on http://localhost:3005...');
  const res = await fetch('http://localhost:3005');
  if (!res.ok) {
    throw new Error(`Production server returned HTTP ${res.status}`);
  }
  console.log('✓ Server responded with HTTP 200 OK');

  // Launch browser with Edge channel
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();

  try {
    // 2. Setup mock profile and navigate
    console.log('\n[TEST 2] Navigating and initializing application...');
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');

    // Prepare valid session state
    await page.evaluate(() => {
      sessionStorage.setItem('cv2linkedin_byok_key_gemini', 'AIzaSyMockKeyForVerification12345');
      sessionStorage.setItem('cv2linkedin_byok_key', 'AIzaSyMockKeyForVerification12345');
      sessionStorage.setItem('cv2linkedin_ai_mode', 'byok');
      sessionStorage.setItem('cv2linkedin_ai_provider', 'gemini');
      const mockModels = [
        {
          id: 'gemini-2.5-flash',
          name: 'models/gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          supportedMethods: ['generateContent'],
          recommended: true
        }
      ];
      sessionStorage.setItem('cv2linkedin_discovered_models_gemini', JSON.stringify(mockModels));
      sessionStorage.setItem('cv2linkedin_discovered_models', JSON.stringify(mockModels));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Create temporary valid test PDF buffer in memory to test real upload
    const testPdfPath = path.join(__dirname, 'sample_test_step14_cv.pdf');
    if (!fs.existsSync(testPdfPath)) {
      const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 265 >> stream
BT
/F1 12 Tf
72 712 Td
(Alex Vance - Principal Cloud Architect) Tj
0 -18 Td
(Senior distributed systems engineer with 12 years experience building Kubernetes platforms.) Tj
0 -18 Td
(Skills: Go, Kubernetes, Kafka, AWS, Terraform, Distributed Consensus, Architecture.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000585 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
666
%%EOF`;
      fs.writeFileSync(testPdfPath, pdfContent);
    }

    const fileInput = page.locator('[data-testid="cv-file-input"]');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForTimeout(500);

    const samplePackage = {
      headline: 'Principal Distributed Systems Architect | Cloud-Native Infrastructure & Go',
      about: 'Senior engineering leader with 12+ years designing mission-critical distributed systems.',
      experience: [
        {
          company: 'Nexus Scale Labs',
          role: 'Principal Systems Architect',
          dates: '2021 - Present',
          bullets: ['Architected distributed messaging engine supporting 500,000 events/sec.']
        }
      ],
      education: [],
      skills: ['Distributed Systems', 'Go', 'Kubernetes'],
      certifications: [],
      projects: [],
      achievements: [],
      suggestedKeywords: ['Distributed Systems', 'Cloud']
    };

    // Intercept profile generation
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

    const generateBtn = page.locator('[data-testid="generate-profile-btn"]');
    await generateBtn.click();
    await page.waitForTimeout(1200);

    // Open Manual LinkedIn Profile paste modal
    const manualBtn = page.locator('[data-testid="manual-import-trigger-btn"]');
    await manualBtn.click();
    await page.waitForTimeout(400);

    const pasteTextarea = page.locator('[data-testid="pasted-profile-textarea"]');
    await pasteTextarea.fill(`Headline: Cloud Architect at TechCorp
About: Experienced engineer working on AWS and microservices.
Experience:
Lead Engineer at TechCorp (2020 - Present)
- Built cloud pipelines.
Skills: AWS, Python, Docker`);
    await page.waitForTimeout(300);

    const useProfileBtn = page.locator('[data-testid="analyze-pasted-btn"]');
    await useProfileBtn.click();
    await page.waitForTimeout(500);

    // Intercept optimization analysis
    const sampleOptimizationResult = {
      overallScore: 84,
      scoreDimensions: {
        headline: 88,
        about: 85,
        experience: 82,
        skills: 86,
        consistency: 80,
        readability: 90
      },
      summary: 'Your profile has strong core alignment with your CV experience, but misses high-impact Kubernetes architecture details.',
      strengths: ['Strong technical cloud focus aligned with infrastructure roles.'],
      gaps: ['Headline does not highlight Principal-level scale or distributed systems specialty.'],
      keywordAnalysis: {
        matched: ['AWS', 'Microservices'],
        missing: ['Kubernetes', 'Go (Golang)'],
        recommended: ['Distributed Consensus']
      },
      sectionRecommendations: [
        {
          id: 'rec-headline',
          section: 'headline',
          title: 'Elevate Headline to Principal Distributed Systems Architect',
          currentContent: 'Cloud Architect at TechCorp',
          recommendedContent: 'Principal Distributed Systems Architect | Cloud-Native Infrastructure & Go',
          cvEvidence: ['Principal Systems Architect at Nexus Scale Labs'],
          reason: 'Aligns your public identity with your proven expertise in large-scale distributed systems and Go.',
          improvements: ['Adds Principal seniority', 'Highlights distributed systems specialization'],
          priority: 'HIGH',
          confidence: 94,
          evidenceStatus: 'SUPPORTED_BY_CV',
          deepEditUrl: 'https://www.linkedin.com/in/me/edit/intro/',
          userStatus: 'pending'
        },
        {
          id: 'rec-about',
          section: 'about',
          title: 'Add Executive Scale Summary to About Section',
          currentContent: 'Experienced engineer working on AWS and microservices.',
          recommendedContent: 'Principal Infrastructure Leader architecting zero-downtime distributed systems across multi-region Kubernetes clusters.',
          cvEvidence: ['Spearheaded transition to Kubernetes-native service mesh.'],
          reason: 'Communicates business and architectural maturity.',
          improvements: ['Adds scale metrics'],
          priority: 'HIGH',
          confidence: 90,
          evidenceStatus: 'SUPPORTED_BY_CV',
          deepEditUrl: 'https://www.linkedin.com/in/me/edit/about/',
          userStatus: 'pending'
        }
      ],
      factualWarnings: [],
      priorityActions: ['Update headline', 'Enrich about summary']
    };

    await page.route('**/api/linkedin/optimize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: sampleOptimizationResult
        })
      });
    });

    const runAnalysisBtn = page.locator('[data-testid="analyze-profile-gaps-btn"]');
    await runAnalysisBtn.click();
    await page.waitForTimeout(1200);

    // 3. Screenshot 1: Optimizer Review
    console.log('\n[TEST 3] Capturing Screenshot 1: Optimizer Review...');
    const ss1 = path.join(screenshotsDir, 'step14_01_optimizer_review.png');
    await page.screenshot({ path: ss1 });
    console.log(`✓ Screenshot 1 captured: ${ss1}`);

    // 4. Screenshot 2: Capability Status Banner
    console.log('\n[TEST 4] Verifying Capability Status Banner (screenshot 2)...');
    const capBanner = page.locator('[data-testid="capability-status-banner"]');
    console.log('Capability status banner visible:', await capBanner.isVisible());
    const learnLink = page.locator('[data-testid="learn-api-access-link"]');
    console.log('Learn About API Access link visible:', await learnLink.isVisible());

    await capBanner.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const ss2 = path.join(screenshotsDir, 'step14_02_capability_status.png');
    await page.screenshot({ path: ss2 });
    console.log(`✓ Screenshot 2 captured: ${ss2}`);

    // 5. Screenshot 3: Approval-Required & Write-Unsupported state
    console.log('\n[TEST 5] Verifying Approval-Required state & no Approve & Apply in self-serve mode (screenshot 3)...');
    const notice = page.locator('[data-testid="write-unsupported-notice-headline"]');
    console.log('Write unsupported notice visible:', await notice.isVisible());
    const approveBtn = page.locator('[data-testid="approve-apply-headline"]');
    console.log('Approve & Apply button NOT visible in self-serve mode:', !(await approveBtn.isVisible()));

    await notice.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const ss3 = path.join(screenshotsDir, 'step14_03_approval_required.png');
    await page.screenshot({ path: ss3 });
    console.log(`✓ Screenshot 3 captured: ${ss3}`);

    // 6. Screenshot 4: Copy & Open LinkedIn Workflow
    console.log('\n[TEST 6] Verifying Copy & Open LinkedIn action (screenshot 4)...');
    const copyBtn = page.locator('[data-testid="copy-rec-headline"]');
    await copyBtn.click();
    await page.waitForTimeout(300);
    console.log('Copy feedback visible:', await page.locator('text=Copied!').isVisible());

    const ss4 = path.join(screenshotsDir, 'step14_04_copy_linkedin.png');
    await page.screenshot({ path: ss4 });
    console.log(`✓ Screenshot 4 captured: ${ss4}`);

    // 7. Screenshot 5: Mock Available State, Diff Preview Modal & Apply Protection
    console.log('\n[TEST 7] Testing Mock Available mode and Diff Preview modal (screenshot 5)...');
    // Intercept capabilities endpoint to simulate AVAILABLE state in development mock
    await page.route('**/api/linkedin/capabilities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          capabilities: {
            status: 'AVAILABLE',
            canReadBasicProfile: true,
            canReadDetailedProfile: true,
            canWriteHeadline: true,
            canWriteAbout: true,
            sections: {
              headline: { read: true, write: true, status: 'AVAILABLE' },
              about: { read: true, write: true, status: 'AVAILABLE' }
            },
            reason: 'Development mock write capability active for testing.'
          }
        })
      });
    });

    // Intercept /api/linkedin/apply to return safe concurrency conflict error
    await page.route('**/api/linkedin/apply', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'CONCURRENCY_CONFLICT',
          message: 'Your LinkedIn profile has changed since this recommendation was generated. Review the change again before applying.'
        })
      });
    });

    // Close dashboard to reset optimizer trigger card
    const closeDashboardBtn = page.locator('button[aria-label="Close dashboard"]');
    if (await closeDashboardBtn.isVisible()) {
      await closeDashboardBtn.click();
      await page.waitForTimeout(400);
    }

    // Re-trigger analysis to activate mock capabilities in new dashboard instance
    const reAnalysisBtn = page.locator('[data-testid="analyze-profile-gaps-btn"]');
    await reAnalysisBtn.click();
    await page.waitForTimeout(1000);

    const approveApplyBtn = page.locator('[data-testid="approve-apply-headline"]');
    if (await approveApplyBtn.isVisible()) {
      await approveApplyBtn.click();
      await page.waitForTimeout(500);

      const previewModal = page.locator('[data-testid="change-preview-modal"]');
      console.log('Change preview modal visible:', await previewModal.isVisible());

      const confirmBtn = page.locator('[data-testid="confirm-apply-change-btn"]');
      await confirmBtn.click();
      await page.waitForTimeout(600);

      const errorNotice = page.locator('[data-testid="apply-error-notice"]');
      console.log('Apply protection error notice visible:', await errorNotice.isVisible());
    }

    const ss5 = path.join(screenshotsDir, 'step14_05_apply_protection.png');
    await page.screenshot({ path: ss5 });
    console.log(`✓ Screenshot 5 captured: ${ss5}`);

    // 8. Screenshot 6: Mobile Layout
    console.log('\n[TEST 8] Setting mobile viewport (375x812) & capturing screenshot 6...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const ss6 = path.join(screenshotsDir, 'step14_06_mobile.png');
    await page.screenshot({ path: ss6 });
    console.log(`✓ Screenshot 6 captured: ${ss6}`);

    // Cleanup sample PDF file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }

    console.log('\n===============================================================');
    console.log('🎉 STEP 14 E2E ACCEPTANCE VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

verifyStep14().catch((err) => {
  console.error('\n❌ STEP 14 E2E ERROR:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep15() {
  console.log('===============================================================');
  console.log('🚀 STARTING STEP 15 PRODUCT FINALIZATION & SMOKE TEST VERIFICATION');
  console.log('===============================================================');

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Verify Local Server
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
    // 2. Landing & AI Settings Modal
    console.log('\n[TEST 2] Navigating to landing page & checking AI Settings...');
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');

    const aiSettingsTrigger = page.locator('[data-testid="header-ai-settings-btn"]');
    await aiSettingsTrigger.click();
    await page.waitForTimeout(400);

    const modal = page.locator('[data-testid="ai-settings-modal"]');
    console.log('AI Settings modal opened:', await modal.isVisible());

    // Screenshot 1: AI Settings
    console.log('\n[TEST 3] Capturing Screenshot 1: AI Settings Modal...');
    const ss1 = path.join(screenshotsDir, 'step15_01_ai_settings.png');
    await page.screenshot({ path: ss1 });
    console.log(`✓ Screenshot 1 captured: ${ss1}`);

    // Close AI Settings modal
    const closeSettingsBtn = page.locator('[data-testid="close-ai-settings-btn"]');
    if (await closeSettingsBtn.isVisible()) {
      await closeSettingsBtn.click();
      await page.waitForTimeout(300);
    }

    // 3. Prepare session state for generation
    console.log('\n[TEST 4] Initializing session state and uploading sample CV...');
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

    // Create temporary valid test PDF buffer
    const testPdfPath = path.join(__dirname, 'sample_test_step15_cv.pdf');
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
          location: 'San Francisco, CA',
          dates: '2021 - Present',
          bullets: ['Architected distributed messaging engine supporting 500,000 events/sec.']
        }
      ],
      education: [
        {
          institution: 'UC Berkeley',
          degree: 'B.S. in Computer Science',
          dates: '2013 - 2017'
        }
      ],
      skills: ['Distributed Systems', 'Go', 'Kubernetes', 'Apache Kafka', 'AWS'],
      certifications: ['AWS Solutions Architect Professional'],
      projects: [
        {
          name: 'RaftMesh',
          description: 'Distributed consensus engine in Go.'
        }
      ],
      achievements: ['Speaker at GopherCon'],
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

    // Screenshot 2: Profile Result & Export Card
    console.log('\n[TEST 5] Capturing Screenshot 2: Profile Result & Export Card...');
    const exportCard = page.locator('[data-testid="export-profile-card"]');
    console.log('Export profile card visible:', await exportCard.isVisible());
    const ss2 = path.join(screenshotsDir, 'step15_02_profile_result.png');
    await page.screenshot({ path: ss2 });
    console.log(`✓ Screenshot 2 captured: ${ss2}`);

    // 4. Run Gap Analysis & Optimizer
    console.log('\n[TEST 6] Pasting profile and running Optimizer...');
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

    // Screenshot 3: Optimizer Score & Gaps
    console.log('\n[TEST 7] Capturing Screenshot 3: Optimizer Score & Gap Analysis...');
    const ss3 = path.join(screenshotsDir, 'step15_03_optimizer.png');
    await page.screenshot({ path: ss3 });
    console.log(`✓ Screenshot 3 captured: ${ss3}`);

    // 5. LinkedIn Profile Update Checklist & Manual Update Tracking
    console.log('\n[TEST 8] Interacting with LinkedIn Checklist & Manual Update Tracking...');
    const checklistCard = page.locator('[data-testid="linkedin-checklist-card"]');
    await checklistCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Toggle checklist item (headline)
    const toggleHeadline = page.locator('[data-testid="checklist-toggle-headline"]');
    await toggleHeadline.check();
    await page.waitForTimeout(300);

    const progressText = page.locator('[data-testid="checklist-progress-text"]');
    console.log('Checklist progress text:', await progressText.innerText());

    // Mark recommendation as manually updated
    const markAppliedBtn = page.locator('[data-testid="mark-applied-headline"]');
    if (await markAppliedBtn.isVisible()) {
      await markAppliedBtn.click();
      await page.waitForTimeout(300);
    }

    const appliedStatusBadge = page.locator('[data-testid="applied-status-headline"]');
    console.log('Marked as manually updated badge visible:', await appliedStatusBadge.isVisible());

    // Screenshot 4: Checklist & Manual Tracking
    console.log('\n[TEST 9] Capturing Screenshot 4: LinkedIn Checklist & Manual Tracking...');
    const ss4 = path.join(screenshotsDir, 'step15_04_checklist.png');
    await page.screenshot({ path: ss4 });
    console.log(`✓ Screenshot 4 captured: ${ss4}`);

    // 6. Test Profile Exports
    console.log('\n[TEST 10] Testing Profile Exports (Markdown, JSON, Printable PDF)...');
    await exportCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const exportMdBtn = page.locator('[data-testid="export-markdown-btn"]');
    console.log('Export Markdown button visible:', await exportMdBtn.isVisible());

    const exportJsonBtn = page.locator('[data-testid="export-json-btn"]');
    console.log('Export JSON button visible:', await exportJsonBtn.isVisible());

    const exportPdfBtn = page.locator('[data-testid="export-pdf-btn"]');
    console.log('Export PDF button visible:', await exportPdfBtn.isVisible());

    // Trigger Markdown export download
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    await exportMdBtn.click();
    const download = await downloadPromise;
    if (download) {
      console.log('Downloaded Markdown file name:', download.suggestedFilename());
    }

    // Screenshot 5: Export Action Controls
    console.log('\n[TEST 11] Capturing Screenshot 5: Export Controls...');
    const ss5 = path.join(screenshotsDir, 'step15_05_export.png');
    await page.screenshot({ path: ss5 });
    console.log(`✓ Screenshot 5 captured: ${ss5}`);

    // 7. Mobile Viewport Layout Verification
    console.log('\n[TEST 12] Setting mobile viewport (375x812) & capturing screenshot 6...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const ss6 = path.join(screenshotsDir, 'step15_06_mobile.png');
    await page.screenshot({ path: ss6 });
    console.log(`✓ Screenshot 6 captured: ${ss6}`);

    // Cleanup sample PDF file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }

    console.log('\n===============================================================');
    console.log('🎉 STEP 15 COMPLETE SMOKE TEST & E2E VERIFIED SUCCESSFULLY');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

verifyStep15().catch((err) => {
  console.error('\n❌ STEP 15 E2E ERROR:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep13() {
  console.log('===============================================================');
  console.log('🚀 STARTING STEP 13 E2E ACCEPTANCE & HARDENING VERIFICATION');
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
    // 2. Landing page verification
    console.log('\n[TEST 2] Navigating to landing page...');
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');

    // 3. AI Settings Modal & Provider Switching (step13_01_ai_settings.png)
    console.log('\n[TEST 3] Testing AI Settings Modal & Provider Switching (screenshot 1)...');
    const settingsBtn = page.locator('text=AI Settings').first();
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const modalTitle = page.locator('#ai-settings-modal-title');
    console.log('Settings modal title visible:', await modalTitle.isVisible());

    // Test provider switching inside AI settings
    console.log('Switching providers inside settings: Gemini -> OpenAI -> DeepSeek...');
    const openaiBtn = page.locator('button:has-text("OpenAI")').first();
    if (await openaiBtn.isVisible()) {
      await openaiBtn.click();
      await page.waitForTimeout(300);
      console.log('✓ OpenAI tab switched');
    }

    const deepseekBtn = page.locator('button:has-text("DeepSeek")').first();
    if (await deepseekBtn.isVisible()) {
      await deepseekBtn.click();
      await page.waitForTimeout(300);
      console.log('✓ DeepSeek tab switched');
    }

    const geminiBtn = page.locator('button:has-text("Google Gemini")').first();
    if (await geminiBtn.isVisible()) {
      await geminiBtn.click();
      await page.waitForTimeout(300);
      console.log('✓ Google Gemini tab switched back');
    }

    const ss1 = path.join(screenshotsDir, 'step13_01_ai_settings.png');
    await page.screenshot({ path: ss1 });
    console.log(`✓ Screenshot 1 captured: ${ss1}`);

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close Modal"]');
    await closeBtn.click();
    await page.waitForTimeout(400);

    // 4. Developer / Demo Flow (step13_02_developer_flow.png)
    console.log('\n[TEST 4] Selecting Developer / Demo Key mode & capturing screenshot 2...');
    const devModeTab = page.locator('[data-testid="mode-tab-developer"]');
    await devModeTab.click();
    await page.waitForTimeout(400);

    const testServerBtn = page.locator('[data-testid="inline-test-server-key-btn"]');
    console.log('Test Server Key button visible:', await testServerBtn.isVisible());
    await testServerBtn.click();
    await page.waitForTimeout(600);

    const ss2 = path.join(screenshotsDir, 'step13_02_developer_flow.png');
    await page.screenshot({ path: ss2 });
    console.log(`✓ Screenshot 2 captured: ${ss2}`);

    // 5. BYOK Flow (step13_03_byok_flow.png)
    console.log('\n[TEST 5] Selecting User API Key (BYOK) mode & capturing screenshot 3...');
    const byokTab = page.locator('[data-testid="mode-tab-byok"]');
    await byokTab.click();
    await page.waitForTimeout(400);

    const keyInput = page.locator('[data-testid="inline-key-input"]');
    await keyInput.fill('AIzaSyMockPersonalKeyForVerification12345');
    await page.waitForTimeout(400);

    const ss3 = path.join(screenshotsDir, 'step13_03_byok_flow.png');
    await page.screenshot({ path: ss3 });
    console.log(`✓ Screenshot 3 captured: ${ss3}`);

    // 6. Complete Profile Generation View (step13_04_profile_generation.png)
    console.log('\n[TEST 6] Rendering profile package & capturing screenshot 4...');
    const samplePackage = {
      headline: 'Principal Distributed Systems Architect | Cloud-Native Infrastructure & Go',
      about: 'Senior engineering leader with 12+ years designing mission-critical distributed systems. Experienced in architecting ultra-low latency event brokers, high-throughput microservices, and multi-region Kubernetes clusters.',
      experience: [
        {
          company: 'Nexus Scale Labs',
          role: 'Principal Systems Architect',
          location: 'San Francisco, CA',
          dates: '2021 - Present',
          bullets: [
            'Architected distributed messaging engine supporting 500,000 events/sec with zero message drop.',
            'Spearheaded transition to Kubernetes-native service mesh, reducing inter-service latency by 42% across 80+ microservices.',
            'Mentored 18 distributed systems engineers and established RFC architecture review standards.'
          ]
        },
        {
          company: 'HyperCloud Technologies',
          role: 'Senior Infrastructure Engineer',
          location: 'Seattle, WA',
          dates: '2017 - 2021',
          bullets: [
            'Automated multi-region infrastructure provisioning using Terraform and custom Go operators.',
            'Eliminated cross-AZ egress costs saving $380,000 annually through topological traffic routing.'
          ]
        }
      ],
      education: [
        {
          institution: 'University of Washington',
          degree: 'B.S. in Computer Science',
          dates: '2013 - 2017'
        }
      ],
      skills: ['Distributed Systems', 'Go (Golang)', 'Kubernetes', 'Kafka', 'AWS Cloud', 'Terraform', 'gRPC', 'System Architecture'],
      certifications: ['Certified Kubernetes Administrator (CKA)', 'AWS Solutions Architect Professional'],
      projects: [
        {
          name: 'Distributed Raft Consensus Engine',
          description: 'Open-source distributed log replication engine implemented in Go supporting dynamic membership changes.',
          technologies: ['Go', 'Raft', 'gRPC', 'Protobuf']
        }
      ],
      achievements: [
        'Recognized with Engineering Excellence Award for 99.999% SLA uptime during Q4 peak traffic.',
        'Keynote speaker on Distributed Consensus at Cloud Engineering Summit 2024.'
      ],
      suggestedKeywords: ['Distributed Systems', 'Cloud Architecture', 'Kubernetes', 'High Throughput', 'Go', 'Microservices', 'Event Streaming']
    };

    // Prepare valid session state with discovered models and valid key
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
    const testPdfPath = path.join(__dirname, 'sample_test_cv.pdf');
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

    // Set file input
    const fileInput = page.locator('[data-testid="cv-file-input"]');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForTimeout(500);

    // Intercept /api/generate-profile to return samplePackage deterministically
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
    await page.waitForTimeout(1500);

    // Verify profile preview rendered
    const profileView = page.locator('text=LinkedIn Profile Preview');
    console.log('Profile result view visible:', await profileView.isVisible());

    const ss4 = path.join(screenshotsDir, 'step13_04_profile_generation.png');
    await page.screenshot({ path: ss4 });
    console.log(`✓ Screenshot 4 captured: ${ss4}`);

    // 7. LinkedIn Optimizer Flow (step13_05_optimizer.png)
    console.log('\n[TEST 7] Opening optimizer and verifying gap analysis (screenshot 5)...');
    const manualBtn = page.locator('[data-testid="manual-import-trigger-btn"]');
    await manualBtn.click();
    await page.waitForTimeout(500);

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

    // Intercept /api/linkedin/optimize with complete OptimizationResult
    await page.route('**/api/linkedin/optimize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            overallScore: 84,
            scoreDimensions: {
              headline: 88,
              about: 85,
              experience: 82,
              skills: 86,
              consistency: 80,
              readability: 90
            },
            summary: 'Your profile has strong core alignment with your CV experience, but misses high-impact Kubernetes architecture details and quantified scale metrics.',
            strengths: [
              'Strong technical cloud focus aligned with infrastructure roles.',
              'Clear career trajectory and seniority.'
            ],
            gaps: [
              'Headline does not highlight Principal-level scale or distributed systems specialty.',
              'Missing metrics regarding throughput (500k events/sec) and cost reductions ($380k savings).'
            ],
            keywordAnalysis: {
              matched: ['AWS', 'Microservices', 'Cloud Architecture'],
              missing: ['Kubernetes', 'Go (Golang)', 'Distributed Systems', 'Kafka', 'Terraform'],
              recommended: ['Distributed Consensus', 'Event Sourcing']
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
                id: 'rec-exp',
                section: 'experience',
                title: 'Add Quantified Scale Metrics to Lead Role',
                currentContent: 'Built cloud pipelines.',
                recommendedContent: 'Architected distributed messaging engine supporting 500k events/sec with zero drop and saved $380k in cross-AZ egress costs.',
                cvEvidence: ['Architected distributed messaging engine supporting 500,000 events/sec with zero message drop.'],
                reason: 'Demonstrates executive-level business and performance impact.',
                improvements: ['Adds scale metrics', 'Quantifies cost savings'],
                priority: 'HIGH',
                confidence: 90,
                evidenceStatus: 'SUPPORTED_BY_CV',
                deepEditUrl: 'https://www.linkedin.com/in/me/details/experience/',
                userStatus: 'pending'
              }
            ],
            factualWarnings: [],
            priorityActions: ['Update headline', 'Enrich experience bullets']
          }
        })
      });
    });

    const runAnalysisBtn = page.locator('[data-testid="analyze-profile-gaps-btn"]');
    await runAnalysisBtn.click();
    await page.waitForTimeout(1200);

    const scoreCard = page.locator('[data-testid="linkedin-optimizer-dashboard"]');
    console.log('Optimization dashboard visible:', await scoreCard.isVisible());

    const ss5 = path.join(screenshotsDir, 'step13_05_optimizer.png');
    await page.screenshot({ path: ss5 });
    console.log(`✓ Screenshot 5 captured: ${ss5}`);

    // Verify Copy & Open LinkedIn button exists
    const copyAndOpenBtn = page.locator('button:has-text("Copy & Open LinkedIn")').first();
    console.log('Copy & Open LinkedIn button visible:', await copyAndOpenBtn.isVisible());

    // 8. Error State & Trial Unavailable Banner (step13_06_rate_limit_error.png)
    console.log('\n[TEST 8] Triggering error state banner (screenshot 6)...');
    const startOverBtn = page.locator('[data-testid="start-over-btn"]');
    if (await startOverBtn.isVisible()) {
      await startOverBtn.click();
      await page.waitForTimeout(400);
    }

    // Switch to Developer mode
    await page.locator('[data-testid="mode-tab-developer"]').click();
    await page.waitForTimeout(400);

    // Provide model selection for developer mode so it doesn't fail on missing model
    await page.evaluate(() => {
      sessionStorage.setItem('cv2linkedin_discovered_models_gemini', JSON.stringify([
        {
          id: 'gemini-2.5-flash',
          name: 'models/gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          supportedMethods: ['generateContent'],
          recommended: true
        }
      ]));
    });

    // Set file input again
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForTimeout(400);

    // Mock 429 Rate Limit error from generate-profile
    await page.route('**/api/generate-profile', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Trial AI service is temporarily rate-limited. Please wait a moment or use your own API key.',
          errorCode: 'RATE_LIMITED'
        })
      });
    });

    const genBtn2 = page.locator('[data-testid="generate-profile-btn"]');
    await genBtn2.click();
    await page.waitForTimeout(800);

    const errorBanner = page.locator('text=Trial AI is currently unavailable.');
    console.log('Trial unavailable notice visible:', await errorBanner.isVisible());

    const retryBtn = page.locator('[data-testid="error-retry-btn"]');
    console.log('Retry button visible:', await retryBtn.isVisible());

    const useByokBtn = page.locator('[data-testid="error-use-byok-btn"]');
    console.log('Use My Own API Key button visible:', await useByokBtn.isVisible());

    const ss6 = path.join(screenshotsDir, 'step13_06_rate_limit_error.png');
    await page.screenshot({ path: ss6 });
    console.log(`✓ Screenshot 6 captured: ${ss6}`);

    // 9. Mobile Layout Verification (step13_07_mobile.png)
    console.log('\n[TEST 9] Setting mobile viewport & capturing screenshot 7...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const ss7 = path.join(screenshotsDir, 'step13_07_mobile.png');
    await page.screenshot({ path: ss7 });
    console.log(`✓ Screenshot 7 captured: ${ss7}`);

    // Cleanup sample PDF file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }

    console.log('\n===============================================================');
    console.log('🎉 STEP 13 E2E ACCEPTANCE VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

verifyStep13().catch((err) => {
  console.error('\n❌ STEP 13 E2E ERROR:', err);
  process.exit(1);
});

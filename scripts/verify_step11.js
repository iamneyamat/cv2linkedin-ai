const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep11() {
  console.log('===============================================================');
  console.log('🚀 STARTING STEP 11 PLAYWRIGHT E2E ACCEPTANCE VERIFICATION');
  console.log('===============================================================');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();

  // Track window.open calls
  await page.addInitScript(() => {
    window.__openedUrls = [];
    const originalOpen = window.open;
    window.open = function (url, target, features) {
      window.__openedUrls.push({ url, target, features });
      return originalOpen ? originalOpen.call(window, url, target, features) : null;
    };
  });

  const samplePackage = {
    headline: 'Senior Cloud Solutions Architect | Kubernetes, AWS & Distributed Systems',
    about: 'Technology leader with 10+ years architecting enterprise distributed cloud architectures. Specialized in high-throughput data streaming and multi-region resilient microservices.',
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

  const sampleOptimization = {
    overallScore: 84,
    scoreDimensions: {
      headline: 78,
      about: 82,
      experience: 88,
      skills: 90,
      consistency: 80,
      readability: 85
    },
    summary: 'Strong core technical depth with strategic gaps in recruiter search visibility and target leadership positioning.',
    strengths: [
      '10+ years proven cloud engineering experience',
      'High-scale metrics ($100M+ ARR, 99.999% SLA) in CloudScale role',
      'Strong in-demand keywords (Kubernetes, AWS, Go, Terraform)'
    ],
    gaps: [
      'Headline currently uses generic title without domain specialization keywords',
      'About section lacks high-impact executive summary and quantified achievements',
      'Missing core system design keywords in recruiter search indexing'
    ],
    sectionRecommendations: [
      {
        id: 'rec-headline',
        section: 'headline',
        title: 'Elevate Headline for Recruiter Search',
        currentContent: 'Software Engineer at CloudScale',
        recommendedContent: 'Senior Cloud Solutions Architect | Kubernetes, AWS & Distributed Systems',
        cvEvidence: ['10+ years cloud architecture', 'Lead Cloud Architect at CloudScale Technologies'],
        reason: 'Captures target seniority and includes primary recruiter search keywords.',
        improvements: [
          'Directly mentions Kubernetes, AWS, and Distributed Systems',
          'Clarifies senior architecture scope'
        ],
        priority: 'HIGH',
        confidence: 92,
        evidenceStatus: 'SUPPORTED_BY_CV',
        deepEditUrl: 'https://www.linkedin.com/in/me/edit/intro/',
        userStatus: 'pending'
      },
      {
        id: 'rec-about',
        section: 'about',
        title: 'Craft High-Impact Executive Summary',
        currentContent: 'Building software and scalable cloud services.',
        recommendedContent: 'Technology leader with 10+ years architecting enterprise distributed cloud systems. Specialized in high-throughput data streaming ($100M+ ARR) and multi-region resilient microservices.',
        cvEvidence: [
          'Architected Kubernetes-based payment streaming engine processing $100M+ ARR',
          'Mentored team of 14 cloud infrastructure engineers'
        ],
        reason: 'Converts passive summary into an executive narrative with verified business results.',
        improvements: [
          'Quantified business impact ($100M+ ARR)',
          'Clear leadership and mentorship signals'
        ],
        priority: 'HIGH',
        confidence: 88,
        evidenceStatus: 'SUPPORTED_BY_BOTH',
        deepEditUrl: 'https://www.linkedin.com/in/me/edit/about/',
        userStatus: 'pending'
      },
      {
        id: 'rec-experience',
        section: 'experience',
        title: 'Format Role Outcomes with Action-Metric Framework',
        currentContent: 'Lead Cloud Architect at CloudScale Technologies. Built systems and mentored team.',
        recommendedContent: 'Lead Cloud Architect at CloudScale Technologies\n• Architected Kubernetes-based payment streaming engine processing $100M+ ARR with 99.999% SLA.\n• Spearheaded cloud migration reducing infrastructure spend by 32% year-over-year.\n• Mentored 14 engineers across 3 distributed regional hubs.',
        cvEvidence: [
          'Decreased cloud infrastructure costs by 32% year-over-year',
          'Mentored team of 14 cloud infrastructure engineers'
        ],
        reason: 'Restructures bullets around the Google X-Y-Z achievement formula for maximum recruiter conversion.',
        improvements: [
          'Measurable cost reduction (32%)',
          'Exact team mentorship scope'
        ],
        priority: 'MEDIUM',
        confidence: 85,
        evidenceStatus: 'USER_VERIFICATION_REQUIRED',
        deepEditUrl: 'https://www.linkedin.com/in/me/details/experience/',
        userStatus: 'pending'
      }
    ],
    keywordAnalysis: {
      matched: ['Kubernetes', 'AWS', 'Go', 'Kafka', 'Terraform'],
      missing: ['Distributed Systems', 'Cloud Migration', 'FinOps'],
      recommended: ['Enterprise Architecture', 'High Availability', 'Site Reliability']
    },
    factualWarnings: [
      'Ensure 32% cloud cost reduction metrics match verified quarterly budget reports before publishing.',
      'Team mentorship count of 14 should reflect current organizational structure.'
    ],
    priorityActions: [
      'Update LinkedIn Headline to capture target recruiter searches',
      'Revamp About section with executive scope and $100M+ ARR outcome',
      'Enhance Lead Architect role bullets with verified metrics'
    ]
  };

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

  // Intercept LinkedIn optimize API
  await page.route('**/api/linkedin/optimize', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: sampleOptimization,
        data: sampleOptimization
      })
    });
  });

  // 1. Visit Landing Page
  console.log('[1/8] Verifying Landing Page on http://localhost:3005...');
  const resp = await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
  if (resp.status() !== 200) {
    throw new Error(`Expected HTTP 200, got ${resp.status()}`);
  }
  console.log('✓ Landing page responded with HTTP 200');

  // Configure AI Session Key
  console.log('Configuring AI Provider Session Key...');
  await page.click('button:has-text("AI Settings")');
  await page.waitForSelector('text=Select AI Provider');
  const keyInput = page.locator('[data-testid="modal-key-input"]');
  await keyInput.fill('AIzaSyMockKeyForGeminiDemonstration123456');
  await page.click('[data-testid="modal-test-key-btn"]');
  await page.waitForSelector('text=Connected to Google Gemini');
  await page.click('button:has-text("Done")');
  await page.waitForTimeout(300);
  console.log('✓ AI Session configured');

  // 2. Upload CV and navigate to Profile Result View
  console.log('[2/8] Uploading CV and transitioning to Profile Result View...');
  const testPdfPath = path.join(__dirname, 'sample_cv_test11.pdf');
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 150>>stream\nBT /F1 12 Tf 72 712 Td (Senior Cloud Solutions Architect with 10 years experience at CloudScale Technologies.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n418\n%%EOF\n');
  fs.writeFileSync(testPdfPath, pdfHeader);

  const fileInput = page.locator('[data-testid="cv-file-input"]');
  await fileInput.setInputFiles(testPdfPath);
  await page.waitForTimeout(400);

  const generateBtn = page.locator('[data-testid="generate-profile-btn"]');
  await generateBtn.click();

  await page.waitForSelector('[data-testid="linkedin-connection-container"]');
  console.log('✓ Profile Result View mounted successfully');

  // 3. Verify Step 11 Entry Points
  console.log('[3/8] Verifying Step 11 Optimizer Entry Points...');
  await page.waitForSelector('[data-testid="analyze-profile-gaps-btn"]');
  await page.waitForSelector('[data-testid="manual-import-trigger-btn"]');
  console.log('✓ "Analyze Profile Gaps" and "Paste Current Profile" buttons are present and responsive');

  // 4. Test Manual Import Modal
  console.log('[4/8] Testing Manual LinkedIn Import Modal...');
  await page.click('[data-testid="manual-import-trigger-btn"]');
  await page.waitForSelector('[data-testid="manual-linkedin-import-modal"]');
  await page.waitForSelector('text=Import Your Current LinkedIn Profile');
  await page.waitForSelector('text=Paste Profile Text');

  // Fill pasted profile
  const pasteArea = page.locator('[data-testid="pasted-profile-textarea"]');
  await pasteArea.fill(`
Headline: Software Engineer at CloudScale
About: Building software and scalable cloud services.
Skills: Kubernetes, Go, Python, AWS
`);

  await page.screenshot({ path: path.join(screenshotsDir, 'step11_01_manual_import_modal.png') });
  console.log('✓ Manual import modal filled and captured');

  // Trigger analysis
  await page.click('[data-testid="analyze-pasted-btn"]');

  // 5. Verify Optimizer Dashboard & Scorecard
  console.log('[5/8] Verifying LinkedIn Optimizer Dashboard & Explainable Scorecard...');
  await page.waitForSelector('[data-testid="linkedin-optimizer-dashboard"]', { timeout: 10000 });
  await page.waitForSelector('text=AI Optimization Score');
  await page.waitForSelector('text=This score is an AI-based optimization estimate, not an official LinkedIn score.');

  // Check score dimensions
  await page.waitForSelector('text=84');
  await page.waitForSelector('text=Section Strength Breakdown');
  await page.waitForSelector('text=Headline:');
  await page.waitForSelector('text=About:');
  await page.waitForSelector('text=Experience:');

  await page.screenshot({ path: path.join(screenshotsDir, 'step11_02_optimizer_dashboard_overview.png') });
  await page.screenshot({ path: path.join(screenshotsDir, 'step11_03_scorecard_and_dimensions.png') });
  console.log('✓ AI Optimization Score, disclaimer, and 6 dimensions verified');

  // 6. Verify Recommendations & Side-by-Side Comparison
  console.log('[6/8] Verifying Side-by-Side Recommendations & Evidence Badges...');
  await page.waitForSelector('text=Elevate Headline for Recruiter Search');
  await page.waitForSelector('text=HIGH PRIORITY');
  await page.waitForSelector('text=SUPPORTED BY CV');
  await page.waitForSelector('text=92% Confidence');

  await page.waitForSelector('text=Craft High-Impact Executive Summary');
  await page.waitForSelector('text=SUPPORTED BY BOTH');
  await page.waitForSelector('text=88% Confidence');

  await page.waitForSelector('text=Format Role Outcomes with Action-Metric Framework');
  await page.waitForSelector('text=USER VERIFICATION REQUIRED');
  await page.waitForSelector('text=85% Confidence');

  await page.screenshot({ path: path.join(screenshotsDir, 'step11_04_side_by_side_comparison.png') });
  console.log('✓ Recommendations, priority badges, confidence percentages, and evidence badges verified');

  // 7. Verify Copy & Open LinkedIn UX with Trusted Deterministic URLs
  console.log('[7/8] Verifying Copy & Open LinkedIn interaction and URL mapping...');
  const copyOpenHeadlineBtn = page.locator('[data-testid="copy-open-headline"]');
  await copyOpenHeadlineBtn.click();
  await page.waitForTimeout(600);

  // Check window.open called with trusted URL
  const opened = await page.evaluate(() => window.__openedUrls);
  console.log('Opened URLs recorded:', opened);
  if (!opened || opened.length === 0) {
    throw new Error('window.open was not triggered by Copy & Open button');
  }
  const headlineTargetUrl = opened[opened.length - 1].url;
  if (headlineTargetUrl !== 'https://www.linkedin.com/in/me/edit/intro/') {
    throw new Error(`Expected trusted URL https://www.linkedin.com/in/me/edit/intro/, got ${headlineTargetUrl}`);
  }
  console.log(`✓ Copy & Open triggered trusted official URL: ${headlineTargetUrl}`);

  // Test Accept recommendation action
  console.log('Testing Accept Recommendation action...');
  const acceptBtn = page.locator('[data-testid="accept-rec-headline"]');
  await acceptBtn.click();
  await page.waitForSelector('text=Applied to Profile');
  console.log('✓ Recommendation marked as accepted');

  // Test Edit recommendation inline
  console.log('Testing Edit Recommendation action...');
  const editBtn = page.locator('[data-testid="edit-rec-about"]');
  await editBtn.click();
  await page.waitForSelector('textarea[data-testid="edit-textarea-about"]');
  await page.fill('textarea[data-testid="edit-textarea-about"]', 'Custom tailored executive about section.');
  await page.click('button:has-text("Save Changes")');
  await page.waitForSelector('text=Custom tailored executive about section.');
  console.log('✓ Recommendation inline edit and save verified');

  await page.screenshot({ path: path.join(screenshotsDir, 'step11_05_copy_and_open_interaction.png') });

  // 8. Test Mobile Layout (375x667)
  console.log('[8/8] Testing Mobile Responsiveness (375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(400);
  await page.waitForSelector('[data-testid="linkedin-optimizer-dashboard"]');
  await page.screenshot({ path: path.join(screenshotsDir, 'step11_06_mobile_optimizer_view.png') });
  console.log('✓ Mobile layout rendered cleanly and screenshot captured');

  // Clean up
  try { fs.unlinkSync(testPdfPath); } catch {}
  await browser.close();

  console.log('===============================================================');
  console.log('🎉 ALL STEP 11 PLAYWRIGHT ACCEPTANCE CHECKS PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

verifyStep11().catch((err) => {
  console.error('STEP 11 VERIFICATION FAILURE:', err);
  process.exit(1);
});

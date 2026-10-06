import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatProfileMarkdown,
  formatProfileJson,
  generatePrintableHtml,
  sanitizeProfileExport
} from './profile-export.ts';
import type { LinkedInProfilePackage } from '../../types/index.ts';

const mockProfile: LinkedInProfilePackage = {
  headline: 'Principal Distributed Systems Architect | Cloud-Native Infrastructure & Go',
  about: 'Senior engineering leader with 12+ years designing mission-critical distributed systems across multi-region Kubernetes clusters.',
  experience: [
    {
      company: 'Nexus Scale Labs',
      role: 'Principal Systems Architect',
      location: 'San Francisco, CA',
      dates: '2021 - Present',
      bullets: [
        'Architected distributed messaging engine supporting 500,000 events/sec with sub-5ms latency.',
        'Mentored team of 14 senior engineers across distributed consensus and fault-tolerance patterns.'
      ]
    },
    {
      company: 'HyperCloud Solutions',
      role: 'Senior Cloud Engineer',
      dates: '2017 - 2021',
      bullets: [
        'Migrated 40+ legacy monolith services to containerized microservices on AWS EKS.'
      ]
    }
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      degree: 'B.S. in Computer Science',
      dates: '2013 - 2017'
    }
  ],
  skills: ['Distributed Systems', 'Go (Golang)', 'Kubernetes', 'Apache Kafka', 'AWS', 'Terraform'],
  certifications: ['AWS Certified Solutions Architect - Professional', 'Certified Kubernetes Administrator (CKA)'],
  projects: [
    {
      name: 'RaftMesh',
      description: 'Open-source distributed consensus engine implementing Raft protocol in Go.',
      technologies: ['Go', 'gRPC', 'Protobuf']
    }
  ],
  achievements: [
    'Speaker at GopherCon on Distributed Consensus in Cloud Systems',
    'Reduced cloud infrastructure expenditure by $1.2M annually'
  ],
  suggestedKeywords: ['Distributed Systems', 'Cloud Architecture', 'Go', 'Kubernetes']
};

test('1. Markdown export formats clean, structured Markdown without UI metadata', () => {
  const md = formatProfileMarkdown(mockProfile);
  
  assert.ok(md.includes('# LinkedIn Profile Package'), 'Must include main title');
  assert.ok(md.includes('## Headline\n\nPrincipal Distributed Systems Architect'), 'Must format headline');
  assert.ok(md.includes('## About / Summary\n\nSenior engineering leader'), 'Must format about');
  assert.ok(md.includes('## Experience\n\n### Principal Systems Architect — Nexus Scale Labs'), 'Must format experience');
  assert.ok(md.includes('**San Francisco, CA** | 2021 - Present'), 'Must include location and dates');
  assert.ok(md.includes('- Architected distributed messaging engine'), 'Must format bullets');
  assert.ok(md.includes('## Education\n\n- **B.S. in Computer Science** — University of California, Berkeley (2013 - 2017)'), 'Must format education');
  assert.ok(md.includes('## Skills\n\n- Distributed Systems\n- Go (Golang)'), 'Must format skills');
  assert.ok(md.includes('## Certifications\n\n- AWS Certified Solutions Architect - Professional'), 'Must format certifications');
  assert.ok(md.includes('## Projects\n\n### RaftMesh'), 'Must format projects');
  assert.ok(md.includes('## Key Achievements\n\n- Speaker at GopherCon'), 'Must format achievements');
  
  // Verify no UI or debug metadata
  assert.equal(md.includes('userStatus'), false);
  assert.equal(md.includes('deepEditUrl'), false);
  assert.equal(md.includes('button'), false);
});

test('2. Markdown export includes optimization summary when provided', () => {
  const summary = 'Profile optimized to highlight distributed architecture leadership.';
  const md = formatProfileMarkdown(mockProfile, summary);
  
  assert.ok(md.includes('## Optimization Summary\n\n' + summary));
});

test('3. JSON export creates sanitized and valid JSON without credentials', () => {
  const jsonStr = formatProfileJson(mockProfile, 'Optimization note');
  const parsed = JSON.parse(jsonStr);
  
  assert.equal(parsed.headline, mockProfile.headline);
  assert.equal(parsed.about, mockProfile.about);
  assert.equal(parsed.experience.length, 2);
  assert.equal(parsed.skills.length, 6);
  assert.equal(parsed.optimizationSummary, 'Optimization note');
  
  // Ensure no sensitive or internal fields
  assert.equal(parsed.apiKey, undefined);
  assert.equal(parsed.accessToken, undefined);
  assert.equal(parsed.access_token, undefined);
  assert.equal(parsed.session, undefined);
});

test('4. Printable HTML generates clean A4 document with @media print styling', () => {
  const html = generatePrintableHtml(mockProfile);
  
  assert.ok(html.includes('<!DOCTYPE html>'), 'Must be valid HTML5');
  assert.ok(html.includes('@media print'), 'Must include print media stylesheet');
  assert.ok(html.includes('@page') && html.includes('size: A4;'), 'Must specify A4 print page geometry');
  assert.ok(html.includes('Principal Distributed Systems Architect'), 'Must contain headline');
  assert.ok(html.includes('Nexus Scale Labs'), 'Must contain experience company');
  assert.ok(html.includes('window.print()'), 'Must include print trigger capability');
  
  // Verify no secrets or debug headers
  assert.equal(html.includes('authorization'), false);
  assert.equal(html.includes('client_secret'), false);
});

test('5. Missing profile sections are omitted cleanly without fabricating placeholder data', () => {
  const sparseProfile: LinkedInProfilePackage = {
    headline: 'Frontend Engineer',
    about: 'Passionate about clean UI design.',
    experience: [],
    education: [],
    skills: ['TypeScript', 'React'],
    certifications: [],
    projects: [],
    achievements: [],
    suggestedKeywords: []
  };

  const md = formatProfileMarkdown(sparseProfile);
  assert.ok(md.includes('## Headline'));
  assert.ok(md.includes('## About / Summary'));
  assert.ok(md.includes('## Skills'));
  assert.equal(md.includes('## Experience'), false, 'Empty experience should be omitted');
  assert.equal(md.includes('## Education'), false, 'Empty education should be omitted');
  assert.equal(md.includes('## Certifications'), false, 'Empty certifications should be omitted');
  assert.equal(md.includes('## Projects'), false, 'Empty projects should be omitted');
  assert.equal(md.includes('## Key Achievements'), false, 'Empty achievements should be omitted');
  assert.equal(md.includes('TBD'), false);
  assert.equal(md.includes('undefined'), false);
});

test('6. Secret exclusion strictly purges accidental keys or tokens', () => {
  const taintedObj = {
    ...mockProfile,
    apiKey: 'sk-secret-gemini-key',
    access_token: 'oauth-token-12345',
    refresh_token: 'refresh-token-xyz',
    client_secret: 'client-secret-999',
    password: 'password123',
    authorization: 'Bearer token'
  };

  const sanitized = sanitizeProfileExport(taintedObj as any);
  assert.equal((sanitized as any).apiKey, undefined);
  assert.equal((sanitized as any).access_token, undefined);
  assert.equal((sanitized as any).refresh_token, undefined);
  assert.equal((sanitized as any).client_secret, undefined);
  assert.equal((sanitized as any).password, undefined);
  assert.equal((sanitized as any).authorization, undefined);
  
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes('sk-secret-gemini-key'), false);
  assert.equal(serialized.includes('oauth-token-12345'), false);
});

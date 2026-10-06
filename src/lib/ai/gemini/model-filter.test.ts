import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterGeminiModels,
  selectRecommendedModel
} from './model-filter.ts';
import type { GeminiRawModel } from './model-filter.ts';

test('filterGeminiModels filters out non-text and incompatible models', () => {
  const rawList: GeminiRawModel[] = [
    {
      name: 'models/gemini-future-flash',
      displayName: 'Gemini Future Flash',
      description: 'Next-gen fast text model',
      supportedGenerationMethods: ['generateContent', 'countTokens']
    },
    {
      name: 'models/text-embedding-004',
      displayName: 'Text Embedding 004',
      description: 'Embedding only',
      supportedGenerationMethods: ['embedContent']
    },
    {
      name: 'models/imagen-3.0-generate-002',
      displayName: 'Imagen 3',
      description: 'Image generation model',
      supportedGenerationMethods: ['imageGeneration']
    },
    {
      name: 'models/gemini-tts-speech',
      displayName: 'Gemini TTS Speech',
      description: 'Audio speech model',
      supportedGenerationMethods: ['generateContent']
    },
    {
      name: 'models/aqa',
      displayName: 'Attributed Question Answering',
      description: 'Academic specialized model',
      supportedGenerationMethods: ['generateAnswer']
    },
    {
      name: 'models/gemini-future-pro',
      displayName: 'Gemini Future Pro',
      description: 'Next-gen reasoning model',
      supportedGenerationMethods: ['generateContent']
    }
  ];

  const filtered = filterGeminiModels(rawList);

  // Should only keep the compatible text models
  assert.equal(filtered.length, 2);
  const ids = filtered.map(m => m.id);
  assert.ok(ids.includes('gemini-future-flash'));
  assert.ok(ids.includes('gemini-future-pro'));
  assert.ok(!ids.includes('text-embedding-004'));
  assert.ok(!ids.includes('imagen-3.0-generate-002'));
  assert.ok(!ids.includes('gemini-tts-speech'));
  assert.ok(!ids.includes('aqa'));
});

test('selectRecommendedModel generically prioritizes Flash text models without hardcoding names', () => {
  const models = filterGeminiModels([
    {
      name: 'models/gemini-9.0-pro',
      displayName: 'Gemini 9.0 Pro',
      supportedGenerationMethods: ['generateContent']
    },
    {
      name: 'models/gemini-9.0-flash',
      displayName: 'Gemini 9.0 Flash',
      supportedGenerationMethods: ['generateContent']
    },
    {
      name: 'models/gemini-9.0-flash-lite',
      displayName: 'Gemini 9.0 Flash-Lite',
      supportedGenerationMethods: ['generateContent']
    }
  ]);

  const recommendedId = selectRecommendedModel(models);

  // Without hardcoding 9.0, it should recognize flash over flash-lite and pro
  assert.equal(recommendedId, 'gemini-9.0-flash');

  const topModel = models.find(m => m.id === recommendedId);
  assert.ok(topModel?.recommended);
});

test('selectRecommendedModel prioritizes newer versions generically when multiple Flash models exist', () => {
  const models = filterGeminiModels([
    {
      name: 'models/gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      supportedGenerationMethods: ['generateContent']
    },
    {
      name: 'models/gemini-4.0-flash',
      displayName: 'Gemini 4.0 Flash',
      supportedGenerationMethods: ['generateContent']
    }
  ]);

  const recommendedId = selectRecommendedModel(models);
  assert.equal(recommendedId, 'gemini-4.0-flash');
});

test('selectRecommendedModel falls back gracefully to first compatible model when no flash model exists', () => {
  const models = filterGeminiModels([
    {
      name: 'models/custom-text-model',
      displayName: 'Custom Text Model',
      supportedGenerationMethods: ['generateContent']
    }
  ]);

  const recommendedId = selectRecommendedModel(models);
  assert.equal(recommendedId, 'custom-text-model');
});

test('filterGeminiModels returns empty array when no models support generateContent', () => {
  const models = filterGeminiModels([
    {
      name: 'models/text-embedding-004',
      displayName: 'Embedding',
      supportedGenerationMethods: ['embedContent']
    }
  ]);

  assert.equal(models.length, 0);
  const recommendedId = selectRecommendedModel(models);
  assert.equal(recommendedId, undefined);
});

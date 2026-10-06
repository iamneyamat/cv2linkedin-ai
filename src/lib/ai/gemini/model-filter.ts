/**
 * Centralized Gemini Model Filtering & Generic Recommendation Engine.
 * 
 * Future-proof: Operates dynamically on API metadata without hardcoding specific model IDs.
 */

export interface GeminiRawModel {
  name: string; // Resource name, e.g. "models/gemini-..."
  version?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface DiscoveredModel {
  id: string; // Stripped ID, e.g. "gemini-..."
  name: string; // Full resource name
  displayName: string;
  description?: string;
  supportedMethods: string[];
  recommended?: boolean;
  badge?: string;
  category?: 'flash' | 'flash-lite' | 'pro' | 'standard';
}

/**
 * Filter raw models returned from Google Gemini API to only include
 * text-generation models suitable for CV processing & LinkedIn profile generation.
 */
export function filterGeminiModels(rawModels: GeminiRawModel[]): DiscoveredModel[] {
  if (!Array.isArray(rawModels)) return [];

  // Excluded model patterns (embedding, image generation, speech/audio, specialized)
  const excludedPatterns = [
    /embed/i,
    /imagen/i,
    /(\b|_|-)(tts|whisper|speech|audio|live|realtime)(\b|_|-)/i,
    /(\b|_|-)(aqa|learnlm|medlm)(\b|_|-)/i,
    /deprecated|legacy|shutdown/i
  ];

  const compatible: DiscoveredModel[] = [];

  for (const raw of rawModels) {
    if (!raw.name) continue;

    // Clean model ID by stripping "models/" prefix
    const id = raw.name.replace(/^models\//, '').trim();
    const displayName = raw.displayName || id;
    const methods = raw.supportedGenerationMethods || [];

    // 1. Must support generateContent for structured text generation
    if (!methods.includes('generateContent')) {
      continue;
    }

    // 2. Exclude non-text, specialized, or incompatible models
    const fullNameAndId = `${id} ${displayName}`;
    const isExcluded = excludedPatterns.some(pattern => pattern.test(fullNameAndId));
    if (isExcluded) {
      continue;
    }

    // 3. Determine category & badge generically
    let category: DiscoveredModel['category'] = 'standard';
    let badge = 'Available for your API key';

    const isLite = /lite/i.test(id) || /lite/i.test(displayName);
    const isFlash = /flash/i.test(id) || /flash/i.test(displayName);
    const isPro = /pro/i.test(id) || /pro/i.test(displayName);

    if (isFlash && isLite) {
      category = 'flash-lite';
      badge = 'Fast & Efficient';
    } else if (isFlash) {
      category = 'flash';
      badge = 'Fast • Recommended';
    } else if (isPro) {
      category = 'pro';
      badge = 'Advanced Reasoning';
    }

    compatible.push({
      id,
      name: raw.name,
      displayName,
      description: raw.description,
      supportedMethods: methods,
      category,
      badge
    });
  }

  // 4. Rank models dynamically using generic metadata
  compatible.sort((a, b) => scoreModel(b) - scoreModel(a));

  // 5. Mark the top recommended model
  if (compatible.length > 0) {
    const recommendedId = selectRecommendedModel(compatible);
    if (recommendedId) {
      for (const m of compatible) {
        if (m.id === recommendedId) {
          m.recommended = true;
          m.badge = 'Fast • Recommended';
        } else {
          m.recommended = false;
        }
      }
    }
  }

  return compatible;
}

/**
 * Generic scoring function:
 * Higher score = higher preference for default selection.
 * Never relies on hardcoded model names.
 */
function scoreModel(model: DiscoveredModel): number {
  let score = 0;
  const target = `${model.id} ${model.displayName}`.toLowerCase();

  // Tier 1: Flash models (ideal balance of speed, cost/quota, and token limits)
  if (model.category === 'flash') {
    score += 100;
  } else if (model.category === 'flash-lite') {
    score += 60;
  } else if (model.category === 'pro') {
    score += 40;
  } else {
    score += 10;
  }

  // Version extraction: generically reward higher version numbers (e.g., 2.5 > 2.0 > 1.5 > 1.0)
  const versionMatch = target.match(/(\d+(?:\.\d+)?)/);
  if (versionMatch && versionMatch[1]) {
    const versionNum = parseFloat(versionMatch[1]);
    if (!isNaN(versionNum)) {
      score += versionNum * 10;
    }
  }

  // Mild penalty for experimental / preview / thinking suffixes when stable variants exist
  if (/(-exp|experimental|preview|thinking)/i.test(target)) {
    score -= 5;
  }

  return score;
}

/**
 * Select the single best recommended model ID from a filtered list.
 * Future-proof & generic: uses metadata ranking.
 */
export function selectRecommendedModel(models: DiscoveredModel[]): string | undefined {
  if (!models || models.length === 0) return undefined;

  let bestModel = models[0];
  let highestScore = scoreModel(bestModel);

  for (let i = 1; i < models.length; i++) {
    const currentScore = scoreModel(models[i]);
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestModel = models[i];
    }
  }

  return bestModel.id;
}

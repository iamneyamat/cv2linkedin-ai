import type { AIProvider, AIProviderConfig, KeyValidationResult, NormalizedAIError } from '../types.ts';
import type { DiscoveredModel } from '../../../types/index.ts';
import {
  buildLinkedInProfilePrompt,
  validateAndNormalizeProfileOutput
} from '../prompts/linkedin-profile.ts';
import type { LinkedInProfilePackage } from '../../../types/index.ts';

function sanitizeError(msg: string, keyToScrub?: string): string {
  let clean = msg || '';
  if (keyToScrub && keyToScrub.length > 3) {
    clean = clean.split(keyToScrub).join('[REDACTED]');
  }
  clean = clean.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  clean = clean.replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  return clean;
}

// Patterns of models that are not designed for general chat completions
const EXCLUDED_MODEL_PATTERNS = [
  'embedding',
  'whisper',
  'tts',
  'dall-e',
  'moderation',
  'davinci',
  'babbage',
  'realtime',
  'audio',
  'search',
  'similarity'
];

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;
  readonly name = 'OpenAI';
  readonly description = 'Industry-standard GPT and reasoning models from OpenAI.';
  readonly docUrl = 'https://platform.openai.com/api-keys';

  normalizeError(error: unknown): NormalizedAIError {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const code = (error as unknown as { code?: string })?.code || 'AI_ERROR';

    if (code === 'MISSING_API_KEY' || code === 'NO_API_KEY') {
      return { error: 'Please enter your OpenAI API key.', errorCode: 'NO_API_KEY', statusCode: 400 };
    }
    if (code === 'INVALID_KEY' || code === 'INVALID_API_KEY') {
      return { error: 'Invalid OpenAI API key. Please check your credentials at platform.openai.com.', errorCode: 'INVALID_API_KEY', statusCode: 401 };
    }
    if (code === 'RATE_LIMITED' || code === 'RATE_LIMIT') {
      return { error: 'OpenAI API rate limit or credit quota reached. Please check your billing details at platform.openai.com.', errorCode: 'RATE_LIMIT', statusCode: 429 };
    }
    if (code === 'INVALID_MODEL' || code === 'UNAVAILABLE_MODEL' || code === 'NO_COMPATIBLE_MODELS') {
      return { error: sanitizeError(rawMsg), errorCode: 'INVALID_MODEL', statusCode: 400 };
    }
    if (code === 'NETWORK_ERROR') {
      return { error: sanitizeError(rawMsg), errorCode: 'NETWORK_ERROR', statusCode: 503 };
    }

    return { error: sanitizeError(rawMsg) || 'OpenAI service encountered an unexpected error.', errorCode: 'AI_ERROR', statusCode: 500 };
  }

  async discoverModels(config: AIProviderConfig): Promise<DiscoveredModel[]> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please enter your OpenAI API key.');
      (err as unknown as { code: string }).code = 'MISSING_API_KEY';
      throw err;
    }

    const endpoint = 'https://api.openai.com/v1/models';

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (networkErr: unknown) {
      const rawMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const cleanMsg = sanitizeError(rawMsg, apiKey);
      const err = new Error(`OpenAI service is temporarily unreachable: ${cleanMsg}`);
      (err as unknown as { code: string }).code = 'NETWORK_ERROR';
      throw err;
    }

    if (!response.ok) {
      let rawDetail = '';
      try {
        const errorJson = await response.json();
        rawDetail = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        rawDetail = await response.text();
      }

      const errorDetail = sanitizeError(rawDetail, apiKey);
      const lower = errorDetail.toLowerCase();

      if (response.status === 401 || lower.includes('invalid_api_key') || lower.includes('incorrect api key')) {
        const err = new Error('Invalid OpenAI API key.');
        (err as unknown as { code: string }).code = 'INVALID_KEY';
        throw err;
      }

      if (response.status === 429 || lower.includes('insufficient_quota') || lower.includes('rate_limit')) {
        const err = new Error('OpenAI API quota or rate limit exceeded.');
        (err as unknown as { code: string }).code = 'RATE_LIMITED';
        throw err;
      }

      if (response.status >= 500) {
        const err = new Error('OpenAI service is temporarily unavailable.');
        (err as unknown as { code: string }).code = 'NETWORK_ERROR';
        throw err;
      }

      const err = new Error(`OpenAI request failed (${response.status}): ${errorDetail}`);
      (err as unknown as { code: string }).code = 'INVALID_KEY';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawList: Array<{ id: string }> = Array.isArray(data?.data) ? data.data : [];

    // Filter out non-chat models
    const compatible = rawList
      .filter(m => {
        const idLower = m.id.toLowerCase();
        return !EXCLUDED_MODEL_PATTERNS.some(pat => idLower.includes(pat));
      })
      .map(m => {
        const id = m.id;
        const idLower = id.toLowerCase();

        let category: 'flash-lite' | 'pro' | 'reasoner' | 'standard' = 'standard';
        let badge = 'Standard';

        if (idLower.includes('mini') || idLower.includes('flash') || idLower.includes('small') || idLower.includes('nano')) {
          category = 'flash-lite';
          badge = 'Fast / Efficient';
        } else if (idLower.includes('o1') || idLower.includes('o3') || idLower.includes('reason')) {
          category = 'reasoner';
          badge = 'Reasoning';
        } else if (idLower.includes('gpt-4') || idLower.includes('pro')) {
          category = 'pro';
          badge = 'High Capability';
        }

        return {
          id,
          name: id,
          displayName: id,
          supportedMethods: ['chat.completions'],
          category,
          badge,
          recommended: false
        };
      });

    if (compatible.length === 0) {
      const err = new Error('No compatible chat models found for this OpenAI API key.');
      (err as unknown as { code: string }).code = 'NO_COMPATIBLE_MODELS';
      throw err;
    }

    // Recommendation logic without hardcoded model names:
    // 1. Prefer a fast / lightweight model if one exists
    // 2. Otherwise pick the first model in the list
    const fastModel = compatible.find(m => m.category === 'flash-lite');
    const recommendedModel = fastModel || compatible[0];
    if (recommendedModel) {
      recommendedModel.recommended = true;
    }

    // Sort: recommended first, then flash-lite, then pro, then reasoner, then others
    compatible.sort((a, b) => {
      if (a.recommended) return -1;
      if (b.recommended) return 1;
      const order = { 'flash-lite': 1, pro: 2, reasoner: 3, standard: 4, chat: 5 };
      return (order[a.category as keyof typeof order] || 5) - (order[b.category as keyof typeof order] || 5);
    });

    return compatible;
  }

  async validateKey(config: AIProviderConfig): Promise<KeyValidationResult> {
    const models = await this.discoverModels(config);
    const recommended = models.find(m => m.recommended) || models[0];

    return {
      valid: true,
      provider: 'openai',
      model: recommended?.id,
      message: `Connected to OpenAI! Found ${models.length} model${models.length === 1 ? '' : 's'} available for your API key.`,
      models
    };
  }

  async generateLinkedInProfile(cvText: string, config: AIProviderConfig): Promise<LinkedInProfilePackage> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please configure and test your OpenAI API key first.');
      (err as unknown as { code: string }).code = 'NO_API_KEY';
      throw err;
    }

    const model = config.model?.trim();
    if (!model) {
      const err = new Error('Please select an available OpenAI model.');
      (err as unknown as { code: string }).code = 'INVALID_MODEL';
      throw err;
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const { systemInstruction, userPrompt } = buildLinkedInProfilePrompt(cvText);

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const cleanMsg = sanitizeError(msg, apiKey);
      const err = new Error(`Network failure connecting to OpenAI: ${cleanMsg}`);
      (err as unknown as { code: string }).code = 'NETWORK_ERROR';
      throw err;
    }

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }

      const cleanDetail = sanitizeError(errorDetail, apiKey);
      const lowerDetail = cleanDetail.toLowerCase();

      if (response.status === 401 || lowerDetail.includes('invalid_api_key')) {
        const err = new Error('Invalid OpenAI API key. Please check your credentials at platform.openai.com.');
        (err as unknown as { code: string }).code = 'INVALID_API_KEY';
        throw err;
      }

      if (response.status === 404 || lowerDetail.includes('model_not_found') || lowerDetail.includes('does not exist')) {
        const err = new Error(`The selected model "${model}" is unavailable for your OpenAI account. Please click "Refresh Models" in AI Settings.`);
        (err as unknown as { code: string }).code = 'UNAVAILABLE_MODEL';
        throw err;
      }

      if (response.status === 429 || lowerDetail.includes('insufficient_quota') || lowerDetail.includes('rate_limit')) {
        const err = new Error('OpenAI API rate limit or quota exceeded. Please check your billing at platform.openai.com.');
        (err as unknown as { code: string }).code = 'RATE_LIMIT';
        throw err;
      }

      const err = new Error(`Could not generate the profile. OpenAI responded with error (${response.status}): ${cleanDetail}`);
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      const err = new Error('OpenAI returned an empty response. Please try again with a clearer CV.');
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }

    try {
      return validateAndNormalizeProfileOutput(rawContent);
    } catch (normErr: unknown) {
      const msg = normErr instanceof Error ? normErr.message : 'AI returned an invalid profile format. Please try again.';
      const err = new Error(msg);
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }
  }
}

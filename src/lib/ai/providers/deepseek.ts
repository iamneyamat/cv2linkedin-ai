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

export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek' as const;
  readonly name = 'DeepSeek';
  readonly description = 'High-efficiency general and reasoning models from DeepSeek.';
  readonly docUrl = 'https://platform.deepseek.com/api_keys';

  normalizeError(error: unknown): NormalizedAIError {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const code = (error as unknown as { code?: string })?.code || 'AI_ERROR';

    if (code === 'MISSING_API_KEY' || code === 'NO_API_KEY') {
      return { error: 'Please enter your DeepSeek API key.', errorCode: 'NO_API_KEY', statusCode: 400 };
    }
    if (code === 'INVALID_KEY' || code === 'INVALID_API_KEY') {
      return { error: 'Invalid DeepSeek API key. Please check your credentials at platform.deepseek.com.', errorCode: 'INVALID_API_KEY', statusCode: 401 };
    }
    if (code === 'RATE_LIMITED' || code === 'RATE_LIMIT') {
      return { error: 'DeepSeek rate limit or balance quota reached. Please check your balance at platform.deepseek.com.', errorCode: 'RATE_LIMIT', statusCode: 429 };
    }
    if (code === 'INVALID_MODEL' || code === 'UNAVAILABLE_MODEL' || code === 'NO_COMPATIBLE_MODELS') {
      return { error: sanitizeError(rawMsg), errorCode: 'INVALID_MODEL', statusCode: 400 };
    }
    if (code === 'NETWORK_ERROR') {
      return { error: sanitizeError(rawMsg), errorCode: 'NETWORK_ERROR', statusCode: 503 };
    }

    return { error: sanitizeError(rawMsg) || 'DeepSeek service encountered an unexpected error.', errorCode: 'AI_ERROR', statusCode: 500 };
  }

  async discoverModels(config: AIProviderConfig): Promise<DiscoveredModel[]> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please enter your DeepSeek API key.');
      (err as unknown as { code: string }).code = 'MISSING_API_KEY';
      throw err;
    }

    const endpoint = 'https://api.deepseek.com/models';

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
      const err = new Error(`DeepSeek service is temporarily unreachable: ${cleanMsg}`);
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

      if (response.status === 401 || lower.includes('invalid_api_key') || lower.includes('authentication')) {
        const err = new Error('Invalid DeepSeek API key.');
        (err as unknown as { code: string }).code = 'INVALID_KEY';
        throw err;
      }

      if (response.status === 402 || response.status === 429 || lower.includes('insufficient_balance') || lower.includes('rate limit')) {
        const err = new Error('DeepSeek API quota or balance limit reached.');
        (err as unknown as { code: string }).code = 'RATE_LIMITED';
        throw err;
      }

      if (response.status >= 500) {
        const err = new Error('DeepSeek service is temporarily unavailable.');
        (err as unknown as { code: string }).code = 'NETWORK_ERROR';
        throw err;
      }

      const err = new Error(`DeepSeek request failed (${response.status}): ${errorDetail}`);
      (err as unknown as { code: string }).code = 'INVALID_KEY';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawList: Array<{ id: string }> = Array.isArray(data?.data) ? data.data : [];

    // Map models from the provider response
    // DeepSeek API typically returns { id: "deepseek-chat" }, { id: "deepseek-reasoner" }
    const compatible: DiscoveredModel[] = rawList.map(m => {
      const id = m.id;
      const idLower = id.toLowerCase();

      let displayName = id;
      let category: 'chat' | 'reasoner' | 'standard' = 'standard';
      let badge = 'General';
      let isRecommended = false;

      if (idLower.includes('chat')) {
        displayName = 'DeepSeek Chat';
        category = 'chat';
        badge = 'General Chat';
        isRecommended = true; // Recommend deepseek-chat for structured JSON generation
      } else if (idLower.includes('reasoner')) {
        displayName = 'DeepSeek Reasoner';
        category = 'reasoner';
        badge = 'Reasoning';
        isRecommended = false;
      }

      return {
        id,
        name: id,
        displayName,
        supportedMethods: ['chat.completions'],
        category,
        badge,
        recommended: isRecommended
      };
    });

    if (compatible.length === 0) {
      const err = new Error('No models found for this DeepSeek API key.');
      (err as unknown as { code: string }).code = 'NO_COMPATIBLE_MODELS';
      throw err;
    }

    // Ensure at least one model is recommended
    if (!compatible.some(m => m.recommended)) {
      compatible[0].recommended = true;
    }

    // Sort: recommended first
    compatible.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));

    return compatible;
  }

  async validateKey(config: AIProviderConfig): Promise<KeyValidationResult> {
    const models = await this.discoverModels(config);
    const recommended = models.find(m => m.recommended) || models[0];

    return {
      valid: true,
      provider: 'deepseek',
      model: recommended?.id,
      message: `Connected to DeepSeek! Found ${models.length} model${models.length === 1 ? '' : 's'} available for your API key.`,
      models
    };
  }

  async generateLinkedInProfile(cvText: string, config: AIProviderConfig): Promise<LinkedInProfilePackage> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please configure and test your DeepSeek API key first.');
      (err as unknown as { code: string }).code = 'NO_API_KEY';
      throw err;
    }

    const model = config.model?.trim();
    if (!model) {
      const err = new Error('Please select an available DeepSeek model.');
      (err as unknown as { code: string }).code = 'INVALID_MODEL';
      throw err;
    }

    const endpoint = 'https://api.deepseek.com/chat/completions';
    const { systemInstruction, userPrompt } = buildLinkedInProfilePrompt(cvText);

    const isReasoner = model.toLowerCase().includes('reasoner');

    // DeepSeek chat vs reasoner body: reasoner does not support temperature in beta
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ]
    };

    if (!isReasoner) {
      requestBody.temperature = 0.2;
      requestBody.response_format = { type: 'json_object' };
    }

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
      const err = new Error(`Network failure connecting to DeepSeek: ${cleanMsg}`);
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
        const err = new Error('Invalid DeepSeek API key. Please check your credentials at platform.deepseek.com.');
        (err as unknown as { code: string }).code = 'INVALID_API_KEY';
        throw err;
      }

      if (response.status === 402 || lowerDetail.includes('insufficient_balance')) {
        const err = new Error('DeepSeek account balance is insufficient. Please recharge your balance at platform.deepseek.com.');
        (err as unknown as { code: string }).code = 'RATE_LIMIT';
        throw err;
      }

      if (response.status === 404 || lowerDetail.includes('model_not_found')) {
        const err = new Error(`The selected model "${model}" is unavailable. Please click "Refresh Models" in AI Settings.`);
        (err as unknown as { code: string }).code = 'UNAVAILABLE_MODEL';
        throw err;
      }

      if (response.status === 429 || lowerDetail.includes('rate limit')) {
        const err = new Error('DeepSeek API rate limit reached. Please wait a moment and try again.');
        (err as unknown as { code: string }).code = 'RATE_LIMIT';
        throw err;
      }

      const err = new Error(`Could not generate the profile. DeepSeek responded with error (${response.status}): ${cleanDetail}`);
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      const err = new Error('DeepSeek returned an empty response. Please try again with a clearer CV.');
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

import type { AIProvider, AIProviderConfig, KeyValidationResult, NormalizedAIError } from '../types.ts';
import { filterGeminiModels } from '../gemini/model-filter.ts';
import type { GeminiRawModel, DiscoveredModel } from '../gemini/model-filter.ts';
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
  clean = clean.replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  clean = clean.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
  return clean;
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const;
  readonly name = 'Google Gemini';
  readonly description = 'High-speed multimodal and reasoning models from Google AI Studio.';
  readonly docUrl = 'https://aistudio.google.com/app/apikey';

  normalizeError(error: unknown): NormalizedAIError {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const code = (error as unknown as { code?: string })?.code || 'AI_ERROR';

    if (code === 'MISSING_API_KEY' || code === 'NO_API_KEY') {
      return { error: 'Please enter your Gemini API key.', errorCode: 'NO_API_KEY', statusCode: 400 };
    }
    if (code === 'INVALID_KEY' || code === 'INVALID_API_KEY') {
      return { error: 'Invalid Gemini API key. Please verify your credentials at Google AI Studio.', errorCode: 'INVALID_API_KEY', statusCode: 401 };
    }
    if (code === 'RATE_LIMITED' || code === 'RATE_LIMIT') {
      return { error: 'Gemini rate limit or quota reached (15 RPM free tier limit). Please wait a few moments and try again.', errorCode: 'RATE_LIMIT', statusCode: 429 };
    }
    if (code === 'INVALID_MODEL' || code === 'UNAVAILABLE_MODEL' || code === 'NO_COMPATIBLE_MODELS') {
      return { error: sanitizeError(rawMsg), errorCode: 'INVALID_MODEL', statusCode: 400 };
    }
    if (code === 'NETWORK_ERROR') {
      return { error: sanitizeError(rawMsg), errorCode: 'NETWORK_ERROR', statusCode: 503 };
    }

    return { error: sanitizeError(rawMsg) || 'Gemini service encountered an unexpected error.', errorCode: 'AI_ERROR', statusCode: 500 };
  }

  async discoverModels(config: AIProviderConfig): Promise<DiscoveredModel[]> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please enter your Gemini API key.');
      (err as unknown as { code: string }).code = 'MISSING_API_KEY';
      throw err;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      response = await fetch(endpoint, { method: 'GET' });
    } catch (networkErr: unknown) {
      const rawMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const cleanMsg = sanitizeError(rawMsg, apiKey);
      const err = new Error(`Gemini service is temporarily unavailable: ${cleanMsg}`);
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

      if (response.status === 400 && (lower.includes('api key') || lower.includes('invalid') || errorDetail.includes('API_KEY_INVALID'))) {
        const err = new Error('Invalid Gemini API key.');
        (err as unknown as { code: string }).code = 'INVALID_KEY';
        throw err;
      }

      if (response.status === 403 || response.status === 401) {
        const err = new Error('Invalid Gemini API key.');
        (err as unknown as { code: string }).code = 'INVALID_KEY';
        throw err;
      }

      if (response.status === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
        const err = new Error('Your Gemini API quota appears to be unavailable right now.');
        (err as unknown as { code: string }).code = 'RATE_LIMITED';
        throw err;
      }

      if (response.status >= 500) {
        const err = new Error('Gemini service is temporarily unavailable.');
        (err as unknown as { code: string }).code = 'NETWORK_ERROR';
        throw err;
      }

      const err = new Error('Invalid Gemini API key.');
      (err as unknown as { code: string }).code = 'INVALID_KEY';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawModels: GeminiRawModel[] = data.models || [];
    const compatible = filterGeminiModels(rawModels);

    if (compatible.length === 0) {
      const err = new Error('No compatible text-generation models were found for this API key.');
      (err as unknown as { code: string }).code = 'NO_COMPATIBLE_MODELS';
      throw err;
    }

    return compatible;
  }

  async validateKey(config: AIProviderConfig): Promise<KeyValidationResult> {
    const models = await this.discoverModels(config);
    const recommended = models.find(m => m.recommended) || models[0];

    return {
      valid: true,
      provider: 'gemini',
      model: recommended?.id,
      message: `Connected to Gemini! Found ${models.length} model${models.length === 1 ? '' : 's'} available for your API key.`,
      models
    };
  }

  async generateLinkedInProfile(cvText: string, config: AIProviderConfig): Promise<LinkedInProfilePackage> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      const err = new Error('Please configure and test your Gemini API key first.');
      (err as unknown as { code: string }).code = 'NO_API_KEY';
      throw err;
    }

    const model = config.model?.trim();
    if (!model) {
      const err = new Error('Please select an available Gemini model.');
      (err as unknown as { code: string }).code = 'INVALID_MODEL';
      throw err;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const { systemInstruction, userPrompt } = buildLinkedInProfilePrompt(cvText);

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2
      }
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const cleanMsg = sanitizeError(msg, apiKey);
      const err = new Error(`Network failure connecting to Gemini: ${cleanMsg}`);
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

      if (
        (response.status === 400 && (lowerDetail.includes('api key') || lowerDetail.includes('invalid') || cleanDetail.includes('API_KEY_INVALID'))) ||
        response.status === 403 ||
        response.status === 401
      ) {
        const err = new Error('Invalid Gemini API key. Please check your key at Google AI Studio.');
        (err as unknown as { code: string }).code = 'INVALID_API_KEY';
        throw err;
      }

      if (response.status === 404 || lowerDetail.includes('not found') || lowerDetail.includes('unsupported')) {
        const err = new Error(`The selected model "${model}" is unavailable for your API key. Please click "Refresh Models" in AI Settings.`);
        (err as unknown as { code: string }).code = 'UNAVAILABLE_MODEL';
        throw err;
      }

      if (response.status === 429 || lowerDetail.includes('resource_exhausted') || lowerDetail.includes('quota')) {
        const err = new Error('Gemini API rate limit reached. Please wait a moment and try again.');
        (err as unknown as { code: string }).code = 'RATE_LIMIT';
        throw err;
      }

      const err = new Error(`Could not generate the profile. Gemini service responded with error (${response.status}).`);
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }

    const data = await response.json().catch(() => ({}));
    const rawTextOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawTextOutput) {
      const err = new Error('AI returned an empty response. Please try again with a clearer CV.');
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }

    try {
      const validatedOutput = validateAndNormalizeProfileOutput(rawTextOutput);
      return validatedOutput;
    } catch (normErr: unknown) {
      const msg = normErr instanceof Error ? normErr.message : 'AI returned an invalid profile format. Please try again.';
      const err = new Error(msg);
      (err as unknown as { code: string }).code = 'AI_ERROR';
      throw err;
    }
  }
}

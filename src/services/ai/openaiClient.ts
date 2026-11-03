import OpenAI from 'openai';
import {
  buildAgyCommitPrompt,
  cleanCommitMessage,
  truncateDiff,
} from '../../domain/agyCommit';

export interface OpenAiConfig {
  endpoint?: string;
  apiKey?: string;
}

export interface GenerateCommitInput extends OpenAiConfig {
  diff: string;
  model: string;
  signal?: AbortSignal;
}

export interface AiClient {
  listModels(config: OpenAiConfig): Promise<string[]>;
  generateCommitMessage(input: GenerateCommitInput): Promise<string>;
}

export class CustomOpenAiClient implements AiClient {
  private createClient(config: OpenAiConfig): OpenAI {
    const endpoint = (config.endpoint || '').trim() || 'https://api.openai.com/v1';
    const apiKey = (config.apiKey || '').trim();

    return new OpenAI({
      baseURL: endpoint,
      apiKey: apiKey || 'dummy-key',
      dangerouslyAllowBrowser: true,
    });
  }

  async listModels(config: OpenAiConfig): Promise<string[]> {
    const client = this.createClient(config);
    const response = await client.models.list();
    const models: string[] = [];
    if (response && Array.isArray(response.data)) {
      for (const item of response.data) {
        if (item && typeof item.id === 'string') {
          models.push(item.id);
        }
      }
    }
    return models.sort();
  }

  async generateCommitMessage(input: GenerateCommitInput): Promise<string> {
    if (!input.model.trim()) {
      throw new Error('未指定模型名称，请在设置中配置或选择模型。');
    }
    const client = this.createClient(input);
    const prompt = buildAgyCommitPrompt(truncateDiff(input.diff));
    const response = await client.chat.completions.create(
      {
        model: input.model.trim(),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      },
      { signal: input.signal },
    );

    const raw = response.choices?.[0]?.message?.content ?? '';
    const cleaned = cleanCommitMessage(raw);
    if (!cleaned) {
      throw new Error('AI 模型返回了空提交信息');
    }
    return cleaned;
  }
}

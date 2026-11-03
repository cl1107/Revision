import { useState } from 'react';
import { useTheme } from '../../app/ThemeContext';
import { font, type ThemeTokens } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import type { AppError } from '../../domain/error';
import type { AiSettings } from '../../services/settings/settingsRepository';
import type { AiClient } from '../../services/ai/openaiClient';

export function SettingsDialog({
  initialSettings,
  aiClient,
  onSave,
  onCancel,
}: {
  initialSettings?: AiSettings;
  aiClient?: AiClient;
  onSave: (settings: AiSettings) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [endpoint, setEndpoint] = useState(initialSettings?.endpoint ?? 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey ?? '');
  const [model, setModel] = useState(initialSettings?.model ?? '');
  const [modelFilter, setModelFilter] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const fieldStyle = createFieldStyle(theme);
  const visibleModels = modelFilter.trim()
    ? availableModels.filter((m) => m.toLowerCase().includes(modelFilter.trim().toLowerCase()))
    : availableModels;

  const handleFetchModels = async () => {
    if (!aiClient || fetchingModels) return;
    setError(null);
    setFetchingModels(true);
    try {
      const models = await aiClient.listModels({ endpoint, apiKey });
      setAvailableModels(models);
      if (models.length > 0 && !model) {
        setModel(models[0] ?? '');
      }
    } catch (err) {
      setError({
        kind: 'network',
        title: '获取模型失败',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = () => {
    onSave({
      endpoint: endpoint.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    });
  };

  return (
    <div
      testId="settings-dialog-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.overlayScrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        testId="settings-dialog"
        onMouseDownOutside={onCancel}
        style={{
          width: 520,
          backgroundColor: theme.panel,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <text style={{ color: theme.text, fontSize: 18, fontFamily: font.ui, fontWeight: 600 }}>
            AI Commit 设置
          </text>
        </div>

        <Field label="API Endpoint">
          <input
            testId="settings-endpoint-input"
            value={endpoint}
            placeholder="https://api.openai.com/v1"
            onChange={(event) => setEndpoint(event.value ?? '')}
            style={fieldStyle}
          />
        </Field>

        <Field label="API Key">
          <input
            testId="settings-apikey-input"
            value={apiKey}
            placeholder="sk-..."
            onChange={(event) => setApiKey(event.value ?? '')}
            style={fieldStyle}
          />
        </Field>

        <Field label="模型 (Model)">
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <input
              testId="settings-model-input"
              value={model}
              placeholder="e.g. gpt-4o-mini, deepseek-chat"
              onChange={(event) => setModel(event.value ?? '')}
              style={{ ...fieldStyle, flexGrow: 1 }}
            />
            <Button
              label={fetchingModels ? '获取中…' : '获取模型'}
              variant="secondary"
              size="md"
              disabled={fetchingModels || !aiClient}
              onClick={() => void handleFetchModels()}
              testId="settings-fetch-models"
            />
          </div>
        </Field>

        {availableModels.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>
                {`可用模型 (${availableModels.length} 个，点击选择):`}
              </text>
              {availableModels.length > 6 ? (
                <input
                  testId="settings-model-filter"
                  value={modelFilter}
                  placeholder="过滤模型…"
                  onChange={(event) => setModelFilter(event.value ?? '')}
                  style={{
                    height: 24,
                    width: 140,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 11,
                  }}
                />
              ) : null}
            </div>
            <div
              testId="settings-model-list"
              style={{
                height: 140,
                minHeight: 0,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                backgroundColor: theme.bg,
                padding: 8,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignContent: 'flex-start',
                gap: 6,
                overflow: 'scroll',
              }}
            >
              {visibleModels.map((m) => {
                const isSelected = model === m;
                return (
                  <div
                    key={m}
                    testId={`model-option-${m}`}
                    onClick={() => setModel(m)}
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 4,
                      paddingBottom: 4,
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: isSelected ? theme.accentSoft : theme.panel,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.accent : theme.border,
                    }}
                  >
                    <text
                      style={{
                        color: isSelected ? theme.accent : theme.text,
                        fontSize: 11,
                        fontFamily: font.ui,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {m}
                    </text>
                  </div>
                );
              })}
              {visibleModels.length === 0 ? (
                <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui, padding: 8 }}>
                  未找到匹配的模型
                </text>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <ErrorBanner error={error} testId="settings-error" /> : null}

        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button label="取消" variant="secondary" onClick={onCancel} testId="settings-cancel" />
          <Button label="保存" variant="primary" onClick={handleSave} testId="settings-save" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>{label}</text>
      {children}
    </div>
  );
}

function createFieldStyle(theme: ThemeTokens) {
  return {
    height: 36,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 13,
  } as const;
}

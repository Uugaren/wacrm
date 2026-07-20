'use client';

// ============================================================
// N8nSettings — Settings → n8n Automação
//
// Manage n8n integration status (enable/disable flow) & System Prompt.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Bot, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente virtual atencioso e eficiente de atendimento via WhatsApp.';
const DEFAULT_WEBHOOK_URL = 'https://n8n.mercativus.online/webhook/wacrm';

export function N8nSettings() {
  const { accountId, accountRole } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);

  const loadedAccountIdRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/n8n');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao carregar configurações do n8n');
        return;
      }
      setIsActive(data.is_active ?? true);
      setSystemPrompt(data.system_prompt || DEFAULT_SYSTEM_PROMPT);
      setWebhookUrl(data.webhook_url || DEFAULT_WEBHOOK_URL);
    } catch {
      toast.error('Erro de conexão ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accountId || loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    void fetchConfig();
  }, [accountId, fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/account/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          system_prompt: systemPrompt.trim(),
          webhook_url: webhookUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Configurações do n8n salvas com sucesso!');
        await fetchConfig();
      } else {
        toast.error(data.error ?? 'Erro ao salvar configurações');
      }
    } catch {
      toast.error('Erro de conexão ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Carregando n8n...
      </div>
    );
  }

  const disabled = !canEdit || saving;

  return (
    <section className="animate-in fade-in-50 space-y-6 duration-200">
      <SettingsPanelHead
        title="n8n Automação"
        description="Gerencie o status de envio de eventos e edite o System Prompt do seu bot n8n."
      />

      {!canEdit && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Apenas administradores podem modificar as configurações de automação.
        </p>
      )}

      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="size-5 text-primary" /> Status da Automação
                </CardTitle>
                <CardDescription>
                  Ative ou desative o envio de mensagens do WhatsApp para o seu fluxo no n8n.
                </CardDescription>
              </div>
              <Badge
                className={
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                }
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="mr-1 size-3.5" /> Ativo
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 size-3.5" /> Pausado
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Enviar eventos de mensagens para o n8n
                </p>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, o CRM continua recebendo mensagens normalmente, mas não dispara o webhook para o n8n.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n-webhook-url">Webhook Endpoint (n8n)</Label>
              <Input
                id="n8n-webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.exemplo.com/webhook/wacrm"
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Prompt Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Prompt do Bot</CardTitle>
            <CardDescription>
              Defina as instruções de comportamento, diretrizes e personalidade do seu agente de inteligência artificial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="n8n-system-prompt">Instruções do Sistema</Label>
                <span className="text-xs text-muted-foreground">
                  {systemPrompt.length} caracteres
                </span>
              </div>
              <Textarea
                id="n8n-system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Escreva aqui o prompt do sistema..."
                rows={7}
                disabled={disabled}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Dica: O prompt configurado aqui é enviado automaticamente no payload do evento{' '}
                <code className="text-foreground">message.received</code> (campo <code className="text-foreground">system_prompt</code>) e também fica disponível para consulta via API no endpoint <code className="text-foreground">GET /api/v1/n8n/config</code>.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={disabled}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </div>
    </section>
  );
}

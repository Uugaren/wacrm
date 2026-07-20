'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  QrCode,
  RefreshCw,
  PhoneCall,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface UazapiStatusResponse {
  connected: boolean;
  status?: string;
  baseUrl?: string;
  instance?: string;
  qrcode?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  owner?: string | null;
  message?: string;
}

export function WhatsAppConfig() {
  const t = useTranslations('Settings.whatsapp');

  const [loading, setLoading] = useState(true);
  const [fetchingQr, setFetchingQr] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [baseUrl, setBaseUrl] = useState<string>('https://jarentech.uazapi.com');
  const [instance, setInstance] = useState<string>('w7GXlg');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  const checkStatus = useCallback(async (showToast = false) => {
    if (showToast) setCheckingStatus(true);
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const data: UazapiStatusResponse = await res.json();

      setConnected(data.connected);
      if (data.status) setStatus(data.status);
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (data.instance) setInstance(data.instance);
      if (data.qrcode) setQrCode(data.qrcode);
      if (data.profileName) setProfileName(data.profileName);
      if (data.profilePicUrl) setProfilePicUrl(data.profilePicUrl);
      if (data.owner) setOwner(data.owner);

      if (showToast) {
        if (data.connected) {
          toast.success(data.profileName ? `Connected to ${data.profileName}` : 'WhatsApp is connected!');
        } else {
          toast.info('Status updated: Not connected yet.');
        }
      }
    } catch (err) {
      console.error('Status check error:', err);
      if (showToast) toast.error('Failed to check WhatsApp status');
    } finally {
      setLoading(false);
      setCheckingStatus(false);
    }
  }, []);

  const handleGenerateQr = async () => {
    setFetchingQr(true);
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'POST' });
      const data = await res.json();

      if (data.qrcode) {
        setQrCode(data.qrcode);
        toast.success('QR Code generated. Scan it with WhatsApp.');
      } else {
        await checkStatus(false);
        toast.info('Instance requested connect state.');
      }
    } catch (err) {
      console.error('QR code generation error:', err);
      toast.error('Failed to generate QR code');
    } finally {
      setFetchingQr(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
  }, [checkStatus]);

  // Auto poll status if disconnected
  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => {
      checkStatus(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [connected, checkStatus]);

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title={t("title")}
          description={t("description")}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const formatQrSrc = (rawQr: string) => {
    if (rawQr.startsWith('data:') || rawQr.startsWith('http')) return rawQr;
    return `data:image/png;base64,${rawQr}`;
  };

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main section */}
        <div className="space-y-6">
          {/* Connection Status Banner */}
          <Alert
            className={
              connected
                ? 'bg-emerald-950/30 border-emerald-700/50'
                : 'bg-amber-950/30 border-amber-700/50'
            }
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {connected ? (
                  <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="size-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <AlertTitle
                    className={
                      'font-semibold text-base mb-0.5 ' +
                      (connected ? 'text-emerald-200' : 'text-amber-200')
                    }
                  >
                    {connected ? t('credentialsValid') : t('notConnected')}
                  </AlertTitle>
                  <AlertDescription className="text-muted-foreground text-sm">
                    {connected
                      ? t('connectedDesc')
                      : t('notConnectedDesc')}
                  </AlertDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkStatus(true)}
                disabled={checkingStatus}
                className="border-border text-foreground hover:bg-muted"
              >
                {checkingStatus ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t('testConnection')}
              </Button>
            </div>
          </Alert>

          {/* Device Profile / Connected Details Card */}
          {connected && (
            <Card className="border-emerald-700/40 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-base flex items-center gap-2">
                  <User className="size-4 text-emerald-400" />
                  Dispositivo Conectado
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  Detalhes do WhatsApp pareado via Uazapi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  {profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicUrl}
                      alt={profileName || 'Profile'}
                      className="size-14 rounded-full border border-emerald-500/30 object-cover"
                    />
                  ) : (
                    <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                      {profileName ? profileName.slice(0, 2).toUpperCase() : 'WA'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-foreground text-base">
                      {profileName || 'WhatsApp Connected'}
                    </h4>
                    {owner && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <PhoneCall className="size-3.5" />
                        +{owner}
                      </p>
                    )}
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 mt-1.5">
                      Instância: {instance}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Section (if disconnected or QR code available) */}
          {(!connected || qrCode) && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <QrCode className="size-5 text-primary" />
                  QR Code de Conexão Uazapi
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Abra o WhatsApp no celular &gt; Aparelhos conectados &gt; Conectar um aparelho e aponte a câmera para o QR Code abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4 py-4">
                {qrCode ? (
                  <div className="p-3 bg-white rounded-xl shadow-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formatQrSrc(qrCode)}
                      alt="WhatsApp QR Code"
                      className="size-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border w-full text-center space-y-3">
                    <QrCode className="size-12 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      QR Code não exibido no momento. Clique abaixo para gerar ou atualizar.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleGenerateQr}
                  disabled={fetchingQr}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {fetchingQr ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="size-4" />
                      Gerar / Atualizar QR Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Uazapi Credentials Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('apiCredentialsTitle')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('apiCredentialsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('phoneNumberId')}</Label>
                <Input
                  readOnly
                  value={instance}
                  className="bg-muted border-border text-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('wabaId')}</Label>
                <Input
                  readOnly
                  value={baseUrl}
                  className="bg-muted border-border text-foreground font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Webhook Callback URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('webhookTitle')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('webhookDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('webhookUrl')}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted border-border text-muted-foreground font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWebhookUrl}
                    className="shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">{t('setupInstructions')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('setupInstructionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion defaultValue={['item-1']}>
                <AccordionItem value="item-1" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                      {t('step1')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>{t('step1_1')}</li>
                      <li>{t('step1_2')}</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                      {t('step2')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li dangerouslySetInnerHTML={{ __html: t('step2_1') }} />
                      <li>{t('step2_2')}</li>
                      <li>{t('step2_3')}</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                      {t('step3')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>{t('step3_1')}</li>
                      <li>{t('step3_2')}</li>
                      <li dangerouslySetInnerHTML={{ __html: t('step3_3') }} />
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-4 pt-4 border-t border-border">
                <a
                  href="https://jarentech.uazapi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  {t('metaDocs')}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

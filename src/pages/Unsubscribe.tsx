import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, MailX } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
          headers: { apikey: anonKey },
        });
        const data = await res.json();
        if (!res.ok) { setStatus('invalid'); return; }
        if (data.valid === false && data.reason === 'already_unsubscribed') { setStatus('already'); return; }
        setStatus('valid');
      } catch { setStatus('error'); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) throw error;
      if (data?.success) { setStatus('success'); } else if (data?.reason === 'already_unsubscribed') { setStatus('already'); } else { setStatus('error'); }
    } catch { setStatus('error'); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-secondary">
            <MailX className="h-6 w-6" /> Email Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}
          {status === 'valid' && (
            <>
              <p className="text-muted-foreground">Would you like to unsubscribe from Conlink CRM emails?</p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium">You've been unsubscribed.</p>
              <p className="text-sm text-muted-foreground">You will no longer receive emails from Conlink CRM.</p>
            </>
          )}
          {status === 'already' && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-medium">Already unsubscribed</p>
              <p className="text-sm text-muted-foreground">This email has already been unsubscribed.</p>
            </>
          )}
          {status === 'invalid' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="font-medium">Invalid link</p>
              <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or expired.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm text-muted-foreground">Please try again later.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;

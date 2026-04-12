import React, { useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface CameraScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (data: { company_name?: string; contact_person?: string; phone?: string; email?: string }) => void;
}

const CameraScanDialog: React.FC<CameraScanDialogProps> = ({ open, onOpenChange, onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCaptured(null);
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    setCaptured(dataUrl);
    stopCamera();
  };

  const processOCR = async () => {
    if (!captured) return;
    setProcessing(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(captured);
      await worker.terminate();

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const extracted: { company_name?: string; contact_person?: string; phone?: string; email?: string } = {};

      // Extract phone
      const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{7,20}/);
      if (phoneMatch) extracted.phone = phoneMatch[0].replace(/[\s\-\(\)]/g, '');

      // Extract email
      const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/i);
      if (emailMatch) extracted.email = emailMatch[0];

      // Heuristic: longest line without phone/email is likely company name
      const nonContactLines = lines.filter(l => 
        !l.match(/[\w.+-]+@[\w.-]+/) && !l.match(/[\+]?[\d\s\-\(\)]{7,}/)
      );
      if (nonContactLines.length > 0) {
        // Sort by length descending, pick first as company
        const sorted = [...nonContactLines].sort((a, b) => b.length - a.length);
        extracted.company_name = sorted[0];
        if (sorted.length > 1) extracted.contact_person = sorted[1];
      }

      onResult(extracted);
      onOpenChange(false);
      toast.success('Text extracted from image');
    } catch (err: any) {
      toast.error('OCR failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) stopCamera();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-secondary">
            <Camera className="h-5 w-5" /> Scan Business Card
          </DialogTitle>
        </DialogHeader>

        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && !captured && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Take a photo of a business card or project board to auto-fill lead details.
            </p>
            <Button onClick={startCamera}>
              <Camera className="mr-2 h-4 w-4" /> Open Camera
            </Button>
          </div>
        )}

        {cameraActive && (
          <div className="space-y-3">
            <video ref={videoRef} className="w-full rounded-lg bg-black" autoPlay playsInline muted />
            <Button onClick={capturePhoto} className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Capture Photo
            </Button>
          </div>
        )}

        {captured && (
          <div className="space-y-3">
            <img src={captured} alt="Captured" className="w-full rounded-lg" />
            <div className="flex gap-2">
              <Button onClick={processOCR} disabled={processing} className="flex-1">
                {processing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  'Extract Text'
                )}
              </Button>
              <Button variant="outline" onClick={startCamera}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retake
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CameraScanDialog;

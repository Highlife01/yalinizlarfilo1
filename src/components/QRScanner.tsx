import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface QRScannerProps {
    onScan: (data: string) => void;
    open: boolean;
    onClose: () => void;
}

export const QRScanner = ({ onScan: _onScan, open, onClose }: QRScannerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (open) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [open]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (error) {
            console.error("Kamera erişim hatası:", error);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Kod Okut</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-4 border-white/30 m-8 rounded-lg pointer-events-none" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        QR kodu çerçeveye hizalayın
                    </p>
                    <Button variant="outline" onClick={onClose} className="w-full">
                        İptal
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface VehicleQRCodeProps {
    vehicleId: string;
    plate: string;
}

export const VehicleQRCode = ({ vehicleId, plate }: VehicleQRCodeProps) => {
    const qrData = JSON.stringify({ type: 'vehicle', id: vehicleId, plate });

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border">
            <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                includeMargin
            />
            <div className="text-center">
                <p className="font-bold text-lg">{plate}</p>
                <p className="text-sm text-muted-foreground">Araç QR Kodu</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    const svg = document.querySelector('svg');
                    if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const img = new Image();
                        img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            const url = canvas.toDataURL();
                            const link = document.createElement('a');
                            link.download = `qr_${plate}.png`;
                            link.href = url;
                            link.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                    }
                }}
            >
                QR Kodu İndir
            </Button>
        </div>
    );
};

declare module 'react-qr-scanner' {
    import { Component } from 'react';

    export interface QrScannerProps {
        delay?: number | false;
        style?: React.CSSProperties;
        onError?: (error: Error) => void;
        onScan?: (data: { text: string } | null) => void;
        onLoad?: () => void;
        constraints?: {
            video: {
                facingMode?: string | { ideal: string };
                width?: { ideal: number };
                height?: { ideal: number };
            };
        };
        facingMode?: 'user' | 'environment';
        resolution?: number;
        chooseDeviceId?: () => Promise<string>;
    }

    export default class QrScanner extends Component<QrScannerProps> {}
} 
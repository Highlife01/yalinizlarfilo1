import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="bg-red-100 p-3 rounded-full w-fit mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Bir şeyler ters gitti</h1>
                        <p className="text-slate-600">
                            Uygulama beklenmedik bir hatayla karşılaştı.
                        </p>
                        <div className="bg-slate-100 p-4 rounded text-left overflow-auto max-h-40 text-xs font-mono border border-slate-200">
                            {import.meta.env.DEV
                              ? this.state.error?.message
                              : "Hata detayları güvenlik nedeniyle gizlendi. Lütfen sayfayı yenileyin."}
                        </div>
                        <Button
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            Sayfayı Yenile
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/'}
                            className="mt-2 ml-2"
                        >
                            Ana Sayfaya Dön
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

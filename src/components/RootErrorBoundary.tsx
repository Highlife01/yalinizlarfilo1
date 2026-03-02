import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#0f172a",
            color: "#e2e8f0",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
            Bir hata oluştu
          </h1>
          <p
            style={{
              maxWidth: 480,
              marginBottom: 16,
              fontSize: 14,
              color: "#94a3b8",
            }}
          >
            Sayfa yüklenirken beklenmeyen bir sorun oluştu. Lütfen sayfayı
            yenileyin veya daha sonra tekrar deneyin.
          </p>
          <pre
            style={{
              padding: 12,
              background: "#1e293b",
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxWidth: "100%",
              marginBottom: 16,
            }}
          >
            {import.meta.env.DEV
              ? this.state.error.message
              : "Hata detayları güvenlik nedeniyle gizlendi."}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Sayfayı yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

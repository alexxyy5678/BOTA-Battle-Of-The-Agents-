import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-[250px] rounded bg-muted animate-pulse" />
          <div className="h-4 w-[200px] rounded bg-muted animate-pulse" />
        </div>
        <button
          onClick={resetErrorBoundary}
          className="p-2 text-muted-foreground hover:text-foreground transition hover:bg-muted rounded-full"
          title="Retry"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" />
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 w-full overflow-auto rounded bg-black/80 p-3 text-left text-[10px] text-red-300/80">
          <pre>{error.message}</pre>
        </div>
      )}
    </div>
  );
}

interface BantahErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export function BantahErrorBoundary({ children, onReset }: BantahErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={onReset}
      onError={(error) => console.error('[BantahErrorBoundary] Caught error:', error)}
    >
      {children}
    </ErrorBoundary>
  );
}

import React from 'react';
import { Loader2 } from 'lucide-react';

export function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground transition-opacity duration-300">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          {/* We use a placeholder emoji or logo block if actual logo isn't easily imported */}
          <div className="text-6xl drop-shadow-lg">⚔️</div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
            Bantah
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Initializing Arena...</p>
        </div>
      </div>
    </div>
  );
}

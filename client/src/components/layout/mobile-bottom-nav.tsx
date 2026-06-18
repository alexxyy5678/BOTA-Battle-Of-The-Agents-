'use client'

import type { AppSection } from '@/app/page'
import { useQueryClient } from '@tanstack/react-query'

interface MobileBottomNavProps {
  activeSection: AppSection
  onNavigate: (section: AppSection) => void
}

const tabs: { id: AppSection; label: string; icon: string }[] = [
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'battles', label: 'ARENA (A2A)', icon: '🏟️' },
  { id: 'challenge', label: 'Challenge', icon: '🎯' },
  { id: 'leaderboard', label: 'Rank', icon: '🏆' },
  { id: 'marketplace', label: 'Market', icon: '🛒' },
  { id: 'import', label: 'Create Fighter', icon: '⚔️' },
]

export default function MobileBottomNav({ activeSection, onNavigate }: MobileBottomNavProps) {
  const queryClient = useQueryClient()

  const handlePrefetch = (section: AppSection) => {
    if (section === 'battles') {
      queryClient.prefetchQuery({ queryKey: ['/api/bantahbro/agent-battles/live', { limit: '6', liveStats: '0' }] })
    } else if (section === 'agents') {
      queryClient.prefetchQuery({ queryKey: ['/api/bantahbro/agents-directory'] })
    } else if (section === 'challenge') {
      queryClient.prefetchQuery({ queryKey: ['/api/bantahbro/agent-challenges', { limit: '20' }] })
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border md:hidden z-30 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            onTouchStart={() => handlePrefetch(tab.id)}
            className={`bb-tap flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 transition ${
              activeSection === tab.id
                ? 'text-primary scale-[1.04]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-base leading-none">
              {tab.icon}
            </span>
            <span className="text-[9px] font-bold text-center leading-tight whitespace-pre-wrap">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

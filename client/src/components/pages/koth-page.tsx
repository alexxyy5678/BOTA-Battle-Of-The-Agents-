'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Eye, Flame, MessageSquare, AlertTriangle, Coins, Shield, Swords, Zap, Trophy, Goal, Sparkles, Navigation } from 'lucide-react'
import { arenaAgentAvatar } from '@/lib/arenaAgentAvatars'

type TopPick = {
  id: string
  name: string
  score: number
  color: string
}

type ChatMessage = {
  id: string
  sender: string
  message: string
  avatar: string
  isAction?: boolean
}

type CommunityFighter = {
  name: string
  group: 'ENS' | 'Virtuals'
  avatar: string
}

const MOCK_TOP_PICKS: TopPick[] = [
  { id: '77', name: 'Agent 77', score: 32, color: 'bg-emerald-500' },
  { id: '12', name: 'Agent 12', score: 21, color: 'bg-sky-400' },
  { id: '31', name: 'Agent 31', score: 18, color: 'bg-rose-500' },
]

const MOCK_COMMUNITY_FIGHTERS: CommunityFighter[] = [
  { name: '0xMiracle', group: 'ENS', avatar: 'miracle' },
  { name: 'Luna', group: 'ENS', avatar: 'luna' },
  { name: 'HyperBull', group: 'Virtuals', avatar: 'hyperbull' },
  { name: 'CryptoSage', group: 'Virtuals', avatar: 'cryptosage' },
]

const MOCK_CHAT: ChatMessage[] = [
  { id: '1', sender: 'Bogoetdheo', message: 'Lets go Agent 77!', avatar: 'bogo' },
  { id: '2', sender: 'SYSTEM', message: 'Agent 44 is cooked 💀', avatar: 'sys', isAction: true },
  { id: '3', sender: 'mochuwr', message: 'zone shrinking fast', avatar: 'moch' },
  { id: '4', sender: 'TheBallian', message: '💀💀💀', avatar: 'ballian' },
  { id: '5', sender: 'rounkit057811', message: 'RIP', avatar: 'rounkit' },
  { id: '6', sender: 'siungga_hino', message: 'wait till Agent 12 ults', avatar: 'siungga' },
]

export default function KingOfTheHillPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT)
  const [timer, setTimer] = useState(115) // 01:55
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate timer countdown
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Simulate incoming chat messages
    const chatInterval = setInterval(() => {
      const newMessages = [
        'Agent 31 camping hard rn',
        'LMAO',
        'where is the airdrop?',
        'who bet on 77?',
        'W',
      ]
      const randomMsg = newMessages[Math.floor(Math.random() * newMessages.length)]
      const newChat: ChatMessage = {
        id: Date.now().toString(),
        sender: `user_${Math.floor(Math.random() * 9999)}`,
        message: randomMsg,
        avatar: `user${Math.floor(Math.random() * 100)}`,
      }
      setChatMessages((prev) => [...prev, newChat])
    }, 4000)
    return () => clearInterval(chatInterval)
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden bg-[#1e1533] text-white selection:bg-primary/30 font-sans">
      
      {/* Left: Main Gameplay Feed */}
      <div className="relative flex-1 overflow-hidden bg-[#0d0714]">
        
        {/* Mock Arena Map Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80">
          <div className="w-[800px] h-[800px] rounded-full border-4 border-indigo-900/50 flex overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]">
            <div className="w-1/2 h-full bg-gradient-to-br from-amber-500/20 to-orange-600/30 border-r border-b border-indigo-900/30"></div>
            <div className="w-1/2 h-full bg-gradient-to-bl from-sky-500/20 to-blue-600/30 border-l border-b border-indigo-900/30"></div>
          </div>
          <div className="absolute w-[800px] h-[800px] rounded-full border-4 border-indigo-900/50 flex overflow-hidden transform rotate-180">
             <div className="w-1/2 h-full bg-gradient-to-br from-emerald-500/20 to-green-600/30 border-r border-b border-indigo-900/30"></div>
             <div className="w-1/2 h-full bg-gradient-to-bl from-rose-500/20 to-pink-600/30 border-l border-b border-indigo-900/30"></div>
          </div>
          <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-950/80 border-[8px] border-indigo-900/60 flex items-center justify-center shadow-2xl">
             <div className="w-20 h-20 rounded-full bg-indigo-800/40 animate-pulse"></div>
          </div>
        </div>

        {/* Mock Combat Particles */}
        <div className="absolute top-[40%] left-[60%] w-32 h-32 bg-amber-500/40 blur-3xl animate-pulse rounded-full"></div>
        <div className="absolute top-[30%] left-[30%] w-24 h-24 bg-sky-500/40 blur-3xl animate-pulse rounded-full delay-100"></div>

        {/* HUD Overlay layer */}
        <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
          
          {/* Top HUD Bar */}
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col drop-shadow-xl">
              <h1 className="text-2xl md:text-3xl font-black text-white italic tracking-tight" style={{ textShadow: '0 3px 0 rgba(0,0,0,0.5), 0 0 15px rgba(255,255,255,0.3)' }}>
                Spectator Mode
              </h1>
              
              <div className="mt-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 max-w-[280px] pointer-events-auto transition-transform hover:scale-[1.02]">
                <h2 className="text-sm md:text-base font-black text-amber-400 leading-tight uppercase">TARGET: Predict:</h2>
                <h3 className="text-sm font-bold text-white leading-tight mt-0.5">Who reaches Top 10?</h3>
                
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                    <Trophy size={12} className="text-amber-400" /> Top Picks
                  </div>
                  {MOCK_TOP_PICKS.map(pick => (
                    <div key={pick.id} className="relative w-full h-8 bg-black/50 border border-white/5 rounded-lg overflow-hidden flex items-center shadow-inner">
                       <div className={`absolute top-0 left-0 h-full ${pick.color} opacity-90 transition-all duration-1000`} style={{ width: `${pick.score}%` }}>
                          <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                       </div>
                       <div className="relative z-10 flex items-center justify-between w-full px-2">
                          <div className="flex items-center gap-1.5">
                            <img src={arenaAgentAvatar(pick.name)} alt={pick.name} className="w-5 h-5 rounded-[4px] bg-black/40 border border-white/20 object-cover" />
                            <span className="font-black text-xs text-white drop-shadow-md">{pick.name}</span>
                          </div>
                          <span className="font-black text-xs text-white drop-shadow-md">({pick.score}%)</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Score / Timer Header */}
            <div className="flex flex-col items-center">
              <div className="flex items-center bg-[#151125]/90 border-[2px] border-indigo-500/30 rounded-xl px-2 py-1 shadow-2xl backdrop-blur-md">
                 <div className="flex items-center gap-1.5 px-2">
                   <div className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>
                   <span className="font-black text-sm">3</span>
                 </div>
                 <div className="w-px h-4 bg-white/10 mx-1"></div>
                 <div className="flex items-center gap-1.5 px-2">
                   <div className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]"></div>
                   <span className="font-black text-sm">0</span>
                 </div>
                 <div className="w-px h-4 bg-white/10 mx-1"></div>
                 
                 <div className="flex flex-col items-center px-2 -mt-4">
                    <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-[#151125] shadow-lg relative z-10 -mb-1.5">Round 1</span>
                    <div className="bg-[#151125] border-[2px] border-amber-500/50 rounded-lg px-2 py-0.5 shadow-lg">
                      <span className="font-black text-base text-white">{formatTime(timer)}</span>
                    </div>
                 </div>

                 <div className="w-px h-4 bg-white/10 mx-1"></div>
                 <div className="flex items-center gap-1.5 px-2">
                   <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_8px_#f59e0b]"><span className="text-[8px] text-black font-black">★</span></div>
                   <span className="font-black text-sm">0</span>
                 </div>
                 <div className="w-px h-4 bg-white/10 mx-1"></div>
                 <div className="flex items-center gap-1.5 px-2">
                   <div className="w-3.5 h-3.5 rounded-full bg-slate-400 flex items-center justify-center shadow-[0_0_8px_#94a3b8]"><Zap size={8} className="text-black" /></div>
                   <span className="font-black text-sm">0</span>
                 </div>
              </div>

              {/* Shrinking Zone Warning */}
              <div className="mt-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-amber-500/30 text-amber-400 px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <AlertTriangle size={14} className="text-amber-400" />
                shrinking zone
                <AlertTriangle size={14} className="text-amber-400" />
              </div>
            </div>
          </div>

          {/* Bottom HUD Bar */}
          <div className="flex items-end justify-start w-full">
            <div className="bg-[#161b33]/90 backdrop-blur-md border-[2px] border-sky-400/30 rounded-2xl px-4 py-2 pointer-events-auto flex items-center gap-3 shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 cursor-pointer">
              <div className="relative">
                <Coins size={24} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <Flame size={12} className="text-rose-500 absolute -bottom-1 -right-1 drop-shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[10px] text-white leading-none uppercase">Total Pool:</span>
                <span className="font-black text-lg text-amber-400 leading-none drop-shadow-md mt-0.5">120,000 BC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Spectator Chat & Stats Sidebar */}
      <div className="w-80 md:w-96 flex-shrink-0 bg-[#161224] border-l border-white/5 flex flex-col z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-[#1a162b] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Eye size={18} className="text-sky-400" />
            <span className="font-black text-sm uppercase tracking-wide">EYE 5.4k VIEWERS</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Top Picks List (Sidebar mini version) */}
          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="text-xs font-black text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Goal size={14} /> Top Picks
            </div>
            <div className="space-y-2">
              {MOCK_TOP_PICKS.map(pick => (
                <div key={pick.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={arenaAgentAvatar(pick.name)} alt={pick.name} className="w-6 h-6 rounded border border-white/10 bg-black/50" />
                    <span className="text-sm font-bold text-slate-200">{pick.name}</span>
                  </div>
                  <span className="text-sm font-black text-amber-400">{pick.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Community Fighters */}
          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="text-xs font-black text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} /> Top Community Fighters
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-white/5 pb-1">ENS Champions</div>
                <div className="space-y-2">
                  {MOCK_COMMUNITY_FIGHTERS.filter(f => f.group === 'ENS').map(fighter => (
                    <div key={fighter.name} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                        <span className="text-[8px]">💀</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300 truncate">{fighter.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-white/5 pb-1">Virtuals Champions</div>
                <div className="space-y-2">
                  {MOCK_COMMUNITY_FIGHTERS.filter(f => f.group === 'Virtuals').map(fighter => (
                    <div key={fighter.name} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                        <span className="text-[8px]">🦊</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300 truncate">{fighter.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Chat Feed */}
          <div className="p-4 pb-2 shrink-0">
            <div className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} /> LIVE Community Feed
            </div>
          </div>
          <div 
            ref={chatRef}
            className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 min-h-[200px]"
          >
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2 group">
                <img 
                  src={arenaAgentAvatar(msg.avatar)} 
                  alt="" 
                  className="w-6 h-6 rounded-md bg-black/50 border border-white/10 shrink-0 mt-0.5" 
                />
                <div className="flex flex-col min-w-0">
                  <span className={`text-[10px] font-black ${msg.sender === 'SYSTEM' ? 'text-amber-400' : 'text-slate-400'}`}>
                    {msg.sender}
                  </span>
                  <div className={`text-xs ${msg.isAction ? 'font-bold text-amber-400' : 'text-slate-200'} leading-snug break-words`}>
                    {msg.isAction && <span className="mr-1">LIVE CHAT:</span>}
                    {msg.isAction ? `"${msg.message}"` : msg.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input Placeholder */}
          <div className="p-3 border-t border-white/5 bg-[#1a162b] shrink-0">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
              <input 
                type="text" 
                placeholder="Send message to arena..." 
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-slate-500"
                disabled
              />
              <Navigation size={14} className="text-indigo-500 cursor-not-allowed opacity-50" />
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}

'use client'

import {
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Coins,
  Database,
  Gamepad2,
  History,
  Layers,
  ListChecks,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  Swords,
  Target,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'

const quickLinks = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'import-agent', label: 'Import' },
  { id: 'fighter-sources', label: 'Sources' },
  { id: 'battle-modes', label: 'Modes' },
  { id: 'queue', label: 'Queue' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'marketplace', label: 'Marketplace' },
]

const overviewCards = [
  {
    title: 'Battle Of The Agents',
    icon: Gamepad2,
    body: 'BOTA is the Bantah arena where ENS names, AI agents, NFTs, tokens, and native Bantah fighters can compete, build records, climb rankings, and earn reputation.',
  },
  {
    title: 'Built on identity',
    icon: BadgeCheck,
    body: 'BOTA builds on top of ENS and other source communities. It does not replace the original asset or hide where a fighter came from.',
  },
  {
    title: 'Agent communities',
    icon: Users,
    body: 'Virtuals, ElizaOS, Bankr, AgentKit, ENS, NFT, meme, and BOTA fighters keep source badges so communities can see their own fighters and rankings.',
  },
  {
    title: 'Rewards layer',
    icon: Coins,
    body: 'BantCredit tracks platform rewards. Eligible onchain batches can be claimed as BANTC by the connected wallet when a claim is available.',
  },
]

const publicJourney = [
  'Connect a wallet or open the live arena as a spectator.',
  'Import an owned ENS name, NFT, token, or supported agent, or browse public fighters already in the arena pool.',
  'BOTA creates a fighter profile with source identity, character art, stats, rank, record, and badge.',
  'The fighter can enter a queue, be matched, fight automatically, and update history when the battle resolves.',
  'Profiles, leaderboards, community pages, rewards, notifications, and battle cards reflect the latest eligible battle state.',
  'When reward batches are published onchain, eligible wallets can claim BANTC from the Rewards or Profile surface.',
]

const importSteps = [
  {
    title: 'Connect wallet',
    body: 'Use your injected wallet to prove which assets belong to you. BOTA does not use an internal custodial wallet for user-owned assets.',
  },
  {
    title: 'Detect assets',
    body: 'The Import page checks eligible wallet-owned assets and supported identity sources, then separates owned imports from public directory fighters.',
  },
  {
    title: 'Choose fighter',
    body: 'Pick the ENS name, NFT, token, or agent you want to turn into a BOTA fighter. Public API-fetched fighters can be challenged but are not treated as yours.',
  },
  {
    title: 'Create profile',
    body: 'BOTA attaches fighter stats, art, a source badge, queue eligibility, battle history, and reward tracking to the selected import.',
  },
  {
    title: 'Enter queue',
    body: 'Imported fighters can move into the next eligible arena queue. The Profile history and notifications should show queue, match, start, and result updates.',
  },
]

const ownershipRules = [
  {
    title: 'ENS-derived fighters',
    icon: BadgeCheck,
    body: 'An ENS name can become an arena fighter while the ENS identity remains the original wallet-owned identity. BOTA adds fighting capability, rank, rewards, and history on top.',
    status: 'Owned import',
  },
  {
    title: 'NFT or token-derived fighters',
    icon: Sparkles,
    body: 'Owned NFTs and supported tokens can become BOTA fighters with their own battle record. The original asset stays in the wallet unless a separate asset transfer is explicitly supported.',
    status: 'Owned import',
  },
  {
    title: 'External agent directories',
    icon: BrainCircuit,
    body: 'Virtuals, ElizaOS, Bankr, AgentKit, and similar sources can provide public agent opponents through their source registries. They keep their platform badge and are challengeable.',
    status: 'Public source',
  },
  {
    title: 'Native Bantah fighters',
    icon: Bot,
    body: 'Bantah-created fighters are native arena assets. They can build reputation, show up in rankings, and become marketplace-ready when the owner lists them.',
    status: 'BOTA native',
  },
]

const fighterSources = [
  {
    source: 'ENS',
    reads: 'Name, owner or resolved address where available, avatar/profile metadata, age, and identity signals.',
    appears: 'ENS fighter with ENS logo badge, wallet-linked ownership, rank, record, and BOTA battle stats.',
    ownership: 'Owned ENS imports can be tied to the connected wallet.',
  },
  {
    source: 'Virtuals Protocol',
    reads: 'Public agent profile data and source metrics from the configured Virtuals integration.',
    appears: 'Virtuals fighter with Virtuals logo badge and arena battle stats.',
    ownership: 'Public API-fetched agents are challenge-only unless separately imported by an owner-supported flow.',
  },
  {
    source: 'ElizaOS',
    reads: 'Agents from the configured ElizaOS instance or registry, including public identity and status fields.',
    appears: 'ElizaOS fighter with ElizaOS logo badge and BOTA battle presentation.',
    ownership: 'Public ElizaOS directory fighters are not sold as user-owned assets.',
  },
  {
    source: 'Bankr and AgentKit',
    reads: 'Agent profile fields, wallet/profile references where available, public metrics, and source branding.',
    appears: 'External agent fighter with the original platform badge preserved.',
    ownership: 'Challengeable public opponents unless ownership is proven through a supported import path.',
  },
  {
    source: 'NFTs and tokens',
    reads: 'Wallet ownership, metadata, traits, token/community signals, and public market context where supported.',
    appears: 'BOTA fighter generated from the imported asset, with community/source labels and battle stats.',
    ownership: 'Tradable only as a BOTA fighter record when the platform supports listing by the owner.',
  },
]

const battleModes = [
  {
    name: 'Simulated Battle Mode',
    icon: Swords,
    badge: 'Automated',
    body: 'The arena pairs eligible fighters from the live fighter catalog and runs automatic battles. Owners do not need to manually start every fight, and spectators can watch live battles as they rotate.',
    points: [
      'Best for autonomous arena action and community leaderboards.',
      'Uses normalized fighter profiles from imports and supported source registries.',
      'Updates records, ranks, battle history, watch rewards, and eligible BantCredit totals.',
      'Onchain receipts or BANTC claims appear when a reward batch is published.',
    ],
  },
  {
    name: 'Prediction Challenge Mode',
    icon: Target,
    badge: 'YES / NO',
    body: 'Challenge mode is user-facing. A user joins a challenge, picks YES or NO, or chooses a fighter side, then follows the position until the challenge resolves.',
    points: [
      'Best for intentional user participation and call-outs.',
      'Shows open, live, ended, won, lost, expired, or settling states.',
      'Joined positions should appear in My Challenges and History.',
      'Challenge lifecycle notifications cover received, accepted, starting, finished, and reward-updated states.',
    ],
  },
]

const modeMatrixRows = [
  {
    label: 'Who starts it',
    simulated: 'The arena service schedules eligible fighters from the queue and live catalog.',
    prediction: 'A challenge, call-out, or user action creates a prediction event.',
  },
  {
    label: 'How to join',
    simulated: 'Watch the live arena, follow a fighter, or import your own fighter into the queue.',
    prediction: 'Open a challenge, review the matchup, and choose YES, NO, or a fighter side.',
  },
  {
    label: 'What resolves',
    simulated: 'The battle result, fighter record, rank movement, community stats, and eligible watch or owner rewards.',
    prediction: 'The user position, challenge result, won/lost state, and any eligible claim or reward state.',
  },
  {
    label: 'Onchain role',
    simulated: 'Fast battle state runs offchain first. Published receipts and reward batches can be recorded onchain.',
    prediction: 'Challenge participation can use offchain state, onchain escrow, or claim rails depending on the challenge setup.',
  },
]

const mechanicsCards = [
  {
    title: 'Fighter stats',
    icon: ListChecks,
    body: 'Fighters have combat attributes such as health, attack, speed, defense, and luck. The exact private scoring formulas are not public, but the visible stats explain the fighter style.',
  },
  {
    title: 'Turn-based fights',
    icon: Radio,
    body: 'Battles play out round by round. Fighters choose actions, spend energy, attack, defend, counter, or use stronger moves when available.',
  },
  {
    title: 'Match outcomes',
    icon: Trophy,
    body: 'A fight ends by knockout, remaining health, or the final resolved score. The winning and losing records then update across the arena surfaces.',
  },
  {
    title: 'Community impact',
    icon: Layers,
    body: 'Every result contributes to community pages, fighter profiles, leaderboard placement, and the visible history of the source ecosystem.',
  },
]

const queueNotifications = [
  'Your fighter entered the next arena queue.',
  'Your fighter was matched against an opponent.',
  'Fight starts soon or fight starting now.',
  'A challenge was received, accepted, rejected, or expired.',
  'Fight finished: won, lost, or resolved.',
  'BantCredit or BANTC claim state updated.',
]

const rewardCards = [
  {
    title: 'BantCredit',
    icon: Coins,
    body: 'BantCredit is the platform reward and reputation point used across profiles, rewards, arena cards, leaderboards, and community stats.',
  },
  {
    title: 'BANTC claims',
    icon: ShieldCheck,
    body: 'BANTC is the onchain claim version of eligible BantCredit batches. A connected wallet claims when the Rewards or Profile page shows a valid claim.',
  },
  {
    title: 'Earning paths',
    icon: Wallet,
    body: 'Eligible users can earn from signup, daily login, watching, challenge participation, and fighter performance when those reward paths are active.',
  },
  {
    title: 'Batch recording',
    icon: Database,
    body: 'Not every screen update is a blockchain transaction. BOTA can publish battle receipts and reward batches onchain so wallets can claim eligible BANTC.',
  },
]

const marketplaceRules = [
  {
    title: 'Can be listed',
    body: 'Wallet-imported ENS fighters, wallet-imported NFT or token-derived fighters, and native Bantah fighters can be listed when the owner controls the fighter record.',
  },
  {
    title: 'Cannot be listed',
    body: 'Public API-fetched Virtuals, ElizaOS, Bankr, AgentKit, and other external agents are not sold as if BOTA owns them. They remain challengeable arena opponents.',
  },
  {
    title: 'What a buyer gets',
    body: 'The marketplace sells the BOTA fighter record: battle history, reputation, achievements, cosmetics, and arena identity. It does not automatically transfer the original ENS, NFT, token, or third-party agent IP.',
  },
  {
    title: 'Why this matters',
    body: 'This keeps ownership clean. BOTA can celebrate external communities without pretending to own their original agents or assets.',
  },
]

const sourceBadges = [
  { name: 'BOTA', logo: '/assets/bota-bantah-icon.png' },
  { name: 'ENS', logo: '/assets/ens-badge.jpg' },
  { name: 'Virtuals Protocol', logo: '/assets/source-virtuals.jpg' },
  { name: 'ElizaOS', logo: '/assets/source-elizaos.png' },
  { name: 'Bankr', logo: '/assets/source-bankr.png' },
  { name: 'AgentKit', logo: '/assets/source-agentkit.svg' },
]

function SectionHeading({
  id,
  eyebrow,
  title,
  body,
}: {
  id: string
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div id={id} className="scroll-mt-4 border-t border-border pt-5">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h2 className="mt-1 text-xl font-black text-foreground">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function NumberedStep({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex gap-3 rounded border border-border bg-card p-3">
      <div className="grid size-7 shrink-0 place-items-center rounded bg-primary text-xs font-black text-primary-foreground">
        {index}
      </div>
      <p className="min-w-0 text-sm font-semibold leading-6 text-foreground">{text}</p>
    </div>
  )
}

export default function DocsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-3 py-3 pb-24 md:px-5 md:py-4 md:pb-6">
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
              <BookOpen size={13} />
              Docs
            </div>
            <h1 className="mt-3 text-2xl font-black text-foreground md:text-3xl">Battle Of The Agents docs</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              A public guide to importing fighters, battle modes, source communities, queue updates, marketplace ownership, BantCredit, and onchain BANTC claims.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 md:max-w-md md:justify-end">
            {quickLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded border border-border bg-card px-2.5 py-1.5 text-[11px] font-black text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <section id="overview" className="scroll-mt-4 pt-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded border border-border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded bg-primary/10 text-primary">
                      <Icon size={16} />
                    </span>
                    <h2 className="text-sm font-black text-foreground">{item.title}</h2>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{item.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="how-it-works"
            eyebrow="Flow"
            title="How it works"
            body="BOTA turns wallet-owned and source-discovered identities into arena-ready fighters, then keeps battle history and rewards visible wherever users inspect the fighter."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {publicJourney.map((step, index) => (
              <NumberedStep key={step} index={index + 1} text={step} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="import-agent"
            eyebrow="Import"
            title="How to import a fighter"
            body="Import is for assets connected to the user, while public source agents remain clearly labeled by their original platform."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            {importSteps.map((step, index) => (
              <article key={step.title} className="rounded border border-border bg-card p-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-primary">Step {index + 1}</div>
                <h3 className="mt-1 text-sm font-black text-foreground">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {ownershipRules.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded border border-border bg-card p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded bg-secondary/10 text-secondary">
                        <Icon size={16} />
                      </span>
                      <h3 className="min-w-0 text-sm font-black text-foreground">{item.title}</h3>
                    </div>
                    <span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{item.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="fighter-sources"
            eyebrow="Sources"
            title="Where fighters come from"
            body="BOTA normalizes different asset and agent sources into one fighter catalog while preserving source names, ownership context, and logo badges."
          />
          <div className="mt-3 overflow-x-auto rounded border border-border bg-card">
            <div className="min-w-[780px]">
              <div className="grid grid-cols-[140px_1.25fr_1.25fr_1fr] bg-muted/60 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                <div className="border-r border-border px-3 py-2">Source</div>
                <div className="border-r border-border px-3 py-2">What BOTA reads</div>
                <div className="border-r border-border px-3 py-2">How it appears</div>
                <div className="px-3 py-2">Ownership rule</div>
              </div>
              {fighterSources.map((row) => (
                <div key={row.source} className="grid grid-cols-[140px_1.25fr_1.25fr_1fr] border-t border-border text-xs leading-5">
                  <div className="border-r border-border bg-background/60 px-3 py-2 font-black text-foreground">{row.source}</div>
                  <div className="border-r border-border px-3 py-2 font-semibold text-muted-foreground">{row.reads}</div>
                  <div className="border-r border-border px-3 py-2 font-semibold text-muted-foreground">{row.appears}</div>
                  <div className="px-3 py-2 font-semibold text-muted-foreground">{row.ownership}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded border border-primary/20 bg-primary/10 p-3">
            <div className="text-xs font-black uppercase tracking-wide text-primary">Public data rule</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              This guide focuses on what users need to understand: sources, badges, ownership, rewards, and battle modes. Internal operations and business planning are not published here.
            </p>
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="battle-modes"
            eyebrow="Arena"
            title="Simulated battles vs Prediction challenges"
            body="The platform has two main participation modes. Simulated battles run the arena. Prediction challenges let users actively take a side."
          />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {battleModes.map((mode) => {
              const Icon = mode.icon
              return (
                <article key={mode.name} className="rounded border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <Icon size={17} />
                      </span>
                      <h3 className="min-w-0 text-sm font-black text-foreground">{mode.name}</h3>
                    </div>
                    <span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
                      {mode.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{mode.body}</p>
                  <div className="mt-3 space-y-2">
                    {mode.points.map((point) => (
                      <div key={point} className="rounded bg-background/70 px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground">
                        {point}
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-4 overflow-x-auto rounded border border-border bg-card">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[150px_1fr_1fr] bg-muted/60 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                <div className="border-r border-border px-3 py-2">Area</div>
                <div className="border-r border-border px-3 py-2">Simulated Battle Mode</div>
                <div className="px-3 py-2">Prediction Challenge Mode</div>
              </div>
              {modeMatrixRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[150px_1fr_1fr] border-t border-border text-xs leading-5">
                  <div className="border-r border-border bg-background/60 px-3 py-2 font-black text-foreground">{row.label}</div>
                  <div className="border-r border-border px-3 py-2 font-semibold text-muted-foreground">{row.simulated}</div>
                  <div className="px-3 py-2 font-semibold text-muted-foreground">{row.prediction}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {mechanicsCards.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded border border-border bg-card p-3">
                  <Icon className="mb-2 text-primary" size={18} />
                  <h3 className="text-sm font-black text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="queue"
            eyebrow="Queue"
            title="Battle queue and notifications"
            body="After import, a fighter should not jump into an expired or unrelated live battle. The queue/history layer tells users what stage their fighter is in."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <article className="rounded border border-border bg-card p-3">
              <History className="mb-2 text-primary" size={18} />
              <h3 className="text-sm font-black text-foreground">Profile history</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Profile history should show imported fighters that are queued, matched, live, finished, won, lost, expired, or waiting for reward updates.
              </p>
            </article>
            <article className="rounded border border-border bg-card p-3">
              <Bell className="mb-2 text-primary" size={18} />
              <h3 className="text-sm font-black text-foreground">Notification lifecycle</h3>
              <div className="mt-2 grid gap-1.5">
                {queueNotifications.map((item) => (
                  <div key={item} className="rounded bg-background/70 px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="rewards"
            eyebrow="Rewards"
            title="BantCredit and onchain BANTC"
            body="BantCredit is the user-facing reward score. BANTC is the claimable onchain form when a wallet is included in an eligible reward batch."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {rewardCards.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded border border-border bg-card p-3">
                  <Icon className="mb-2 text-primary" size={18} />
                  <h3 className="text-sm font-black text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="marketplace"
            eyebrow="Marketplace"
            title="What can be bought and sold"
            body="The Agent Fighter Marketplace is a transfer market for BOTA fighter records, not a claim that Bantah owns every public agent it displays."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {marketplaceRules.map((rule) => (
              <article key={rule.title} className="rounded border border-border bg-card p-3">
                <Store className="mb-2 text-primary" size={18} />
                <h3 className="text-sm font-black text-foreground">{rule.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            id="badges"
            eyebrow="Identity"
            title="Source badges"
            body="Badges show where a fighter came from before entering BOTA. They should appear as logo badges across agent cards, leaderboards, battle cards, community pages, and profiles."
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sourceBadges.map((badge) => (
              <div key={badge.name} className="flex items-center gap-2 rounded border border-border bg-card p-3">
                <img
                  src={badge.logo}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-border bg-background object-cover"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-foreground">{badge.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Badge source</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

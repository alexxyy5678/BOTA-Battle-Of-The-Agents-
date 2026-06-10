import { useEffect, useMemo, useState } from "react";
import type { ArenaSide, BattleResult, NftFighter, PredictionLedger } from "./battle/types";
import { FighterImportPanel } from "./components/FighterImportPanel";
import { PredictionPanel } from "./components/PredictionPanel";
import { sampleFighters } from "./data/sampleFighters";
import { ArenaGame } from "./game/ArenaGame";
import { ARENA_COMPLETE_EVENT, emitArenaLoad, emitArenaPlay, emitArenaReset } from "./game/events";

type BattleStatus = "idle" | "running" | "complete";

export function App() {
  const [leftFighter, setLeftFighter] = useState<NftFighter>(sampleFighters[0]);
  const [rightFighter, setRightFighter] = useState<NftFighter>(sampleFighters[1]);
  const [ledger, setLedger] = useState<PredictionLedger>({ left: 25, right: 18 });
  const [stake, setStake] = useState(5);
  const [battleStatus, setBattleStatus] = useState<BattleStatus>("idle");
  const [result, setResult] = useState<BattleResult | null>(null);
  const [lastResult, setLastResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      emitArenaLoad({ left: leftFighter, right: rightFighter });
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [leftFighter, rightFighter]);

  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<BattleResult>).detail;
      setResult(detail);
      setLastResult(detail);
      setBattleStatus("complete");
    };
    window.addEventListener(ARENA_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(ARENA_COMPLETE_EVENT, onComplete);
  }, []);

  const battleApiPreview = useMemo(() => {
    if (!result) {
      return null;
    }

    return {
      battleId: result.id,
      seed: result.seed,
      winner: result.winner,
      winnerName: result.winner === "left" ? result.left.name : result.right.name,
      reason: result.reason,
      auditHash: result.auditHash,
      finalHp: result.finalHp,
      predictionPool: ledger
    };
  }, [ledger, result]);

  const handlePredict = (side: ArenaSide) => {
    if (battleStatus === "running") {
      return;
    }
    setLedger((current) => ({
      ...current,
      [side]: current[side] + stake
    }));
  };

  const startBattle = () => {
    const seed = `${leftFighter.id}:${rightFighter.id}:${ledger.left}:${ledger.right}:${Date.now()}`;
    setResult(null);
    setBattleStatus("running");
    emitArenaPlay({ left: leftFighter, right: rightFighter, seed });
  };

  const replayBattle = () => {
    if (!lastResult) {
      return;
    }
    setResult(lastResult);
    setBattleStatus("running");
    emitArenaPlay({ left: lastResult.left, right: lastResult.right, seed: lastResult.seed });
  };

  const resetArena = () => {
    setResult(null);
    setBattleStatus("idle");
    emitArenaReset();
    window.setTimeout(() => emitArenaLoad({ left: leftFighter, right: rightFighter }), 50);
  };

  return (
    <main className="arena-shell">
      <header className="topbar">
        <div>
          <p>Bantah Arena Lab</p>
          <h1>NFT PvP Prediction Arena</h1>
        </div>
        <div className={`status-pill status-${battleStatus}`}>{battleStatus}</div>
      </header>

      <section className="workspace">
        <aside className="side-column">
          <FighterImportPanel sideLabel="Fighter A" fighter={leftFighter} onChange={setLeftFighter} />
        </aside>

        <section className="stage-column">
          <ArenaGame />
          <div className="battle-controls">
            <button type="button" className="primary-button" onClick={startBattle} disabled={battleStatus === "running"}>
              Start Auto Fight
            </button>
            <button type="button" onClick={replayBattle} disabled={!lastResult || battleStatus === "running"}>
              Replay
            </button>
            <button type="button" onClick={resetArena}>
              Reset
            </button>
          </div>

          <div className="lower-grid">
            <PredictionPanel
              left={leftFighter}
              right={rightFighter}
              ledger={ledger}
              stake={stake}
              locked={battleStatus === "running"}
              result={result}
              onStakeChange={setStake}
              onPredict={handlePredict}
              onReset={() => setLedger({ left: 0, right: 0 })}
            />

            <section className="panel api-panel" aria-label="Battle result payload">
              <div className="panel-heading">
                <span>Result Payload</span>
                <small>{result ? `${result.events.length} events` : "empty"}</small>
              </div>
              <pre>{battleApiPreview ? JSON.stringify(battleApiPreview, null, 2) : "Run a battle to generate settlement payload."}</pre>
            </section>
          </div>
        </section>

        <aside className="side-column">
          <FighterImportPanel sideLabel="Fighter B" fighter={rightFighter} onChange={setRightFighter} />
        </aside>
      </section>
    </main>
  );
}

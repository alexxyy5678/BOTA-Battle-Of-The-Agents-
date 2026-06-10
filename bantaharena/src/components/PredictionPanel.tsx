import type { ArenaSide, BattleResult, NftFighter, PredictionLedger } from "../battle/types";

interface PredictionPanelProps {
  left: NftFighter;
  right: NftFighter;
  ledger: PredictionLedger;
  stake: number;
  locked: boolean;
  result: BattleResult | null;
  onStakeChange: (stake: number) => void;
  onPredict: (side: ArenaSide) => void;
  onReset: () => void;
}

export function PredictionPanel({
  left,
  right,
  ledger,
  stake,
  locked,
  result,
  onStakeChange,
  onPredict,
  onReset
}: PredictionPanelProps) {
  const total = ledger.left + ledger.right;
  const leftShare = total ? Math.round((ledger.left / total) * 100) : 50;
  const rightShare = total ? 100 - leftShare : 50;

  return (
    <section className="panel prediction-panel" aria-label="Spectator prediction pool">
      <div className="panel-heading">
        <span>Spectator Pool</span>
        <small>{locked ? "locked" : "open"}</small>
      </div>

      <div className="pool-bars">
        <div className="pool-row">
          <span>{left.name}</span>
          <strong>{ledger.left.toFixed(2)}</strong>
        </div>
        <div className="bar-track">
          <div className="bar-fill left-fill" style={{ width: `${leftShare}%` }} />
        </div>
        <div className="pool-row">
          <span>{right.name}</span>
          <strong>{ledger.right.toFixed(2)}</strong>
        </div>
        <div className="bar-track">
          <div className="bar-fill right-fill" style={{ width: `${rightShare}%` }} />
        </div>
      </div>

      <label>
        Stake
        <input
          type="number"
          min={1}
          step={1}
          value={stake}
          disabled={locked}
          onChange={(event) => onStakeChange(Math.max(1, Number(event.target.value)))}
        />
      </label>

      <div className="prediction-actions">
        <button type="button" disabled={locked} onClick={() => onPredict("left")}>
          Predict {left.name}
        </button>
        <button type="button" disabled={locked} onClick={() => onPredict("right")}>
          Predict {right.name}
        </button>
      </div>

      {result ? (
        <div className="result-strip">
          <span>Winner</span>
          <strong>{result.winner === "left" ? left.name : right.name}</strong>
          <code>{result.auditHash}</code>
        </div>
      ) : null}

      <button type="button" className="ghost-button full-width" onClick={onReset}>
        Reset Pool
      </button>
    </section>
  );
}

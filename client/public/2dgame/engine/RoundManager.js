class RoundManager {
  constructor({
    seconds,
    timerElement,
    dialogElement,
    fighters,
    onFinish = () => {},
    onRestart = () => {},
    resolveWinner = null,
    getResultContext = null,
    roundNumber = 1,
    roundLabelElement = null,
    roundDotsElement = null,
  }) {
    this.initialSeconds = seconds;
    this.remainingSeconds = seconds;
    this.timerElement = timerElement;
    this.dialogElement = dialogElement;
    this.rootElement = dialogElement?.closest?.(".bantah-fighting-game") || null;
    this.fighters = fighters;
    this.onFinish = onFinish;
    this.onRestart = onRestart;
    this.resolveWinner = resolveWinner;
    this.getResultContext = getResultContext;
    this.roundNumber = Math.max(1, Math.floor(Number(roundNumber) || 1));
    this.roundLabelElement = roundLabelElement;
    this.roundDotsElement = roundDotsElement;
    this.intervalId = null;
    this.finished = false;
    this.continueRequested = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleDialogClick = this.handleDialogClick.bind(this);
    this.handleDialogPointerDown = this.handleDialogPointerDown.bind(this);
    this.handleDialogTouchEnd = this.handleDialogTouchEnd.bind(this);
  }

  start() {
    this.renderRoundHud();
    this.renderTimer();
    window.addEventListener("keydown", this.handleKeyDown);
    this.dialogElement.addEventListener("click", this.handleDialogClick);
    this.dialogElement.addEventListener("pointerdown", this.handleDialogPointerDown);
    this.dialogElement.addEventListener("touchend", this.handleDialogTouchEnd, { passive: false });

    this.intervalId = window.setInterval(() => {
      if (this.finished) return;

      if (this.remainingSeconds > 0) {
        this.remainingSeconds -= 1;
        this.renderTimer();
      }

      if (this.remainingSeconds === 0) {
        this.finish("timeout");
      }
    }, 1000);
  }

  destroy() {
    window.clearInterval(this.intervalId);
    this.rootElement?.classList?.remove("has-result-dialog");
    window.removeEventListener("keydown", this.handleKeyDown);
    this.dialogElement.removeEventListener("click", this.handleDialogClick);
    this.dialogElement.removeEventListener("pointerdown", this.handleDialogPointerDown);
    this.dialogElement.removeEventListener("touchend", this.handleDialogTouchEnd);
  }

  update() {
    if (this.finished) return;

    if (this.hasKnockout()) {
      this.finish("ko");
    }
  }

  finish(reason = "timeout") {
    if (this.finished) return;

    this.finished = true;
    this.finishReason = reason;
    window.clearInterval(this.intervalId);
    let winner = this.resolveWinner?.({
      reason,
      fighters: this.fighters,
      remainingSeconds: this.remainingSeconds,
    });

    const [fighterA, fighterB] = this.fighters;
    let message = winner?.message || "Tie";

    if (!winner && fighterA.health > fighterB.health) {
      message = `${fighterA.displayName} Wins`;
      winner = { fighter: fighterA, message };
    } else if (!winner && fighterB.health > fighterA.health) {
      message = `${fighterB.displayName} Wins`;
      winner = { fighter: fighterB, message };
    }

    const result = { reason, winner, message, fighters: this.fighters, remainingSeconds: this.remainingSeconds };
    this.onFinish(result);
    this.renderResultDialog(message, this.getResultContext?.(result) || {});
  }

  renderResultDialog(message, context = {}) {
    const safeMessage = String(message || "Tie").replace(/\s+wins$/i, " WINS!");
    const winnerName = context.winnerName || safeMessage.replace(/\s+WINS!?$/i, "");
    const winnerAvatar = context.winnerAvatar || "";
    const earnedBantCredits = context.bantCreditsLabel || "+0";
    const spectators = context.spectatorsLabel || "0";
    const updatedRank = context.rankLabel || "#--";
    const rankDelta = context.rankDeltaLabel || "Updated";
    const rankDeltaDirection = ["up", "down", "flat"].includes(context.rankDeltaDirection)
      ? context.rankDeltaDirection
      : "flat";
    const resultReason = context.reasonLabel || "Battle Result";

    this.continueRequested = false;
    this.rootElement?.classList?.add("has-result-dialog");
    this.dialogElement.style.display = "flex";
    this.dialogElement.style.pointerEvents = "auto";
    this.dialogElement.innerHTML = "";
    this.dialogElement.setAttribute("role", "dialog");
    this.dialogElement.setAttribute("aria-modal", "true");
    this.dialogElement.setAttribute("aria-label", `${winnerName} wins`);

    const card = document.createElement("article");
    card.className = "arena-result-card";

    const header = document.createElement("div");
    header.className = "arena-result-header";

    const media = document.createElement("div");
    media.className = "arena-result-avatar";
    if (winnerAvatar) {
      const image = document.createElement("img");
      image.src = winnerAvatar;
      image.alt = `${winnerName} avatar`;
      media.append(image);
    } else {
      media.textContent = "B";
    }

    const titleBlock = document.createElement("div");
    titleBlock.className = "arena-result-title-block";

    const eyebrow = document.createElement("span");
    eyebrow.className = "arena-result-eyebrow";
    eyebrow.textContent = `🏆 ${resultReason.toUpperCase()}`;

    eyebrow.textContent = `\u{1F3C6} ${resultReason.toUpperCase()}`;

    const title = document.createElement("strong");
    title.className = "arena-result-winner";
    const winnerLabel = document.createElement("span");
    winnerLabel.className = "arena-result-winner-name";
    winnerLabel.textContent = winnerName.toUpperCase();
    const winLabel = document.createElement("span");
    winLabel.className = "arena-result-winner-status";
    winLabel.textContent = "WINS!";
    title.append(winnerLabel, winLabel);
    if (winnerLabel.textContent.length > 14) {
      title.classList.add("is-long");
    }

    titleBlock.append(eyebrow, title);
    header.append(media, titleBlock);

    const stats = document.createElement("div");
    stats.className = "arena-result-stats";
    [
      ["BantCredits", earnedBantCredits],
      ["Spectators", spectators],
      ["Updated Rank", updatedRank],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "arena-result-stat";
      const statValue = document.createElement("strong");
      statValue.textContent = value;
      const statLabel = document.createElement("span");
      statLabel.textContent = label;
      item.append(statValue, statLabel);
      stats.append(item);
    });

    const footer = document.createElement("div");
    footer.className = "arena-result-footer";
    const rankChange = document.createElement("span");
    rankChange.className = `arena-result-rank-change is-${rankDeltaDirection}`;
    const rankIcon = document.createElement("span");
    rankIcon.className = "arena-result-rank-icon";
    rankIcon.setAttribute("aria-hidden", "true");
    const rankText = document.createElement("span");
    rankText.textContent = rankDelta;
    rankChange.append(rankIcon, rankText);
    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "arena-result-continue";
    continueButton.textContent = "Tap to continue";
    continueButton.setAttribute("aria-label", "Continue to the next battle");
    continueButton.addEventListener("click", (event) => this.requestContinue(event));
    continueButton.addEventListener("touchend", (event) => this.requestContinue(event), { passive: false });
    footer.append(rankChange, continueButton);

    card.append(header, stats, footer);
    this.dialogElement.append(card);
  }

  hasKnockout() {
    return this.fighters.some((fighter) => this.isDefeated(fighter));
  }

  isDefeated(fighter) {
    return Number.isFinite(fighter.health) && fighter.health <= 0;
  }

  handleKeyDown(event) {
    if (!this.finished) return;

    const key = event.key.toLowerCase();
    if (key === "enter" || key === "r") {
      this.requestContinue(event);
    }
  }

  requestContinue(event) {
    if (!this.finished || this.continueRequested) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    this.continueRequested = true;
    this.rootElement?.classList?.remove("has-result-dialog");
    this.dialogElement.style.pointerEvents = "none";
    this.onRestart();
  }

  handleDialogClick(event) {
    this.requestContinue(event);
  }

  handleDialogPointerDown(event) {
    if (event?.pointerType === "mouse") return;
    this.requestContinue(event);
  }

  handleDialogTouchEnd(event) {
    this.requestContinue(event);
  }

  formatRemainingTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  renderTimer() {
    this.timerElement.textContent = this.formatRemainingTime(this.remainingSeconds);
  }

  renderRoundHud() {
    if (this.roundLabelElement) {
      this.roundLabelElement.textContent = `ROUND ${this.roundNumber}`;
    }

    if (!this.roundDotsElement) return;

    const dots = [...this.roundDotsElement.querySelectorAll("span")];
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index < this.roundNumber);
      dot.classList.toggle("is-current", index === this.roundNumber - 1);
    });
  }

  setRemainingSeconds(seconds) {
    if (this.finished) return;

    const nextSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
    if (nextSeconds === this.remainingSeconds) return;

    this.remainingSeconds = nextSeconds;
    this.renderTimer();

    if (this.remainingSeconds === 0) {
      this.finish("arena-round-end");
    }
  }
}

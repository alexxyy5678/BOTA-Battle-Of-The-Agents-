import { buildBotaPublicUrl } from "@/lib/botaUrl";

// Sharing utilities for social platforms with OG meta support

interface ShareData {
  title: string;
  description: string;
  url: string;
  hashtags?: string[];
}

interface ChallengeShareOptions {
  status?: string | null;
  dueDate?: string | null;
  challengerLabel?: string | null;
  opponentLabel?: string | null;
  payoutLabel?: string | null;
  chainLabel?: string | null;
  targetedWalletAddress?: string | null;
}

// Get the current domain for sharing URLs
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "https://bota.bantah.fun";
};

// Event sharing functions
export function shareEvent(eventId: string, eventTitle: string, eventDescription?: string) {
  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/event/${eventId}`;

  return {
    shareUrl,
    shareData: {
      title: `${eventTitle} | Bantah`,
      description: eventDescription || `Join this prediction on Bantah: ${eventTitle}`,
      url: shareUrl,
      hashtags: ["Bantah", "Prediction", "Challenge"],
    },
  };
}

// Challenge sharing functions
export function shareChallenge(
  challengeId: string,
  challengeTitle: string,
  stakeAmount?: string,
  options?: string | ChallengeShareOptions,
) {
  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/share/challenges/${challengeId}`;
  const normalizedOptions: ChallengeShareOptions =
    typeof options === "string"
      ? { targetedWalletAddress: options }
      : (options || {});
  const normalizedTargetWallet = typeof normalizedOptions.targetedWalletAddress === "string"
    ? normalizedOptions.targetedWalletAddress.trim().toLowerCase()
    : "";
  const shortTargetWallet = /^0x[a-f0-9]{40}$/.test(normalizedTargetWallet)
    ? `${normalizedTargetWallet.slice(0, 6)}...${normalizedTargetWallet.slice(-4)}`
    : "";

  const stakeLabel = stakeAmount ? `Stake ${stakeAmount}.` : "";
  const payoutLabel = normalizedOptions.payoutLabel ? `To win ${normalizedOptions.payoutLabel}.` : "";
  const participantLabel =
    normalizedOptions.challengerLabel && normalizedOptions.opponentLabel
      ? `${normalizedOptions.challengerLabel} vs ${normalizedOptions.opponentLabel}.`
      : "";
  const statusLabel = normalizedOptions.status ? `${normalizedOptions.status}.` : "";
  const deadlineLabel = normalizedOptions.dueDate ? `Ends ${normalizedOptions.dueDate}.` : "";
  const chainLabel = normalizedOptions.chainLabel ? `${normalizedOptions.chainLabel}.` : "";
  const targetLabel = shortTargetWallet
    ? `Target wallet ${shortTargetWallet}.`
    : "";
  const description = [
    challengeTitle,
    participantLabel,
    stakeLabel,
    payoutLabel,
    statusLabel,
    deadlineLabel,
    chainLabel,
    targetLabel,
    "Open on Bantah.",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    shareUrl,
    shareData: {
      title: `Bantah Challenge: ${challengeTitle}`,
      description,
      url: shareUrl,
      hashtags: ["Bantah", "Challenge", "Onchain", "EVM"],
    },
  };
}

// Referral sharing functions
export function shareReferral(referralCode: string, userName?: string) {
  const shareUrl = buildBotaPublicUrl(`/bota/share/ref/${encodeURIComponent(referralCode)}`);

  return {
    shareUrl,
    shareData: {
      title: `Join Bantah with ${userName || "my"} invite`,
      description: `${userName || "I"} invited you to join Bantah. Get bonus BantCredit when you sign up.`,
      url: shareUrl,
      hashtags: ["Bantah", "Referral", "JoinNow"],
    },
  };
}

export function shareBotaChallenge(challengeCode: string, title?: string, description?: string) {
  const safeCode = encodeURIComponent(challengeCode);
  const shareUrl = buildBotaPublicUrl(`/bota/share/challenge/${safeCode}`);

  return {
    shareUrl,
    shareData: {
      title: title || "BOTA Agent Challenge",
      description:
        description ||
        "A new BOTA agent PvP callout is live. Accept, watch, or predict the fight.",
      url: shareUrl,
      hashtags: ["BOTA", "BattleOfTheAgents", "AIAgents"],
    },
  };
}

export function shareBotaArenaBattle(battleId: string, title?: string, description?: string) {
  const safeBattleId = encodeURIComponent(battleId);
  const shareUrl = buildBotaPublicUrl(`/bota/share/arena/${safeBattleId}`);

  return {
    shareUrl,
    shareData: {
      title: title || "Live BOTA Arena Match",
      description:
        description ||
        "A live BOTA Arena match is running now. Watch the agents fight and earn BantCredits.",
      url: shareUrl,
      hashtags: ["BOTA", "Arena", "AIAgents"],
    },
  };
}

export function shareBotaAgentProfile(agentId: string, agentName?: string) {
  const safeAgentId = encodeURIComponent(agentId);
  const shareUrl = buildBotaPublicUrl(`/bota/share/agent/${safeAgentId}`);

  return {
    shareUrl,
    shareData: {
      title: `${agentName || "BOTA Agent"} Profile`,
      description: `View ${agentName || "this BOTA agent"}'s fighter profile, rank, wins, and challenge history.`,
      url: shareUrl,
      hashtags: ["BOTA", "AIAgents", "BattleOfTheAgents"],
    },
  };
}

export function shareBotaArenaResult(
  recordId: string,
  title?: string,
  description?: string,
  perspective: "result" | "win" | "loss" = "result",
) {
  const safeRecordId = encodeURIComponent(recordId);
  const route = perspective === "win" ? "win" : perspective === "loss" ? "loss" : "result";
  const shareUrl = buildBotaPublicUrl(`/bota/share/${route}/${safeRecordId}`);

  return {
    shareUrl,
    shareData: {
      title: title || (perspective === "loss" ? "BOTA Arena Defeat" : perspective === "win" ? "BOTA Arena Win" : "BOTA Arena Result"),
      description:
        description ||
        "A resolved BOTA Arena fight is ready to view with real result, rank, and spectator metadata.",
      url: shareUrl,
      hashtags: ["BOTA", "Arena", "AIAgents"],
    },
  };
}

// Profile sharing functions
export function shareProfile(userId: string, userName?: string) {
  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/profile/${userId}`;

  return {
    shareUrl,
    shareData: {
      title: `${userName || "User"} | Bantah Profile`,
      description: `Check out ${userName || "this user"}'s profile on Bantah.`,
      url: shareUrl,
      hashtags: ["Bantah", "Profile", "Challenge"],
    },
  };
}

// Platform-specific sharing URLs
export function getTwitterShareUrl(shareData: ShareData): string {
  const text = `${shareData.title}\n\n${shareData.description}`;
  const hashtags = shareData.hashtags?.join(",") || "";

  const params = new URLSearchParams({
    text,
    url: shareData.url,
    hashtags,
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getFarcasterShareUrl(shareData: ShareData): string {
  const text = `${shareData.title}\n\n${shareData.description}`;
  const params = new URLSearchParams({
    text,
  });
  params.append("embeds[]", shareData.url);

  return `https://warpcast.com/~/compose?${params.toString()}`;
}

export function getFacebookShareUrl(shareData: ShareData): string {
  const params = new URLSearchParams({
    u: shareData.url,
    quote: `${shareData.title} - ${shareData.description}`,
  });

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function getWhatsAppShareUrl(shareData: ShareData): string {
  const text = `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}`;

  const params = new URLSearchParams({ text });

  return `https://wa.me/?${params.toString()}`;
}

export function getTelegramShareUrl(shareData: ShareData): string {
  const text = `${shareData.title}\n\n${shareData.description}`;

  const params = new URLSearchParams({
    text,
    url: shareData.url,
  });

  return `https://t.me/share/url?${params.toString()}`;
}

export function getLinkedInShareUrl(shareData: ShareData): string {
  const params = new URLSearchParams({
    url: shareData.url,
    title: shareData.title,
    summary: shareData.description,
  });

  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

// Native Web Share API (for mobile devices)
export async function shareNative(shareData: ShareData): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareData.title,
        text: shareData.description,
        url: shareData.url,
      });
      return true;
    } catch (error) {
      console.log("Error sharing:", error);
      return false;
    }
  }
  return false;
}

// Copy to clipboard fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
}

// Generate shareable text with all platform links
export function generateShareText(shareData: ShareData): string {
  return `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}\n\nTwitter: ${getTwitterShareUrl(shareData)}\nFacebook: ${getFacebookShareUrl(shareData)}\nWhatsApp: ${getWhatsAppShareUrl(shareData)}\nTelegram: ${getTelegramShareUrl(shareData)}\n\n${shareData.hashtags ? "#" + shareData.hashtags.join(" #") : ""}`;
}

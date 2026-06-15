import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAgentName(name?: string | null) {
  if (!name) return "Unknown Agent";
  
  let displayName = name;
  
  if (name.includes(":")) {
    const parts = name.split(":");
    displayName = parts[parts.length - 1];
  }
  
  if (displayName.length > 16 && (displayName.startsWith("0x") || /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(displayName) || /^[a-zA-Z0-9]{30,}$/.test(displayName))) {
    return `${displayName.slice(0, 6)}...${displayName.slice(-4)}`;
  }
  
  return displayName;
}

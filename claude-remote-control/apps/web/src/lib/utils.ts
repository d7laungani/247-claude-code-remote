import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strip protocol (http://, https://, ws://, wss://) from a URL
 * Returns just the host:port/path portion
 */
export function stripProtocol(url: string): string {
  return url.replace(/^(https?|wss?):\/\//, '');
}

/**
 * Check if a URL points to a private/local network address
 * (localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 100.x Tailscale CGNAT)
 */
function isPrivateAddress(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.startsWith('127.') ||
    url.startsWith('10.') ||
    url.startsWith('172.') ||
    url.startsWith('192.168.') ||
    url.startsWith('100.')
  );
}

/**
 * Build a WebSocket URL from an agent URL
 * Handles both URLs with and without protocol
 */
export function buildWebSocketUrl(agentUrl: string, path: string): string {
  const cleanUrl = stripProtocol(agentUrl);
  const wsProtocol = isPrivateAddress(cleanUrl) ? 'ws' : 'wss';
  return `${wsProtocol}://${cleanUrl}${path}`;
}

/**
 * Build an HTTP API URL from an agent URL
 * Handles both URLs with and without protocol
 */
export function buildApiUrl(agentUrl: string, path: string): string {
  const cleanUrl = stripProtocol(agentUrl);
  const protocol = isPrivateAddress(cleanUrl) ? 'http' : 'https';
  return `${protocol}://${cleanUrl}${path}`;
}

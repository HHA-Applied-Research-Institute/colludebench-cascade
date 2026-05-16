/**
 * ColludeBench — Topology & Visibility Filter
 */

import type { RoundHistory } from "./types";

export function getVisibleAgents(agentId: number, adjacencyList: Map<number, number[]>): number[] {
  return adjacencyList.get(agentId) || [];
}

export function filterHistoryForAgent(
  agentId: number,
  fullHistory: RoundHistory,
  adjacencyList: Map<number, number[]>
): RoundHistory {
  const visible = getVisibleAgents(agentId, adjacencyList);
  const filtered: RoundHistory = new Map();
  for (const [id, actions] of fullHistory) {
    if (visible.includes(id)) {
      filtered.set(id, actions);
    }
  }
  return filtered;
}

export function filterMessagesForAgent(
  agentId: number,
  allMessages: Map<number, string>,
  adjacencyList: Map<number, number[]>,
  communicationType: string,
  teams?: Map<string, number[]>
): Map<number, string> {
  const filtered = new Map<number, string>();

  if (communicationType === "none") return filtered;

  if (communicationType === "public") {
    for (const [id, msg] of allMessages) {
      if (id !== agentId && msg) filtered.set(id, msg);
    }
    return filtered;
  }

  if (communicationType === "team-only" && teams) {
    let myTeam: number[] = [];
    for (const [, members] of teams) {
      if (members.includes(agentId)) {
        myTeam = members;
        break;
      }
    }
    for (const [id, msg] of allMessages) {
      if (id !== agentId && myTeam.includes(id) && msg) filtered.set(id, msg);
    }
    return filtered;
  }

  // "hierarchical" or "private" — use adjacency list
  const visible = getVisibleAgents(agentId, adjacencyList);
  for (const [id, msg] of allMessages) {
    if (visible.includes(id) && msg) filtered.set(id, msg);
  }
  return filtered;
}

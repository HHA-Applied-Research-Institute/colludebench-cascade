/**
 * ColludeBench Multi-Agent Experiment Runner — Type Definitions
 */

export interface ExperimentConfig {
  id: string;
  category: string;

  // Agents
  agentCount: number;
  defectorAgentIds: number[];

  // Game
  gameType: string;
  systemPrompt: string;
  responseType: "number" | "cooperate-defect" | "instruction";

  // Topology
  adjacencyList: Map<number, number[]>;

  // Communication
  communicationType: "none" | "public" | "private" | "team-only" | "hierarchical";

  // Team (optional)
  teams?: Map<string, number[]>;
  agentRoles?: Map<number, string>;

  // Execution
  rounds: number;
  repetitions: number;

  // Prompts
  userPromptTemplate: string;
  defectionSentence: string;

  // Defection timing (for F-series trust recovery)
  defectionStartRound?: number;
  defectionEndRound?: number;

  // Permanent defectors (always defect regardless of timing window — F4 cascade reversal)
  permanentDefectorIds?: number[];

  // Information ablation fields (Stage 4 — 2x2 factorial)
  // historyDepth: how many past rounds to include in the prompt
  //   Infinity (default) = full history, 1 = last round only
  historyDepth?: number;
  // feedbackLevel: how much market information agents receive per round
  //   "rich" (default) = price + demand + profit per agent
  //   "minimal" = rival prices + own profit only (no demand/units)
  feedbackLevel?: "rich" | "minimal";

  // Discrete pricing grid (Calvano 15-level). When set, agent responses
  // are snapped to the nearest grid point after parsing.
  discretePriceGrid?: number[];

  // Price assigned on parse failure. Defaults to Nash equilibrium for the
  // condition (conservative: biases toward competition, not cooperation).
  parseFailureDefault?: number;
}

export interface AgentResponse {
  agentId: number;
  rawOutput: string;
  reasoning: string;
  action: string | number;
  parseSuccess: boolean;
  latencyMs: number;
  isDefector: boolean;
  message?: string;
  /** Stderr / error message from inference when call failed (undefined on success). */
  inferenceError?: string;
  /** Number of inference attempts used (1 = first attempt succeeded; >1 = retries fired). */
  attemptsUsed?: number;
  /** True if any retry attempt matched the rate-limit signature in stderr. */
  rateLimitDetected?: boolean;
}

export interface RoundResult {
  roundIndex: number;
  agents: AgentResponse[];
  timestamp: string;
}

export interface ExperimentResult {
  config: ExperimentConfig;
  rounds: RoundResult[];
  repetitionIndex: number;
  startTime: string;
  endTime: string;
}

export type RoundHistory = Map<number, (string | number)[]>;

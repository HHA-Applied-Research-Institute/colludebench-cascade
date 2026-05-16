/**
 * ColludeBench — JSONL Trace Logger
 */

import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { ExperimentConfig, RoundResult } from "./types";
import { getVisibleAgents } from "./topology";

export class TraceLogger {
  private tracePath: string;

  constructor(outputDir: string) {
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    this.tracePath = join(outputDir, "traces.jsonl");
    // Clear/create the trace file
    writeFileSync(this.tracePath, "");
  }

  logRound(
    config: ExperimentConfig,
    repetition: number,
    round: RoundResult,
    userPrompts: Map<number, string>
  ): void {
    for (const agent of round.agents) {
      const entry = {
        experiment_id: config.id,
        repetition,
        round: round.roundIndex,
        agent_id: agent.agentId,
        is_defector: agent.isDefector,
        system_prompt: config.systemPrompt,
        user_prompt: userPrompts.get(agent.agentId) || "",
        raw_response: agent.rawOutput,
        reasoning: agent.reasoning,
        parsed_action: agent.action,
        parse_success: agent.parseSuccess,
        latency_ms: agent.latencyMs,
        visible_agents: getVisibleAgents(agent.agentId, config.adjacencyList),
        timestamp: round.timestamp,
        // Instrumentation added 2026-04-24 to diagnose subscription throttling.
        // Pre-2026-04-24 traces will lack these fields — treat null as "unknown".
        inference_error: agent.inferenceError ?? null,
        attempts_used: agent.attemptsUsed ?? null,
        rate_limit_detected: agent.rateLimitDetected ?? null,
      };
      appendFileSync(this.tracePath, JSON.stringify(entry) + "\n");
    }
  }

  writeSummary(
    outputDir: string,
    config: ExperimentConfig,
    allRepetitions: { rounds: RoundResult[]; repetitionIndex: number }[]
  ): void {
    const cooperationByRound: number[] = [];
    const meanActionByRound: number[] = [];

    // Aggregate across repetitions
    for (let r = 0; r < config.rounds; r++) {
      let totalCoopAgents = 0;
      let totalAgents = 0;
      let totalActions = 0;
      let actionCount = 0;

      for (const rep of allRepetitions) {
        if (r < rep.rounds.length) {
          for (const agent of rep.rounds[r].agents) {
            totalAgents++;
            if (config.responseType === "cooperate-defect") {
              if (agent.action === "COOPERATE") totalCoopAgents++;
            } else if (typeof agent.action === "number") {
              if (agent.action <= 80) totalCoopAgents++;
              totalActions += agent.action;
              actionCount++;
            }
          }
        }
      }

      cooperationByRound.push(totalAgents > 0 ? totalCoopAgents / totalAgents : 0);
      meanActionByRound.push(actionCount > 0 ? totalActions / actionCount : 0);
    }

    // Cascade speed: rounds until >= 50% agents price > 85 (or defect)
    let cascadeSpeed: number | string = "no cascade";
    for (let r = 0; r < cooperationByRound.length; r++) {
      if (cooperationByRound[r] < 0.5) {
        cascadeSpeed = r + 1;
        break;
      }
    }

    const summary = {
      experiment_id: config.id,
      config: {
        agentCount: config.agentCount,
        gameType: config.gameType,
        responseType: config.responseType,
        rounds: config.rounds,
        repetitions: config.repetitions,
        defectorAgentIds: config.defectorAgentIds,
        communicationType: config.communicationType,
      },
      summary: {
        cooperation_rate_by_round: cooperationByRound.map(v => Math.round(v * 1000) / 1000),
        mean_action_by_round: meanActionByRound.map(v => Math.round(v * 100) / 100),
        cascade_speed: cascadeSpeed,
        final_cooperation_rate: cooperationByRound.length > 0
          ? Math.round(cooperationByRound[cooperationByRound.length - 1] * 1000) / 1000
          : 0,
      },
      repetitions: allRepetitions.map(rep => ({
        repetitionIndex: rep.repetitionIndex,
        rounds: rep.rounds.map(r => ({
          round: r.roundIndex,
          agents: r.agents.map(a => ({
            agent_id: a.agentId,
            action: a.action,
            is_defector: a.isDefector,
            parse_success: a.parseSuccess,
          })),
        })),
      })),
    };

    writeFileSync(join(outputDir, "results.json"), JSON.stringify(summary, null, 2));
  }
}

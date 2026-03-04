import { useZenStore } from '../store/zenStore';

const avg = (currentAvg: number | null, currentSamples: number, nextValue: number): number => {
  if (currentAvg === null || currentSamples <= 0) return nextValue;
  return ((currentAvg * currentSamples) + nextValue) / (currentSamples + 1);
};

export const telemetry = {
  markSessionStart() {
    const now = Date.now();
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      sessionsStarted: metrics.sessionsStarted + 1,
      currentSessionStartedAt: now,
      lastTtfbMs: null,
      lastInterruptionAt: null,
      lastInterruptionRecoveryMs: null,
    }));
  },

  markFirstAudioChunk() {
    const now = Date.now();
    useZenStore.getState().updateMetrics((metrics) => {
      if (!metrics.currentSessionStartedAt) return metrics;
      if (metrics.lastTtfbMs !== null) return metrics;

      const ttfb = Math.max(0, now - metrics.currentSessionStartedAt);
      return {
        ...metrics,
        lastTtfbMs: ttfb,
        avgTtfbMs: avg(metrics.avgTtfbMs, metrics.ttfbSamples, ttfb),
        ttfbSamples: metrics.ttfbSamples + 1,
      };
    });
  },

  markInterruption() {
    const now = Date.now();
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      interruptions: metrics.interruptions + 1,
      lastInterruptionAt: now,
    }));
  },

  markInterruptionRecovery(recoveryMs: number) {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      lastInterruptionRecoveryMs: recoveryMs,
      avgInterruptionRecoveryMs: avg(
        metrics.avgInterruptionRecoveryMs,
        metrics.interruptionRecoverySamples,
        recoveryMs
      ),
      interruptionRecoverySamples: metrics.interruptionRecoverySamples + 1,
    }));
  },

  markReconnectAttempt() {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      reconnectAttempts: metrics.reconnectAttempts + 1,
    }));
  },

  markReconnectSuccess() {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      reconnectSuccesses: metrics.reconnectSuccesses + 1,
    }));
  },

  markAuthRequest() {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      authRequests: metrics.authRequests + 1,
    }));
  },

  markAuthFailure() {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      authFailures: metrics.authFailures + 1,
    }));
  },

  markVisionFrame(sent: boolean) {
    useZenStore.getState().updateMetrics((metrics) => ({
      ...metrics,
      visionFramesSent: metrics.visionFramesSent + (sent ? 1 : 0),
      visionFramesDropped: metrics.visionFramesDropped + (sent ? 0 : 1),
    }));
  },
};

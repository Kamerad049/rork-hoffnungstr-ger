const APP_BOOT_TIME = Date.now();

const timings: Record<string, number> = {};
const renderCounts: Record<string, number> = {};
const networkLogs: Array<{ label: string; ms: number; ok: boolean; error?: string }> = [];

export function markTime(label: string) {
  timings[label] = Date.now();
  const sinceBootMs = timings[label] - APP_BOOT_TIME;
  console.log(`[PERF] ⏱ ${label}: +${sinceBootMs}ms since boot`);
}

export function measureSinceBoot(label: string): number {
  const ms = Date.now() - APP_BOOT_TIME;
  console.log(`[PERF] 📊 ${label}: ${ms}ms since boot`);
  return ms;
}

export function measureSince(startLabel: string, endLabel: string): number {
  const start = timings[startLabel];
  if (!start) {
    console.log(`[PERF] ⚠ No start mark for "${startLabel}"`);
    return -1;
  }
  const ms = Date.now() - start;
  console.log(`[PERF] 📊 ${startLabel} → ${endLabel}: ${ms}ms`);
  return ms;
}

export function trackRender(componentName: string) {
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
  const count = renderCounts[componentName];
  if (count <= 5 || count % 10 === 0) {
    console.log(`[PERF] 🔄 ${componentName} render #${count}`);
  }
}

export async function trackNetwork<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    networkLogs.push({ label, ms, ok: true });
    console.log(`[PERF] 🌐 ${label}: ${ms}ms ✅`);
    return result;
  } catch (e: any) {
    const ms = Date.now() - start;
    networkLogs.push({ label, ms, ok: false, error: e?.message });
    console.log(`[PERF] 🌐 ${label}: ${ms}ms ❌ ${e?.message}`);
    throw e;
  }
}

export function printReport() {
  console.log('\n[PERF] ═══════════════════════════════════════');
  console.log('[PERF]        PERFORMANCE REPORT');
  console.log('[PERF] ═══════════════════════════════════════');

  console.log('\n[PERF] ── Startup Timings ──');
  const sortedTimings = Object.entries(timings)
    .map(([label, ts]) => ({ label, ms: ts - APP_BOOT_TIME }))
    .sort((a, b) => a.ms - b.ms);
  for (const { label, ms } of sortedTimings) {
    console.log(`[PERF]   ${label.padEnd(35)} ${String(ms).padStart(6)}ms`);
  }

  console.log('\n[PERF] ── Render Counts ──');
  const sortedRenders = Object.entries(renderCounts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedRenders) {
    console.log(`[PERF]   ${name.padEnd(35)} ${String(count).padStart(4)} renders`);
  }

  console.log('\n[PERF] ── Network Requests ──');
  if (networkLogs.length === 0) {
    console.log('[PERF]   (no requests tracked yet)');
  } else {
    for (const log of networkLogs) {
      const status = log.ok ? '✅' : '❌';
      console.log(`[PERF]   ${log.label.padEnd(35)} ${String(log.ms).padStart(6)}ms ${status}${log.error ? ' ' + log.error : ''}`);
    }
    const okLogs = networkLogs.filter((l) => l.ok);
    if (okLogs.length > 0) {
      const avg = Math.round(okLogs.reduce((s, l) => s + l.ms, 0) / okLogs.length);
      console.log(`[PERF]   ${'Average (success)'.padEnd(35)} ${String(avg).padStart(6)}ms`);
    }
    const failCount = networkLogs.filter((l) => !l.ok).length;
    console.log(`[PERF]   Errors/retries: ${failCount}`);
  }

  console.log('\n[PERF] ── Provider Count ──');
  console.log('[PERF]   Total nested providers: 8 (flat via composeProviders)');

  console.log('[PERF] ═══════════════════════════════════════\n');
}

export function getBootTime() {
  return APP_BOOT_TIME;
}

export function getRenderCounts() {
  return { ...renderCounts };
}

export function getNetworkLogs() {
  return [...networkLogs];
}

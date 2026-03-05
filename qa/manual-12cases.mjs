import { chromium } from "@playwright/test";

const APP_URL = "http://127.0.0.1:5000";
const CASE_TIMEOUT_MS = 75_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function isVisible(locator, timeout = 5000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function waitForEither(page, options, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    // eslint-disable-next-line no-await-in-loop
    for (const option of options) {
      // eslint-disable-next-line no-await-in-loop
      if (await option()) return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
  }
  return false;
}

async function waitForGuestStep(page) {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  const guestButton = page.getByRole("button", { name: /Trải nghiệm ẩn danh|Continue as Guest/i });
  await guestButton.waitFor({ state: "visible", timeout: 25_000 });
  await guestButton.click();
  await page.getByText(/Thiết lập kết nối|Connection setup/i).waitFor({ state: "visible", timeout: 10_000 });
}

async function togglePermissionOption(page, labelRegex) {
  const heading = page.getByRole("heading", { name: labelRegex });
  if (!(await isVisible(heading, 3000))) return false;
  await heading.click();
  return true;
}

async function completePermissionStep(page) {
  const startButton = page.getByRole("button", { name: /Bắt đầu hành trình|Begin session/i });
  await startButton.waitFor({ state: "visible", timeout: 10_000 });
  await startButton.click();

  const ok = await waitForEither(
    page,
    [
      () => isVoiceMode(page, 300),
      () => isTextMode(page, 300),
    ],
    20_000
  );
  assert(ok, "Onboarding did not complete into voice/text mode");
}

async function isVoiceMode(page, timeout = 6000) {
  return isVisible(
    page.locator('button[aria-label="Bắt đầu"], button[aria-label="Dừng nghe"]'),
    timeout
  );
}

async function isTextMode(page, timeout = 6000) {
  return isVisible(
    page.locator('input[placeholder*="Chia sẻ"], input[placeholder*="Share with me"]'),
    timeout
  );
}

async function clickVoiceButton(page) {
  const voiceButton = page.locator('button[aria-label="Bắt đầu"], button[aria-label="Dừng nghe"]').first();
  await voiceButton.waitFor({ state: "visible", timeout: 10_000 });
  await voiceButton.click();
}

async function launchSession({
  fakeDevice = true,
  fakeUi = true,
  grantPermissions = [],
  initScript = null,
} = {}) {
  const args = ["--autoplay-policy=no-user-gesture-required"];
  if (fakeDevice) args.push("--use-fake-device-for-media-stream");
  if (fakeUi) args.push("--use-fake-ui-for-media-stream");

  const browser = await chromium.launch({
    headless: true,
    args,
  });
  const context = await browser.newContext();
  if (grantPermissions.length) {
    await context.grantPermissions(grantPermissions, { origin: APP_URL });
  } else {
    await context.clearPermissions();
  }
  const page = await context.newPage();
  if (initScript) {
    await page.addInitScript(initScript);
  }
  return { browser, context, page };
}

async function runCase(name, fn) {
  const started = Date.now();
  try {
    await Promise.race([
      fn(),
      (async () => {
        await sleep(CASE_TIMEOUT_MS);
        throw new Error(`Case timeout after ${CASE_TIMEOUT_MS}ms`);
      })(),
    ]);
    return {
      name,
      status: "PASS",
      durationMs: Date.now() - started,
      note: "",
    };
  } catch (error) {
    return {
      name,
      status: "FAIL",
      durationMs: Date.now() - started,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

const cases = [
  {
    name: "C01_MicGranted_DefaultVoiceMode",
    fn: async () => {
      const { browser, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        assert(await isVoiceMode(page), "Expected voice mode after mic permission granted");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C02_MicDenied_FallbackTextMode",
    fn: async () => {
      const { browser, page } = await launchSession({
        fakeDevice: true,
        fakeUi: false,
        grantPermissions: ["camera"],
      });
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        assert(await isTextMode(page), "Expected text mode when microphone permission denied");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C03_MicGranted_CameraDenied_StillUsable",
    fn: async () => {
      const { browser, page } = await launchSession({
        fakeDevice: true,
        fakeUi: false,
        grantPermissions: ["microphone"],
      });
      try {
        await waitForGuestStep(page);
        await togglePermissionOption(page, /Thị giác|Vision/i);
        await completePermissionStep(page);
        assert(await isVoiceMode(page), "Expected voice mode even when camera permission denied");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C04_MicOff_CamOff_StaysTextMode",
    fn: async () => {
      const { browser, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await togglePermissionOption(page, /Giọng nói|Voice/i);
        await completePermissionStep(page);
        assert(await isTextMode(page), "Expected text mode when both mic/camera disabled in onboarding");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C05_CameraScanDenied_ShowsWarning",
    fn: async () => {
      const { browser, page } = await launchSession({
        fakeDevice: true,
        fakeUi: false,
        grantPermissions: ["microphone"],
      });
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        const scanButton = page.getByRole("button", { name: /Scan Environment/i });
        await scanButton.waitFor({ state: "visible", timeout: 10_000 });
        await scanButton.click();
        const warned = await waitForEither(
          page,
          [
            () => isVisible(page.getByText(/Cần quyền Camera/i), 1000),
            () => isVisible(page.getByText(/camera permission/i), 1000),
          ],
          10_000
        );
        assert(warned, "Expected warning when Camera Scan permission is denied");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C06_NoMicHardware_FallbackTextMode",
    fn: async () => {
      const { browser, page } = await launchSession({
        initScript: () => {
          const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = async (constraints) => {
            const audioRequested =
              constraints &&
              typeof constraints === "object" &&
              "audio" in constraints &&
              Boolean(constraints.audio);
            if (audioRequested) {
              throw new DOMException("No microphone", "NotFoundError");
            }
            return original(constraints);
          };
        },
      });
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        assert(await isTextMode(page), "Expected text mode when microphone hardware is unavailable");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C07_NoCamHardware_MicStillWorks",
    fn: async () => {
      const { browser, page } = await launchSession({
        initScript: () => {
          const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = async (constraints) => {
            const videoRequested =
              constraints &&
              typeof constraints === "object" &&
              "video" in constraints &&
              Boolean(constraints.video);
            if (videoRequested) {
              throw new DOMException("No camera", "NotFoundError");
            }
            return original(constraints);
          };
        },
      });
      try {
        await waitForGuestStep(page);
        await togglePermissionOption(page, /Thị giác|Vision/i);
        await completePermissionStep(page);
        assert(await isVoiceMode(page), "Expected voice mode when camera unavailable but mic available");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C08_OfflineEvent_ShowsReconnecting",
    fn: async () => {
      const { browser, context, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        await clickVoiceButton(page);
        await sleep(1200);
        await context.setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event("offline")));
        const offlineHandled = await waitForEither(
          page,
          [
            () => isVisible(page.getByText(/Đang kết nối lại|Reconnecting/i), 1000),
            () => isVisible(page.getByText(/Thử lại lần|Mất kết nối mạng/i), 1000),
          ],
          12_000
        );
        assert(offlineHandled, "Expected offline handling signal (reconnect or retry message)");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C09_OnlineRecovery_ClearsReconnecting",
    fn: async () => {
      const { browser, context, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        await clickVoiceButton(page);
        await sleep(1200);
        await context.setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event("offline")));
        const enteredRecoveryFlow = await waitForEither(
          page,
          [
            () => isVisible(page.getByText(/Đang kết nối lại|Reconnecting/i), 1000),
            () => isVisible(page.getByText(/Thử lại lần|Mất kết nối mạng/i), 1000),
          ],
          12_000
        );
        assert(enteredRecoveryFlow, "Recovery flow did not start after offline transition");
        await context.setOffline(false);
        await page.evaluate(() => window.dispatchEvent(new Event("online")));
        await sleep(4000);
        await clickVoiceButton(page);
        const controlsAlive = await isVisible(
          page.locator('button[aria-label="Bắt đầu"], button[aria-label="Dừng nghe"]'),
          6000
        );
        assert(controlsAlive, "Voice controls are not responsive after online recovery");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C10_BackgroundResume_ControlsResponsive",
    fn: async () => {
      const { browser, context, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        await clickVoiceButton(page);
        await sleep(1000);

        const page2 = await context.newPage();
        await page2.goto("about:blank");
        await page2.bringToFront();
        await sleep(1200);
        await page.bringToFront();
        await sleep(800);

        await clickVoiceButton(page);
        const stillInteractive = await isVisible(page.locator('button[aria-label="Bắt đầu"], button[aria-label="Dừng nghe"]'), 4000);
        assert(stillInteractive, "Voice controls became unresponsive after background/foreground cycle");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C11_ManualDisconnectReconnect_CycleStable",
    fn: async () => {
      const { browser, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        await clickVoiceButton(page);
        await sleep(1400);
        await clickVoiceButton(page);
        const backToStart = await isVisible(page.locator('button[aria-label="Bắt đầu"]'), 5000);
        assert(backToStart, "Expected voice button to return to start state after manual disconnect");
        await clickVoiceButton(page);
        const restarted = await isVisible(page.locator('button[aria-label="Dừng nghe"], button[aria-label="Bắt đầu"]'), 6000);
        assert(restarted, "Expected manual reconnect cycle to start again");
      } finally {
        await browser.close();
      }
    },
  },
  {
    name: "C12_ReloadAndReenter_OnboardingFlowStable",
    fn: async () => {
      const { browser, page } = await launchSession();
      try {
        await waitForGuestStep(page);
        await completePermissionStep(page);
        assert(await isVoiceMode(page), "Initial session did not reach voice mode");

        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForGuestStep(page);
        await completePermissionStep(page);
        const ready = await waitForEither(page, [() => isVoiceMode(page), () => isTextMode(page)], 12_000);
        assert(ready, "App did not become interactive after reload + re-onboarding");
      } finally {
        await browser.close();
      }
    },
  },
];

const results = [];
for (const item of cases) {
  // eslint-disable-next-line no-await-in-loop
  const result = await runCase(item.name, item.fn);
  results.push(result);
  const summary = `${result.status} ${result.name} (${result.durationMs}ms)${result.note ? ` - ${result.note}` : ""}`;
  // eslint-disable-next-line no-console
  console.log(summary);
}

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.length - passed;
const status = failed === 0 ? "PASS" : "FAIL";

const output = {
  status,
  total: results.length,
  passed,
  failed,
  results,
  executedAt: new Date().toISOString(),
};

// eslint-disable-next-line no-console
console.log("\n=== QA_SUMMARY_JSON_START ===");
// eslint-disable-next-line no-console
console.log(JSON.stringify(output, null, 2));
// eslint-disable-next-line no-console
console.log("=== QA_SUMMARY_JSON_END ===");

# Voice/Mic/Audio Permission QA - 12 Cases

Run date: March 4, 2026  
Environment: local (`frontend: http://127.0.0.1:5000`, `backend: http://127.0.0.1:8080`)  
Runner: Playwright headless checklist (`qa/manual-12cases.mjs`)

## Result

- Overall: `PASS`
- Passed: `12/12`
- Failed: `0/12`

## Checklist

1. `C01_MicGranted_DefaultVoiceMode` - PASS  
Guest onboarding with default mic enabled enters voice mode.

2. `C02_MicDenied_FallbackTextMode` - PASS  
When mic permission is denied, app falls back to text mode.

3. `C03_MicGranted_CameraDenied_StillUsable` - PASS  
Mic-only permission with camera denied still allows usable voice flow.

4. `C04_MicOff_CamOff_StaysTextMode` - PASS  
If both mic and cam are disabled in onboarding, app stays in text mode.

5. `C05_CameraScanDenied_ShowsWarning` - PASS  
CameraScan action without camera permission shows warning instead of crashing.

6. `C06_NoMicHardware_FallbackTextMode` - PASS  
Simulated `NotFoundError` for audio device falls back safely to text mode.

7. `C07_NoCamHardware_MicStillWorks` - PASS  
Simulated no-camera hardware does not block mic-driven voice flow.

8. `C08_OfflineEvent_ShowsReconnecting` - PASS  
Offline transition shows reconnect/retry handling signals.

9. `C09_OnlineRecovery_ClearsReconnecting` - PASS  
After network recovery, voice controls remain responsive and recoverable.

10. `C10_BackgroundResume_ControlsResponsive` - PASS  
Background/foreground cycle keeps voice controls responsive.

11. `C11_ManualDisconnectReconnect_CycleStable` - PASS  
Manual start-stop-start voice cycle remains stable.

12. `C12_ReloadAndReenter_OnboardingFlowStable` - PASS  
Reload and re-onboarding flow remains interactive and stable.

## Re-run

```bash
node qa/manual-12cases.mjs
```

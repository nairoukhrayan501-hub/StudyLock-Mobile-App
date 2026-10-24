---
name: StudyLock native blocking boundary
description: Product constraint for accurately representing app-blocking support.
---

StudyLock must never claim that other apps are blocked unless native system permissions and platform behavior are implemented and verified. In the Expo preview build, app blocking is unavailable; keep that limitation visible and provide focus tools as an honest alternative.

**Why:** The product brief requires real OS-level blocking and explicitly forbids a simulated blocker.

**How to apply:** Before showing blocking as active, implement and validate the appropriate Android/iOS native adapters and permission flows; otherwise continue showing an unsupported status.

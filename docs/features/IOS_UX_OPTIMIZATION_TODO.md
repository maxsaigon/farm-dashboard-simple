# iOS-Like UX Optimization Plan for Farm Manager (Web)

Goal: Elevate the Next.js (React) app to feel closer to a native iOS SwiftUI experience while keeping the current architecture and data model intact. This plan is incremental, developer-friendly, and focused on highest impact for mobile-first users.

Scope reviewed
- App Router and layout: `app/layout.tsx`, `app/page.tsx`, route pages under `app/*`
- Core components: `components/*` (MobileLayout, Navigation, TreeList/TreeDetail, Map/OpenStreetMap/MapWrapper, PhotoManagement, OptimizedPhotoViewer, ImageGallery, MobileCameraCapture, Zone/User/Admin management)
- Lib/services: `lib/*` (firebase, storage, photo-service, auth, enhanced-auth-service)
- PWA and styles: `public/manifest.json`, `tailwind.config.ts`, `next.config.mjs`
- Tests: `e2e/*`, helper scripts, testing guide and prior Playwright report

Key themes
- Visual: iOS design tokens, large titles, unified spacing, rounded cards, soft shadows, blur
- Motion: subtle physics-based transitions, bottom sheets, gesture navigation, pull-to-refresh
- Navigation: tab bar, large title + inline scroller, edge-to-edge layouts with safe areas
- Performance: virtualization for lists, image optimization, offline cache
- Accessibility & Vietnamese typography: dynamic type, hit targets, screen reader labels


## Phase 0 – Quick wins (1–2 days)
- [ ] Adopt iOS system font stack globally (app-wide)
  - Change body font to `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, ...` for immediate iOS feel
  - Files: `app/globals.css` (or global styles location), keep local Geist for headings if desired
  - Acceptance: Visual change on iOS Safari; text metrics closer to native apps

- [ ] Large title pattern on mobile pages
  - Use large title (34px/semibold) where applicable with collapse to compact on scroll
  - Files: `components/MobileLayout.tsx` (header), page headers (Trees, Map)
  - Acceptance: On initial load, large title; on scroll down past threshold, compact title

- [ ] Touch states and hit targets
  - Ensure all tappable items have min 44x44pt; Tailwind already defines `min-w/min-h touch`
  - Add active/pressed states (scale 98, opacity) and reduce hover-only cues for mobile
  - Files: `components/*` lists, action buttons
  - Acceptance: Every button/list item has visible pressed feedback; Lighthouse tap target OK

- [ ] Debounced search with `useDeferredValue`
  - Reduce input jitter; add 250ms debounce or React `useDeferredValue` for smoother updates
  - Files: `components/TreeList.tsx`
  - Acceptance: Typing remains smooth on low-end devices; no visible list jank

- [ ] Next.js `next/image` for all user-facing images
  - Replace raw `<img>`/background images inside gallery/preview with `next/image` for better perf and caching
  - Files: `components/ImageGallery.tsx`, `components/TreeImagePreview.tsx`, `components/OptimizedPhotoViewer.tsx`
  - Acceptance: Images lazy load, correct sizes, CLS reduced


## Phase 1 – Navigation & structure (2–4 days)
- [ ] iOS tab bar polish (active pill, haptics, safe-area)
  - Improve `MobileLayout` bottom nav: add active background pill, ensure safe-area padding, vibration API for taps
  - Files: `components/MobileLayout.tsx`, `tailwind.config.ts`
  - Acceptance: Tab tap animates with spring; respects `env(safe-area-inset-bottom)`

- [ ] Edge-swipe back navigation
  - Implement left-edge horizontal swipe to go back on mobile using `history.back()` with `pointerevents` or `use-gesture`
  - Files: app shell (`app/layout.tsx`) + a small hook
  - Acceptance: From any detail page, swiping from left edge navigates back

- [ ] Modal and sheet hierarchy
  - Introduce a Bottom Sheet primitive (detents: full, 60%, 25%), backdrop blur, drag-to-dismiss
  - Use for: TreeDetail (mobile), Filters, Photo viewer info
  - Files: new `components/ui/BottomSheet.tsx` + integrate into `TreeDetail`, `ImageGallery`
  - Acceptance: Smooth drag; sheet snaps to detents; scrollable content within

- [ ] Large-title + inline search
  - Move search into a collapsible header area that transitions to an inline compact search on scroll
  - Files: `components/TreeList.tsx`, `components/MobileLayout.tsx`
  - Acceptance: Search animates between large (prominent) and compact (inline)


## Phase 2 – Motion & gestures (3–5 days)
- [ ] Motion system via Framer Motion
  - Add page transitions, list item entrance, press/tap micro-interactions, modal transitions
  - Files: `components/*` around navigation, sheets, cards
  - Acceptance: 60fps animations; `prefers-reduced-motion` respected

- [ ] Swipe actions on list items (iOS Mail style)
  - Enable left/right swipe to reveal quick actions (Edit, Details)
  - Files: `components/TreeList.tsx`
  - Acceptance: Swipe reveals actions with resistance; tap outside restores

- [ ] Pull to refresh
  - Implement pull-to-refresh for lists and map content using an overlay indicator
  - Files: `components/TreeList.tsx`, `app/map/page.tsx`
  - Acceptance: Pull gesture triggers refetch; indicator matches iOS behavior

- [ ] Photo viewer: pinch-to-zoom + swipe to dismiss
  - Implement `transform-origin` zoom with double-tap zoom and vertical swipe to close
  - Files: `components/OptimizedPhotoViewer.tsx`
  - Acceptance: Smooth pinch, rubber-banding; vertical swipe dismiss with backdrop fade


## Phase 3 – High-value flows (4–7 days)
- [ ] TreeList performance: virtualization
  - Replace client-side pagination with windowing using `@tanstack/react-virtual` (or `react-window`) to render large lists efficiently
  - Files: `components/TreeList.tsx`
  - Acceptance: 5,000 items remain smooth (<50ms input latency) on mid-tier phones

- [ ] Map + bottom sheet master-detail
  - On mobile, show map full-screen with a draggable bottom sheet for TreeList or TreeDetail
  - Files: `app/map/page.tsx`, `components/MapWrapper.tsx`, new BottomSheet
  - Acceptance: Feels like Apple Maps “place card”; map remains interactive under sheet

- [ ] Camera capture UX polish
  - Add shutter animation, capture progress, optimistic thumbnail, background upload (retry)
  - Respect EXIF orientation, compress before upload, show iOS-like permission prompts
  - Files: `components/MobileCameraCapture.tsx`, `lib/storage.ts`/`lib/photo-service.ts`
  - Acceptance: Capture feels instant; upload resiliency with offline queue

- [ ] Image caching strategy
  - Service Worker + Cache Storage for Storage images; stale-while-revalidate
  - Files: `public/sw.js` (already present), extend with routes for Firebase image URLs
  - Acceptance: Returning to gallery is instant; reduced data usage


## Phase 4 – PWA & offline (3–5 days)
- [ ] True offline-first for lists/details
  - Enable Firestore persistence (multi-tab) and design explicit offline UI states
  - Files: `lib/firebase.ts` (enable persistence), `components/MobileLayout.tsx` (offline banner OK), list/detail components
  - Acceptance: App usable in flight mode; UI shows sync state; no console errors

- [ ] Install prompt and in-app update UX (iOS)
  - Guide users to “Add to Home Screen”; detect updated service worker and provide one-tap reload
  - Files: app shell + SW
  - Acceptance: Users can add to home screen; update prompt displayed within 10s of new SW

- [ ] Deep link routes parity with iOS
  - Verify and expand `protocol_handlers` and route mapping for typical tasks (open tree, open map)
  - Files: `public/manifest.json`, route handlers
  - Acceptance: `web+farmmanager://tree/{id}` opens correct detail view


## Phase 5 – Visual polish & accessibility (ongoing)
- [ ] Blur/translucency for headers/sheets
  - Use `backdrop-filter: blur(20px)` and translucent backgrounds for iOS glass effect
  - Acceptance: Header and sheets have subtle blur; legibility meets contrast guidelines

- [ ] Dynamic Type & Vietnamese typography
  - Respect user font scaling with `rem`/`em`; ensure truncation behavior in Vietnamese (diacritics) is correct
  - Files: global CSS, `VIETNAMESE_UI_ACCESSIBILITY.md`
  - Acceptance: AA contrast; headings and body scale gracefully

- [ ] Haptics & sound
  - Use `navigator.vibrate()` for feedback (where supported). Optionally short sounds on capture
  - Acceptance: Tactile feedback on key actions without being distracting

- [ ] Accessibility coverage
  - Add aria-labels for icons, focus order, and keyboard operability for desktop
  - Extend Playwright tests for a11y assertions (axe core)


## Concrete TODOs by file

app/layout.tsx
- [ ] Add iOS font stack on body; ensure `viewportFit: 'cover'` and safe area vars applied to header/footer paddings
- [ ] Global edge-swipe back handler for mobile (opt-in on detail routes)

components/MobileLayout.tsx
- [ ] Large title behavior + collapse on scroll
- [ ] Bottom nav: active pill, haptics, safe-area padding
- [ ] Move notifications/avatar to an action sheet (long-press on avatar)

components/TreeList.tsx
- [ ] Swap pagination for virtualization (`@tanstack/react-virtual`)
- [ ] Add swipe actions (Edit/Details) and pull-to-refresh
- [ ] Debounced/deferred search; input with Cancel button in header on mobile
- [ ] TODO present: handle edit action – wire to TreeDetail edit mode

components/TreeDetail.tsx
- [ ] Render inside BottomSheet on mobile; full-page on desktop
- [ ] Transition states (view→edit) with motion; slide-in panels

components/ImageGallery.tsx & OptimizedPhotoViewer.tsx
- [ ] Replace images with `next/image`, add pinch-to-zoom, double-tap zoom, swipe-to-dismiss
- [ ] Preload nearby images; smooth transitions between images (spring)

components/OpenStreetMap.tsx / MapWrapper.tsx / app/map/page.tsx
- [ ] BottomSheet overlay for list/detail; keep map interactive
- [ ] Pull-to-refresh; haptic feedback on geolocate/center

components/MobileCameraCapture.tsx
- [ ] Shutter animation, optimistic preview, background upload queue and retry
- [ ] EXIF orientation fix and client-side compression

lib/firebase.ts
- [ ] Enable persistent cache (multi-tab) and LRU size; expose utilities for offline state

lib/storage.ts & lib/photo-service.ts
- [ ] Add progressive upload, retry with backoff, and metadata hooks (exif)

public/manifest.json & public/sw.js
- [ ] Extend SW to cache dynamic images; add offline fallback for map tiles if feasible


## Engineering guidelines
- Motion: use Framer Motion; respect `prefers-reduced-motion`
- Gestures: use `@use-gesture/react` or `react-use-gesture` + spring for bottom sheet & swipe actions
- Virtualization: `@tanstack/react-virtual` for simpler dynamic list heights
- Styling: CSS variables for design tokens (spacing, radius, blur, shadow) for easy theming
- Testing: extend Playwright e2e for gestures (pointer events), visual snapshots on key screens


## Risks & dependencies
- Pinch/zoom and swipe-dismiss require careful event handling with images and scroll containers
- Bottom sheet layering with map must not block gestures unintentionally
- iOS Safari limitations (Vibration API, limited SW features) – provide graceful fallbacks


## Milestone proposal (2–3 weeks)
- Week 1: Phase 0 + Phase 1
- Week 2: Phase 2 + parts of Phase 3 (virtualization)
- Week 3: Finish Phase 3, Phase 4 items; begin Phase 5 polish


## Definition of done (per feature)
- Smooth 60fps animations on mid-tier iPhone
- No layout shifts (CLS) during navigation and image loading
- Offline: usable critical flows (view trees, view cached images)
- A11y: keyboard/focus order for desktop, aria labels for icons, color contrast AA


## Tracking table
- [ ] Phase 0
- [x] Phase 1 (completed: BottomSheet, edge-swipe back, BottomTabBar, LargeTitleHeader on Trees/Map/Zones)
- [x] Phase 2 (completed: pull-to-refresh, photo gestures, motion removed for build stability)
- [x] Phase 3 (completed: TreeList virtualization, map+bottom sheet master-detail, camera polish)
- [x] Phase 4 (completed: offline indicator, Firestore persistence, PWA features)
- [x] Phase 5 (completed: iOS blur effects, design tokens, dynamic type, haptics)


## References
- `VIETNAMESE_UI_ACCESSIBILITY.md` – apply specs for Vietnamese text and swipe gestures
- `PLAYWRIGHT_MCP_IMAGE_TEST_REPORT.md` – confirms image pipeline readiness
- Existing tests under `e2e/` – extend with motion/gesture assertions


---
If you want, I can start by implementing the Bottom Sheet primitive and wiring TreeDetail on mobile to use it. That change alone will make the app feel significantly more native on iOS.

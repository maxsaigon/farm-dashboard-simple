# Tree Showcase UX Proposal (Lightweight)

Goal: Prioritize three key elements above the fold for fast, field-friendly use:
- Image of tree (hero gallery)
- Zone (visual chip)
- Fruit count (large, touch-friendly stepper with save)

## Principles
- Mobile-first, minimal chrome, content-forward
- Progressive disclosure: advanced details (health, notes, custom fields) hidden by default
- Large hit targets (>=44px), strong contrast, legible in sunlight

## Layout
1) Hero image (full width, 16:9)
   - If multiple images: basic swipe/arrow navigation (via existing ImageGallery)
   - Empty state: placeholder with optional "Add image" CTA
2) Overlay/near-hero info
   - Zone chip: e.g., "📍 Zone A01" (later: color-coded)
3) Fruit count control
   - Prominent number, +/- buttons, Save
   - Optimistic UI and simple feedback

Optional below-the-fold (future)
- Identity row: tree name + variety
- Health status and notes in collapsible section or BottomSheet
- Custom fields tucked away

## Interactions
- Tap +/- to adjust fruit count. Save commits via updateTree
- Zone chip can navigate to zone info in future; for now, static label
- Image gallery uses existing ImageGallery component

## Data
- Tree fields used: id, farmId, photos (via ImageGallery), zoneCode/zoneName, manualFruitCount
- Requires user and currentFarm context for saving

## Accessibility
- Buttons large and spaced, visible focus states
- Descriptive labels and aria tags on interactive controls

---

## TODO Checklist (Phase 1 - Lightweight)
- [x] Document proposal and TODOs
- [x] Implement minimal TreeShowcase component
- [x] Implement simple page at /trees/showcase/[id] to display a single tree
- [x] Wire up fruit count save using updateTree
- [x] Handle unauthenticated or no farm context gracefully
- [x] Add basic empty states (no image, missing zone)
- [x] Optional: Toast feedback on save
- [ ] Optional: Sticky header on scroll with compact info

## Out of Scope (Future Enhancements)
- Pinch-to-zoom on images
- Zone color-coding and navigation
- Offline queue and sync
- AI fruit count integration
- Full details sheet with health/notes/custom fields

## Implementation Notes
- Keep client-only for now (`'use client'`), fetch tree after mount
- Use Firestore `doc/getDoc` under `farms/{farmId}/trees/{id}`
- Cast/normalize to `Tree` with safe defaults
- Reuse `ImageGallery` to avoid duplicating image logic

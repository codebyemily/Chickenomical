<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Chickenomical
description: Nearby chicken value comparison with source-verified prices per piece.
---

# Design System: Chickenomical

## Overview

**Creative North Star: "Friendly Decision Bands"**

Chickenomical pairs clear wayfinding with a warmer, more playful shape language: saturated signal yellow, sign black, clean white and cool-gray fields, aligned information, concise labels, strong numeric hierarchy, and generous rounded corners. When a choice matters, commit to a broad yellow field instead of reducing the signal to a tiny badge. Keep surrounding information calm so that one strong field leads the eye. This is wayfinding clarity applied to food value, not airport-themed decoration.

The identity is distinctive through high contrast and wayfinding grammar, not literal flight imagery. Use this system consistently across iOS, Android, and web while keeping navigation and platform-owned controls familiar to each OS. A single, restrained split-flap-inspired change cue marks a changed ranking; keep the old value readable until the new ranking is ready, then settle immediately. Respect reduced-motion settings and never animate a price as if its value were changing.

**Key Characteristics:**
- Signal yellow points to direction and the lowest verified unit price.
- Sign black, white, and cool gray create crisp contrast and calm information fields.
- Soft rounded panels, aligned rules, concise labels, and tabular numerals organize facts.
- Platform-native controls sit within a distinct Chickenomical visual frame.

## Colors

The palette is a high-contrast sign system: one vivid signal color over black and cool neutrals. Treat yellow as a field-level commitment on the screen's most meaningful decision, then leave enough neutral space for supporting facts to stay easy to scan.

### Primary
- **Signal Yellow** (#FFD400): broad directional bands and the lowest verified unit price. Give the signal a decisive rectangular field, never a warning, a generic accent sprinkle, or a discount that has not been verified.

### Neutral
- **Sign Black** (#101010): primary text, key figures, and strong separators on light surfaces.
- **Panel Gray** (#F3F3F3): secondary information fields and low-emphasis grouping.
- **Clear White** (#FFFFFF): open content surfaces that keep dense comparisons easy to scan.

**The Verified Signal Rule.** Yellow identifies direction or the current lowest verified price per piece. It never stands in for stale, unavailable, warning, or error states.

**The Full-Band Rule.** When a value deserves emphasis, let yellow own one complete band or panel instead of scattering small yellow badges across the screen.

## Typography

**Display Font:** Humanist sans-serif with distinctive numerals; exact family to be resolved during implementation.
**Body Font:** A clear humanist sans-serif; exact family to be resolved during implementation.
**Label/Mono Font:** No separate mono family is established. Use the selected sans family for labels and tabular figures for numeric comparison.

**Character:** Open, legible letterforms pair with strong numerals and concise sign-like labels. Use a visibly larger, heavier display tier for the decisive number, then make supporting copy quieter and easy to read. The display voice is bold and directional; supporting copy stays plain.

### Hierarchy
- **Display** (bold humanist sans, size to be resolved): the strongest directional statement on a screen.
- **Headline** (bold sans, size to be resolved): the leading value or other decisive information, clearly larger than its supporting label.
- **Title** (medium-to-bold sans, size to be resolved): restaurant, menu item, or grouped information names.
- **Body** (regular sans, size to be resolved): explanations and offer details.
- **Label** (bold sans, compact; uppercase for short sign-like field names): short field names and status details, never a second competing headline.

**The Numbers Stay Aligned Rule.** Counts, distances, prices, and totals use tabular numerals wherever the chosen platform font supports them.

## Layout

Organize information with a clear wayfinding hierarchy: the strongest current decision signal first, its supporting facts together, and secondary actions after the evidence. Let important sign fields span the content width; align edges and numeric columns to a disciplined grid. Use hard separators and contiguous bands instead of a mosaic of small rounded cards or scattered badges. Keep provenance and status close to the facts they qualify.

On narrow screens, preserve reading order and let supporting details stack. On wider web layouts, use aligned columns and stronger sign panels to improve comparison without scattering one offer's price, count, source, and checked time across distant regions. Use the same soft-panel grammar across screens: continuous black/yellow bars can stay square where they meet the device edge, while content-owned panels and controls have rounded corners.

## Elevation & Depth

Use flat, opaque fields. Distinguish information through color, scale, alignment, and clear rules rather than shadows or translucent layers. Matte sign panels are the material reference; do not imitate physical wear, metal, or paper textures in the interface. A strong color field and a hard rule do the work that a soft floating card would do elsewhere.

**The Flat Sign Rule.** A field gains emphasis through its signal color and position, not a floating-card shadow.

## Shapes

Use a friendly, rounded form language for content-owned surfaces. The implementation scale is 12pt for compact rows, 18pt for standard panels, 24pt for featured panels, and pill-shaped actions/selectors. Keep rules and numeric alignment crisp so the softer shapes do not weaken comparison. System-owned controls, including native tabs, retain their platform shapes.

## Do's and Don'ts

### Do:
- **Do** use one decisive yellow-and-black panel for the strongest current signal, then let the rest of the screen support it.
- **Do** keep the best verified price visually obvious while preserving the underlying facts and provenance.
- **Do** align comparison numbers with tabular figures when available.
- **Do** adapt the sign language to each platform while keeping navigation, inputs, and system interactions recognizable.
- **Do** make ranking changes brief and optional for reduced-motion users; show final data immediately when motion is disabled.

### Don't:
- **Don't** soften the sign system with warm paper grounds, teal identity ink, or route-color accents.
- **Don't** use yellow to signal errors, stale data, or unverified savings.
- **Don't** add flight terminology, gate numbers, airline marks, or airport symbols that do not help compare chicken offers.
- **Don't** turn every element into a separate rounded card or scatter unrelated yellow badges across the screen.
- **Don't** use faux metal, paper grain, shadows, or other textures to make the interface look like physical airport hardware.

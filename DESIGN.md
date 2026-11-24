---
name: Ostetrixie
description: An offline caseload for one midwife, set like the yellow Partenze poster of an Italian station.
colors:
  verde: "#4FB874"
  ink: "#141414"
  carta: "#FFFFFF"
  rosso: "#D2271F"
  oggi: "#1E5BD8"
  grigio: "#5C5C5C"
  filo: "#E3E0D6"
  vicina: "#E6F5EA"
  premuto: "#EFF5F0"
typography:
  display:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  headline:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  figure:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  figure-small:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.1
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  name:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "'Fredoka Variable', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  station-end: "2px"
  field: "8px"
  pill: "30px"
  disc: "50%"
spacing:
  hairline: "1px"
  rule: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "18px"
  touch: "44px"
components:
  button:
    backgroundColor: "{colors.carta}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "50px"
  button-pressed:
    backgroundColor: "{colors.premuto}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.verde}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "50px"
  button-danger:
    backgroundColor: "{colors.rosso}"
    textColor: "{colors.carta}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "50px"
  field:
    backgroundColor: "{colors.carta}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "48px"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.carta}"
    height: "46px"
  header:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.ink}"
    padding: "18px 18px 14px"
  tab-active-icon:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
  tab-inactive:
    textColor: "{colors.grigio}"
  timetable-row:
    backgroundColor: "{colors.carta}"
    textColor: "{colors.ink}"
    padding: "12px 18px 11px"
  timetable-row-nearest:
    backgroundColor: "{colors.vicina}"
---

# Design System: Ostetrixie

## Overview

**Creative North Star: "Orario delle partenze"**

The app is a station departures board for a caseload. Every pregnancy is a journey with a known arrival, so the main list reads as a timetable: a gestational-age figure in big condensed tabular numerals on the left, the mother and her next meeting in the middle, the arrival date on the right, and under each row a line with stations at 13, 27 and 37 weeks, a square terminus at 40, and one blue dot for today. Yellow header, black ink, white paper. The structure comes from rules, not containers.

Density is high but readable at arm's length in daylight. Rows sit on 1px hairlines, sections open with a 2px ink rule, and hierarchy comes from scale contrast between figures and text rather than from boxes, tints or shadows. Colour is used for signals only: yellow marks where you are (header, active tab), red marks what needs attention, blue marks now. The world rejects the pastel-baby card grid and the clinical-blue EHR.

**Key Characteristics:**
- Partenze yellow header on every top-level screen, ink type on it, closed by a 2px ink rule.
- Timetable rows on hairlines; no cards anywhere.
- Condensed (wdth 70) tabular numerals for every clinical figure: EG, dates, DPP, counts.
- The station line, used in Mamme, Scheda and the Calendario panoramica.
- Black pills with yellow type for the one primary action.
- A single phone column (480px) that stays centred and edged in ink on wide screens.

## Colors

A printed-poster palette: one saturated yellow, ink, paper, and two signal colours that keep their meaning everywhere.

### Primary
- **Partenze Yellow** (giallo): the poster ground. Fills the top header of every screen, the lock and error screens, the status-bar strip, the active tab's icon plate, the type of the primary pill (yellow on ink), and text selection. It marks place, never state or alert.

### Signal
- **Signal Red** (rosso): only for overdue, unlogged or out-of-range. Out-of-range EG figures, "Incontro … da registrare" lines, invalid field borders and error text, destructive buttons and menu items, red day dots in the calendar. An alert stays red until it is dealt with.
- **Oggi Blue** (oggi): the current position, nothing else. The today dot on the station line, and today's ring (or fill when selected) in the month grid.

### Neutral
- **Ink** (ink): all type, 2px rules and borders, the station line and its stops, the selected segment and selected day, the primary pill's ground, focus outlines.
- **Paper** (carta): page ground, field and sheet ground, the halo around the today dot.
- **Timetable Grey** (grigio): secondary text. Meta lines under names, unit captions under figures ("settimane", "DPP"), section labels, inactive tabs, placeholders, days outside the month.
- **Hairline** (filo): the warm 1px rule between rows and under strips.
- **Nearest Tint** (vicina): the background of the one mother closest to arrival in the Mamme list.
- **Pressed** (premuto): the `:active` background for rows, menu items and outline buttons.

### Named Rules
**The Three Signals Rule.** Yellow means place, red means act, blue means now. No colour is added for decoration, and none of the three borrows another's job.

**The One Blue Rule.** Oggi blue appears only where it marks today's position. It is never a link colour, a button, or an accent.

## Typography

**Font:** Archivo Variable (self-hosted via `@fontsource-variable/archivo`, wdth axis), falling back to system-ui. No CDN at runtime.

**Character:** One grotesque family, stretched along its width axis. Condensed widths carry the numbers and titles; normal width carries the reading text and captions.

### Hierarchy
- **Display**: the gestational age at the top of a mother's scheda (48px for post-partum days). Tabular, condensed.
- **Headline**: screen titles in the yellow header ("Mamme", "Calendario"; 34px when the title is a mother's name, so long names fit). Condensed wdth 75.
- **Title**: bottom-sheet titles and the month name in Calendario (24px). Condensed wdth 75.
- **Figure**: the EG figure that leads each Mamme row; the arrival date to its right uses figure-small, as do dates and EG in meeting rows.
- **Name**: the mother's name in a row; menu items in sheets.
- **Body**: field values, buttons (700), paragraphs.
- **Meta**: the grey line under a name (next meeting, overdue notice), notes, field labels (700).
- **Label**: column headers (EPOCA / MAMMA · PROSSIMO / ARRIVO) and section labels ("Dopo il parto", "Archiviate"), uppercase. Unit captions under figures are 11-12px at 600 in grey, normal width.

### Named Rules
**The Tabular Figures Rule.** Every number that is a clinical fact (EG, DPP, dates, counts) gets tabular numerals at wdth 70, so columns line up like a timetable.

**The Scale Contrast Rule.** Hierarchy comes from size and width: a 34px condensed figure next to 17px names and 13px grey meta. Don't add boxes, colours or icons to create emphasis.

## Layout

Mobile-first single column, built at 390px and capped at 480px. On screens of 520px and wider the column stays centred, framed by a fixed 2px ink edge on both sides; fixed bars, the dock and sheets centre themselves in the same column.

Horizontal gutter is 18px throughout. Mamme rows use a three-column timetable grid (76px EG, flexible mother, 66px arrival, 10px gap) with the station line spanning the last two columns underneath. Meeting lists use a narrower grid (52px date, 58px EG, flexible description; an optional 26px index column first). The column header strip sits directly above its rows, opened by a 2px rule.

Bottom structure stacks upward: the tab bar (at least 84px including the safe area), an optional update banner (52px) that pushes everything above it up, and on Mamme a docked strip (53px) holding the count and the "Nuova mamma" pill. Content is padded by exactly these heights, so the list scrolls under the strip and never behind the pill. Safe-area insets are honoured on every fixed edge. Touch targets are at least 44px.

## Elevation & Depth

Flat. Nothing floats on a shadow. Depth is shown by rules and by order: 2px ink rules open sections and close headers, 1px hairlines separate rows, fixed bars take a 2px ink top rule. Bottom sheets rise from the bottom edge with a 2px ink top rule over a 50% ink scrim.

`box-shadow` is used for exactly two non-elevation jobs: a 3px paper halo around the today dot so it stays legible on the line, and inset rings (today's 2px blue ring in the month grid; the paper-then-ink ring that marks focus on a segmented choice).

### Named Rules
**The Rules Not Boxes Rule.** Group with a rule, not a card. If a section needs separating, give it a 2px ink rule at the top; if rows need separating, a 1px hairline.

## Shapes

Mostly square: the rows, header, sheets and bars have no rounding. Radius is kept to a small set with a job each: 8px for fields, the search box, segmented controls, the tab icon plate and day cells; 30px pill ends for buttons; full circles for the station stops, the today dot and day numbers; a near-square 2px corner on the terminus at 40 weeks, so arrival reads differently from the stops. Borders are 2px ink on interactive controls. Icons are inline SVG line drawings with a 2px stroke in currentColor, matching the rule weight.

## Components

### Buttons
- **Shape:** full pill (30px radius), 50px tall (44px in compact places), 20px side padding, 16px bold.
- **Outline (default):** paper ground, 2px ink border, ink type. Pressed: the pressed tint.
- **Primary:** ink ground, yellow type. One per view: "Nuova mamma", the save action.
- **Danger:** red ground and border, paper type, only for confirming a destructive action.
- **Flat:** no border or ground, for secondary actions such as Annulla.
- **Disabled:** 50% opacity.

### Inputs / Fields
- **Style:** 48px minimum height, 2px ink border, 8px radius, paper ground, 16px text, with a 13px bold label above. A grey `<small>` inside the label carries hints.
- **Date and time:** the native indicator is hidden but still covers the field, and the app draws its own 2px ink calendar or clock icon on the right. Empty values show the grey mask as a placeholder.
- **Focus:** 2px ink outline, 2px offset.
- **Error:** red border and a 13px bold red message below.
- **Segmented choice:** a row (or 2-column grid) of real radio inputs inside a 2px ink frame; ink gaps draw the dividers. The selected option turns ink with paper type.

### Navigation
- **Tab bar:** three tabs (Mamme, Calendario, Impostazioni) fixed to the bottom, paper ground, 2px ink top rule. Each tab is a 2px-stroke line icon over a 12px bold label. Inactive in grey; active in ink with a yellow 8px-radius plate behind the icon.
- **Header:** yellow ground, condensed 800 title on the left, weekday and date on the right (date in figure type), closed by a 2px ink rule or by the column header strip.

### Timetable Row (signature)
The core list item, in Mamme, the scheda's meeting list and the calendar. Hairline below, 18px gutter, a condensed tabular figure leading on the left, the name in bold with a grey meta line, and arrival or date data on the right. Pressed: the pressed tint. The nearest-to-arrival mother gets the yellow tint. Overdue rows turn their date and meta red. Post-partum rows show days since the birth instead of EG.

### Station Line (signature)
The pregnancy drawn as a 2px ink line: hollow 10px stops at the start and at 13, 27 and 37 weeks, an ink square terminus at 40, and a 14px oggi-blue dot with a paper halo at today's position. It sits under each pregnant row, across the scheda's summary, and in the Calendario panoramica. The terminus is drawn over the dot so arrival stays readable near term.

### Bottom Sheet
A native modal dialog anchored to the bottom of the column, paper ground, 2px ink top rule (and ink side edges on wide screens), 18px padding plus safe areas, a condensed title. Menu rows inside are full-bleed 52px items on hairlines; destructive items are red.

### Banners
The backup reminder sits inside the yellow header under a 1px ink rule, with an underlined bold call to action. The update banner docks above the tab bar with a 2px ink top rule and a small ink pill with yellow type.

## Do's and Don'ts

### Do:
- **Do** put every top-level screen under the yellow header with a condensed 800 title, closed by a 2px ink rule.
- **Do** set clinical numbers in tabular figures at wdth 70, with an 11-12px grey caption naming the unit underneath.
- **Do** reuse the station line wherever a pregnancy's progress is shown.
- **Do** keep red lit on an overdue or out-of-range item until the item is dealt with.
- **Do** keep every touch target at 44px or more and every interactive border at 2px ink.

### Don't:
- **Don't** use cards, tinted panels or drop shadows to group content; use the 2px rule and the 1px hairline.
- **Don't** use oggi blue for anything that is not today's position.
- **Don't** use red for emphasis or branding; it means something is overdue, missing or out of range.
- **Don't** introduce a second typeface or load fonts from a CDN.
- **Don't** use pastel or baby palettes, or clinical-blue chrome.

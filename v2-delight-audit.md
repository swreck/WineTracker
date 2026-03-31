# Wine Tracker 2.0 — Delight Audit

Audited 2026-03-31 by reviewing all frontend source code and live API responses.

---

## What Delights

**Remi's suggestions are genuinely excellent.** The live suggestions read like a knowledgeable friend who has actually studied your cellar. "The Veedercrest 2009 you gave a 9 — smoky, woody, leather, chocolate — and your note on the Rioja Alta Arana was 'like a tart Veedercrest.' Coravin those two side by side tonight." This is not generic wine advice. It references specific ratings, specific tasting notes, and makes a specific argument for *why* to open something. The dismiss-and-refresh pattern is the right interaction here — you can burn through suggestions until one sparks.

**Remi's chat actually knows your cellar.** The food pairing response to "steak tonight" cited the Titus Napa Cab by name, quoted tasting notes ("big cedar, tannin, dark fruit leather"), and offered a ranked second option. This is the feature that justifies having AI in the app at all. It feels like texting a friend who has a photographic memory.

**The enrichment profiles are deeply personal.** The Paitin Barbaresco 2016 enrichment doesn't just describe the wine — it connects it to the user's palate ("your collection skews toward plush, ripe reds — the Larkmead Cab that you rated 9.0"). This is the kind of insight that makes you feel like the app *understands* you. Gerald's tasting note is the seller's voice; Remi is your sommelier's voice. Those are genuinely different things and the tab separation earns its place.

**The rating popup feels good.** The slide-up sheet with a 4-column grid of big tap targets, color-coded by quality tier (red for low, gray for mid, green for high), is satisfying and fast. The scale of 4-10 in 0.5 increments is narrow enough that every number means something. This is one of the most-used interactions and it works well.

**Wine-tinted card backgrounds in dark mode work.** At 7-8% opacity against `#1e1c1a`, the red (`rgba(180, 80, 95, 0.08)`), white (`rgba(200, 180, 80, 0.07)`), and rose (`rgba(220, 120, 150, 0.07)`) tints are distinguishable from each other without being garish. You can scan a mixed list and subconsciously see the color composition of your collection.

**The "Continue with Remi" bridge from enrichment to chat is well-placed.** It only appears after enrichment has loaded, so there is always context. And it pre-populates the chat with "Let's talk about my [wine name]." This feels like a natural conversational transition, not a feature you have to discover.

**Quick Tasting's "recent wines" shortcut is genuinely fast.** The one-tap-to-re-rate flow (recent wine -> tap -> rating popup -> saved -> reset) respects the real scenario: you just opened the same Titus you had last week and want to log it in 5 seconds. The 1.2-second success state before auto-reset is the right timing — long enough to read, short enough not to block you.

**The serif font for wine names works.** Iowan Old Style (falling back to Palatino) at `font-weight: 600` with `-0.01em` letter-spacing creates a visual distinction between the wine name and the surrounding metadata without looking fussy. It signals "this is the proper noun" in a way that weight alone would not.

---

## What's Flat

**The home screen loads data but doesn't tell a story.** It is three stacked sections — Last Tasted, Remi Suggests, Quick Actions — with no visual hierarchy between them. Nothing says "welcome back." There is no greeting, no sense of time passing, no acknowledgment that you haven't logged a tasting in a week. It is a dashboard, not a journal. The loading state is literally the word "Loading..." — no skeleton, no warmth.

**Wine-tinted card backgrounds in light mode are invisible.** At 5% opacity against `#fefdfb`, `rgba(122, 46, 58, 0.05)` for red and `rgba(180, 160, 60, 0.05)` for white are mathematically different but perceptually identical. You have to hold two cards side by side and squint. The mosaic effect that works in dark mode completely disappears in light mode. Most iPhone users are in light mode during the day.

**The header title "Wine Tracker" is purely functional.** It is the name of the tool, not the name of an experience. Every time you open the app, it reminds you that you are using software. Compare to what it could say — nothing, or something that evokes the cellar rather than the database.

**The "Recent Cases" section is collapsed by default and looks like an afterthought.** The toggle uses a plain right-arrow (triangle) that feels like a developer control. The case cards inside show "No date" and a wine count with no personality. If cases aren't important enough to show, they shouldn't be on the home screen. If they are important, they deserve better treatment than a collapsed section.

**The Quick Actions bar is three buttons that feel like navigation, not actions.** "Scan Label" (camera emoji), "Add Tasting" (plus sign), "Browse" (wine glass emoji) — these are already available in the nav bar as "Add" and "Wines." The quick actions don't save any taps compared to the navigation buttons above them. They occupy valuable home screen real estate without earning it.

**Sparkling tint is barely distinguishable from white tint.** `rgba(160, 150, 120, 0.06)` vs `rgba(180, 160, 60, 0.05)` — both are murky warm-neutrals at very low opacity. In both light and dark mode, sparkling and white cards look the same. A sparkling wine should feel different — lighter, brighter, more alive.

**The Remi FAB uses the letter "R" in italic serif.** It communicates nothing to a first-time user. There is no tooltip on mobile (title attributes don't show). Someone who hasn't been told about Remi will see a floating circle with a letter and not know what it does. This is the primary entry point to the app's most compelling feature.

**Gerald tab is literally just seller notes with a left border.** The visual treatment — a gray left-border card on a secondary background — says "this is a quote." But there is no personality to Gerald. No icon, no attribution beyond the source badge, no sense that Gerald is a persona. It feels like a renamed "Seller Notes" section, which is exactly what it is. The name "Gerald" only works if it has character.

**The nav bar has four items but "Add" is overloaded.** Tapping "Add" goes to Import, and Import's active state also highlights when you are on Quick Tasting. But Quick Tasting is not the same as Import. A user on Quick Tasting who taps "Add" expecting to stay where they are will be sent to Import instead. The mental model is confused.

**Compare mode wine selection is text-only.** When picking two wines to compare side by side, you see plain text names in a search list. There is no color dot, no vintage highlight, no visual cue to help you pick the right bottle. The compare cards themselves show tinted backgrounds, but the selection process is bare.

**The Remi chat starter prompts pre-fill the input but don't auto-send.** You tap "What should I open tonight?" and the text appears in the input field, but you still have to tap Send. This is one unnecessary tap that breaks the conversational flow. Every other chat UI (iMessage, WhatsApp) sends when you commit to a suggestion.

---

## What's Missing

**No "drinking window" indicator.** Remi's enrichment profile mentions "drink window stretching to 2035+" in prose, but there is no visual signal on any card or list view that a wine is at its peak, approaching its window, or past it. This is the single most actionable piece of information for deciding what to open tonight, and it is buried in paragraphs of text.

**No "open tonight" decision helper on the home screen.** Remi suggestions come close, but they are pre-generated and static until you hit refresh. What is missing is a lightweight "what should I open?" prompt that accounts for the current moment — what you've been drinking recently, what is at peak, what pairs with what you might eat. The chat can do this, but it requires opening the chat, typing, and waiting. The home screen should surface this proactively.

**No visual distinction between "in my cellar" and "already consumed."** Every wine and vintage looks the same whether you have six bottles or drank the last one two years ago. The `notAvailable` flag exists on the Vintage model and there is an "Avail" filter in the wines list, but there is no visual treatment — no opacity change, no badge, no strike-through — to distinguish depleted stock at a glance.

**No tasting timeline or trend view.** Every tasting is shown as a flat chronological list. There is no visualization of how your palate has evolved — whether your ratings for a particular wine are going up or down over time, whether you are drinking more Burgundy or less, whether your average rating is creeping up (grade inflation). A simple sparkline or even a text summary would add depth.

**No "what pairs with" on wine detail.** When looking at a specific wine, there is no food pairing guidance unless you open Remi chat and ask. A two-line pairing suggestion on the Remi tab — pre-generated during enrichment — would save a round trip and feel like the app is thinking ahead.

**No haptic feedback.** The `scale(0.97)` on button press and `scale(0.98)` on card press are visual stand-ins for what should be haptic. On iOS, a light Taptic Engine tap when you select a rating or save a tasting would make the app feel physically connected to your hand. CSS cannot do this, but the Navigator.vibrate API or a native wrapper could.

**No "undo" on save.** After saving a Quick Tasting, the 1.2-second success state auto-resets and the tasting is committed. If you tapped the wrong rating, you must navigate to the wine detail, find the tasting, edit it, and re-save. A 3-second undo toast ("Saved 7.5 — Undo") would be the safety net that lets you rate quickly without anxiety.

**No markdown or formatting in Remi chat responses.** The enrichment profiles use `**bold**` markers that get split by `\n\n` and rendered as paragraphs, but the chat responses are plain text with no formatting. When Remi says "the Titus Napa Cab" in a chat response, that wine name should be visually identifiable — maybe tappable to navigate to the wine detail page.

**Want to Try list lives in localStorage.** If you clear your browser data or switch devices, the list is gone. This is the kind of data loss that creates distrust. It should be server-persisted, especially since Remi could reference it when generating suggestions.

---

## Specific Recommendations

### Priority 1 — Low effort, high delight

1. **Increase light-mode card tint opacity from 5% to 12-15%.** Change `--color-card-red` from `rgba(122, 46, 58, 0.05)` to `rgba(122, 46, 58, 0.12)` and proportionally for other colors. Test on a white background in daylight. The mosaic should be visible without squinting.

2. **Auto-send chat starter prompts.** When a user taps a starter prompt, call `handleSend()` directly instead of just setting the input value. Saves one tap and respects the conversational metaphor.

3. **Add a visual "not available" treatment.** When `vintage.notAvailable` is true, reduce card opacity to 0.6 and add a small "gone" or struck-through indicator. Costs almost nothing in CSS, immediately distinguishes cellar inventory from history.

4. **Give the Remi FAB an identity.** Replace the italic "R" with a small wine-glass icon or at minimum add a subtle label on first launch. The most delightful feature in the app should not be hidden behind an unexplained floating letter.

5. **Make Remi suggestion cards tappable with clearer intent.** Currently, tapping a suggestion with a wineId navigates to that wine. But the user doesn't know that — there is no visual affordance (no chevron, no "View wine" hint). Add a subtle right-arrow or the wine name styled as a link.

### Priority 2 — Medium effort, meaningful impact

6. **Add a personal greeting to the home screen** that reflects state. "You haven't tasted anything in 12 days" or "You rated 3 wines this week" — one sentence that acknowledges the user as a person, not a data entry clerk.

7. **Add a drinking-window badge to wine cards.** Pull the drink window from Remi enrichment (if available) and display a small pill: "Peak now," "Hold 3+ years," "Past peak." This is the highest-value metadata for a wine collector and it is currently invisible.

8. **Persist the Want to Try list on the server.** Move from localStorage to a simple database table. Include it in Remi's suggestion context so Remi can say "You said you wanted to try a Barolo — Gerald has the 2019 Falletto at $45 right now."

9. **Differentiate the sparkling card tint.** Use a cooler, brighter base — `rgba(200, 200, 230, 0.10)` in light mode and `rgba(180, 200, 240, 0.08)` in dark mode — to visually separate sparkling from white. Sparkling should feel effervescent, not beige.

10. **Add a simple undo toast for Quick Tasting saves.** Show a 3-second dismissable bar at the bottom with "Saved 7.5 for Titus 2019 — Undo." If tapped, delete the tasting. If not, it disappears. This removes friction from the rating flow.

### Priority 3 — Higher effort, completes the vision

11. **Build a lightweight "Tonight" widget for the home screen.** One card below the greeting that says "Based on what you have open and what's at peak: the Guigal St. Joseph" with a one-tap "Log it" action. This collapses the journey from "open app" to "wine in glass" to zero taps.

12. **Add inline food pairing to the Remi tab on wine detail.** When enrichment loads, generate a one-line pairing ("Pairs with: grilled lamb, mushroom risotto, aged hard cheeses") and display it below the profile. Pre-generate during enrichment so there is no additional API call.

13. **Make wine names in Remi chat tappable.** When Remi mentions a wine by name, render it as a link that navigates to that wine's detail page. This transforms the chat from a read-only experience into a navigational hub.

14. **Add a tasting sparkline or trend line** on the wine detail page for wines with 3+ tastings. Even a tiny row of dots showing rating over time tells a story that a chronological list cannot.

15. **Rethink the home screen Quick Actions.** Either remove them (they duplicate the nav bar) or transform them into contextual actions that change based on state — "Rate the wine you opened yesterday," "Finish importing last week's receipt," "Your Brunello 2016 is approaching peak."

---

*Audited against live API at `wine-tracker-backend-production.up.railway.app/api` and frontend source at `frontend/src/`. All code references are to committed files as of 2026-03-31.*

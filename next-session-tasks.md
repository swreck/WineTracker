# Next Session Tasks — Wine Tracker 2.0

## Priority order:

### 1. Audit and fix misclassified notes
Source data is in `source-data/gerald-receipts.txt` (partial) and the full dataset
was provided in the chat session of 2026-03-31. Use this to:
- Compare what's in the database (sellerNotes vs tastingEvents.notes) against the source
- Fix any wines where Ken's tasting notes are stored as Gerald's seller notes (like AALTO)
- Use Remi to help classify ambiguous entries
- The parsing rule: dates + ratings + first-person = Ken's notes; ALL CAPS or // markers or third-person marketing = Gerald's notes

### 2. Add sorting to Next Case favorites
Sort chips between min rating and color filter: vintage, purchase date, rating, alphabetical.

### 3. Browser history navigation
Add browser history integration so the back button navigates within the app instead of leaving it. Push history entries on page changes.

### 4. Case Builder (major feature)
Ken's description:
- Bottom panel with N scrollable boxes (N from pick list 1-6), 2 or 4 visible at a time
- Each box represents a case of 12 bottles
- Each box has a theme label at top (Remi suggests, user can rename)
- Wines from the favorites list above can be tapped to add to the active box
- Each wine in a box has: quantity, toggle for "this wine" vs "wine like this"
- Box total should add up to 12
- A box can have just a theme with no wines (Gerald knows what it means)
- A box can be split: "6 fortified + 6 Portuguese whites"
- Remi continuously analyzes wines in each box and suggests/updates theme labels
- Multiple theme suggestions in a dropdown, with open text field for custom
- Result is a scannable cheat sheet for calling Gerald
- "Ask Remi to write email" button generates a draft in Ken's voice
- Ken can request revisions ("make it shorter") before copying to Mail
- All Remi-generated text runs through Ken's Voice approval process

### 5. Remove critic "Sources" button idea
Ken confirmed Remi's enrichment synthesizes critical consensus from training data.
Adding specific critic scores would be fabricated. Leave as-is. Do NOT add a Sources section.

### 6. Run chaos test + delight audit on all new features
After building, run the same compete-until-clean cycle.

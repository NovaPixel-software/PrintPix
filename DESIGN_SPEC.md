# MagZ – App Documentation & Design Brief

Use this document as the input for a UI design tool (Stitch). Section 9 has ready-to-paste prompts, one per screen.

---

## 1. What the app is

**MagZ** is a mobile-first app for printing shops and event teams that make **fridge magnets** (and similar small prints) at events such as weddings, corporate events and exhibitions.

Guests' photos go into a ready-made sheet layout. The app places and crops them automatically, and the operator prints the sheet straight from a phone or tablet to a WiFi printer. No Photoshop or Canva is needed.

**Core promise:** one person, a few taps, a print-ready sheet.

### Main flow in one line
**Login → create Event (product → shape → template size → paper size) → add photos to the sheet → rotate / zoom / move → save → print or download.**

Login is the first real screen and is **mandatory**. Nobody reaches events, photos or the editor without signing in, and the licence is checked right after sign-in.

### Users
| User | Goal |
|---|---|
| **Operator** (shop staff / event team) | Log in, create an event, drop photos into a sheet, print |
| **Admin** (app owner) | Create operator accounts, set licence expiry dates, disable accounts |

### Platforms
Phone (primary), tablet, laptop. Installable as a PWA, later an Android APK. Works offline after first load.

---

## 2. Design direction

- **Feel:** clean, friendly, professional. A tool for busy people at live events, so it should be fast and obvious.
- **Primary colour:** indigo → violet gradient (`#4f46e5` → `#7c3aed`)
- **Success:** green `#16a34a`  **Danger:** red `#dc2626`
- **Light screens:** background `#f4f5fb`, white cards, 14px rounded corners, soft shadows
- **Editor screen only:** dark navy `#14122e`, so the white print sheet stands out
- **Type:** system sans (Inter / Roboto style), bold titles, muted grey helper text
- **Touch targets:** at least 44px. Large primary buttons. One main action per screen.
- **Brand mark:** rounded-square gradient icon with a small 2x2 grid, followed by the wordmark "Mag**Z**" (Z in indigo).

---

## 3. Screen map

```
Splash
  └─ Login ──(first time / expired)──► Licence Expired
        │
        ▼
     Home (Events)
        ├─ New Event
        └─ Event Page ──► Editor ──► Saved dialog
              │
              └─ Design Preview (Print / Download / Edit / Delete)

Settings (account, licence, storage, logout)

Admin (separate, laptop-first): Users list · Add/Edit user · Licence dates
```

---

## 4. Global elements

### Top bar (all screens except Login and Editor)
- Left: logo + "MagZ"
- Right: **Online / Offline badge** (green pill "Online", red pill "Offline"), **Licence chip** "Valid until 30 Sep 2027" (amber if under 15 days left), home icon, settings icon, "Log out"

### Toast
Small dark pill at the bottom for short messages, for example "All slots are full".

### Modal
White rounded sheet over a dimmed background. Closes by tapping outside or on a close button.

---

## 5. Screens in detail

### 5.1 Splash
- Gradient background, centred logo and wordmark, small tagline "Fridge magnet printing, made effortless".
- Shown about 1 second while the app loads.

### 5.2 Login  ⭐
**Purpose:** let an operator sign in. Licence is checked right after sign-in.

**Layout (mobile, centred card):**
- Logo + "MagZ"
- Key/lock illustration or icon
- Title: **Welcome back**
- Subtitle: "Sign in to your MagZ account"
- **Username** field
- **Password** field with show/hide eye icon
- "Remember me on this device" checkbox
- **Log in** primary full-width button
- Small link: "Forgot password? Contact your admin"
- Footer: "Need the software? Get in touch with us" (contact link) and app version

**States**
| State | Behaviour |
|---|---|
| Empty | Button enabled; on tap shows "Enter username and password" under the fields |
| Loading | Button shows spinner, fields disabled |
| Wrong credentials | Red message "Incorrect username or password" |
| Offline, previously signed in | Allow entry using the cached session; show note "Offline mode" |
| Offline, never signed in | Message "Connect to the internet for the first login" |
| Account disabled | "This account is disabled. Contact your admin." |
| Licence expired | Go to the Licence Expired screen |

**Rules**
- Browser password manager must work (proper username/password input types).
- Session stays signed in for up to 7 days offline. After that the app asks to reconnect and re-check the licence.

### 5.3 Licence Expired
- Warning illustration (calendar or lock)
- Title: **Your licence has expired**
- Text: "Expired on 30 Sep 2027. Contact us to renew."
- Buttons: **Contact to renew** (primary: call / WhatsApp), **Log out**
- Saved designs stay on the device and can still be **downloaded** (secondary link "Download my saved designs"), but creating new designs is blocked.

### 5.4 Home – Events
- Hero card (gradient): headline "Fridge magnet sheets, made easy", one line of text, big **✨ New Event** button.
- Card "Events": list of events, newest first. Each row has:
  - Event name (bold)
  - Product and size in muted text (e.g. "FridgeMagnet 3.1 x 2.1" 80x53")
  - Design count on the right ("3 designs ›")
- Empty state: "No events yet. Create your first one."
- Optional: search box when there are more than 8 events.

### 5.5 New Event (event setup, 4 dropdowns in a chain)
Right after login the operator creates an event. The form is a chain of dropdowns, and each one unlocks the next. A live **sheet preview** at the bottom updates as choices are made.

Card form:
- Title **New Event**, helper text "Choose the product, shape and paper size. You can start designing right after."
- **Event Name \*** text field, hint "Name of the occasion, wedding, or corporate event", placeholder "e.g. IACI 2026"
- **1. Product Type \*** (main dropdown): Fridge Magnet, Photo Print, Badge / Pin, Keychain, Sticker, Coaster *(list is configurable)*
- **2. Photo Shape \*** (photo selection type dropdown), disabled until a product is chosen. Options with a small shape icon beside each:
  - Rectangle (landscape)
  - Rectangle (portrait)
  - Square
  - Round / Circle
  - Oval
  - Rounded rectangle
  - Heart *(planned)*
  - Hexagon *(planned)*
- **3. Template / Overlay Size \***, disabled until a shape is chosen. The sizes shown depend on product + shape (see 5.5.2), each with "N per sheet".
- **4. Paper Size \*** (page size dropdown): see 5.5.1. Shows the pixel size at 300 DPI.
- **Orientation** toggle: Portrait / Landscape *(planned)*
- **Sheet preview:** small thumbnail of the empty sheet with the slots drawn in the chosen shape, plus the text "8 photos per sheet · 80x53 mm · A4".
- Footer buttons: **Cancel** (secondary) and **Create & Open Event** (primary, looks disabled until all required fields are filled)
- Error text: "Please fill in all fields." If the chosen template does not fit the paper: "This size does not fit on A5. Choose a larger paper."

#### 5.5.1 Paper sizes
| Paper | Size (mm) | Pixels at 300 DPI |
|---|---|---|
| A6 | 105 x 148 | 1240 x 1748 |
| A5 | 148 x 210 | 1748 x 2480 |
| **A4** (built) | 210 x 297 | 2480 x 3508 |
| A3 | 297 x 420 | 3508 x 4961 |
| 4 x 6 in photo paper | 102 x 152 | 1200 x 1800 |
| 5 x 7 in photo paper | 127 x 178 | 1500 x 2100 |
| 13 x 19 in (A3+) | 330 x 483 | 3900 x 5700 |
| Custom | user enters width x height | calculated |

The app calculates how many slots fit on the chosen paper (columns x rows with a 4 mm gap) and shows it as "N per sheet". If nothing fits, that paper is greyed out for the chosen template.

#### 5.5.2 Template sizes per shape (examples)
| Shape | Sizes |
|---|---|
| Rectangle (landscape) | 3.1 x 2.1" (80x53 mm), 3.5 x 2" (89x51 mm) |
| Square | 2.5 x 2.5" (63.5 mm), 2 x 2" (50 mm) |
| Round | 2.25" (58 mm), 2" (50 mm), 1.5" (37 mm) |
| Oval | 3 x 2" (76x51 mm) |
| Rounded rectangle | 3.1 x 2.1" (80x53 mm) |

The sizes above are examples. The final list comes from the owner and is stored as configuration, so adding a size never needs a redesign.

### 5.6 Event Page
- Breadcrumb: Events › *Event name*
- **Hero card** (gradient): event name, "N designs on this device", chips (product size, paper, "8 photos per sheet"), and a large **✨ Start New Design** button.
- **Saved designs** card:
  - Header with count
  - Info note: "Designs are saved on this device. Download them before clearing browser data."
  - Grid of thumbnails (2 columns on phone). The newest has a "Latest" tag. Each shows the design name ("Design 001").
  - Empty state: "No designs yet. Tap Start New Design."
- Bottom: red text button **Delete event** (asks for confirmation).

### 5.7 Editor  ⭐ (dark screen)
**Top bar:** back arrow · event name + "Design 001 · size" · counter pill "3 / 8 photos" · green **💾 Save** button.

**Canvas:** the white A4 sheet fitted to the screen width. It shows the slots in a grid:
- Rectangle slots (magnets) or circle slots (round magnets), each with a thin grey cut outline.
- **Empty slot:** light grey with a "+" and "Slot 3".
- **Filled slot:** photo cropped to fill the slot.
- **Selected slot:** purple outline.
- Tap an empty slot → opens the photo picker. Drag inside a filled slot → moves the photo.

**Tools panel (below the sheet):** the tools act on the selected slot.
- **Zoom:** slider 100%–300% with a live percentage, plus **−** and **+** buttons
- **Rotate:** **↺** 90° left, **↻** 90° right, and a **fine rotation slider** from -180° to +180° (shows "−90°") *(slider planned)*
- **Move:** drag the photo inside the slot
- **Flip:** horizontal flip *(planned)*
- **Reset:** back to the default fit
- **＋ Add photos:** fills all empty slots at once
- **Replace**, **Remove**
- **Auto-rotate all:** turns portrait photos to match landscape slots
- **Shape / page controls** *(planned)*: change the shape or paper size from a small settings button in the top bar, without leaving the editor
- **Page switcher** *(planned)*: when a design has more than one sheet, show "Sheet 1 / 2" with arrows and an "Add sheet" button

In the video this tool strip appeared as a row of numbered slot chips (1–8) with a zoom slider and a rotation angle readout ("−90°") below them. Keep that quick-glance feel: the zoom % and the rotation angle are always visible for the selected slot.

**After Save:** a celebration dialog:
- 🎉 "Design 001 is in the gallery. Print or download it there, or start the next layout."
- **＋ Create Next Design** (primary), **View in Gallery**, **Continue Editing**

**Rules**
- Leaving with unsaved changes asks for confirmation.
- Saving needs at least one photo.

### 5.8 Design Preview (modal from the Event Page)
- Title: "*Event name* · Design 001"
- Dark frame holding the full sheet preview
- Buttons: **🖨 Print**, **⬇ Download PNG** (primary)
- Second row: **Edit**, **Delete** (red), **Close**
- Download gives a print-ready 300 DPI PNG (about 7 MB). Print opens the device print dialog (WiFi printer) at A4, no margins.

### 5.9 Settings
- **Account:** username, role, **Log out**
- **Licence:** status badge, "Valid until 30 Sep 2027", days left
- **Storage:** "N events · N designs on this device", **Download all designs**, **Clear local data** (red, with confirmation)
- **About:** version, contact support

### 5.10 Admin (laptop-first, separate area)
- **Users table:** username, name, role, status (Active / Disabled), licence expiry date, last login, actions (Edit, Disable)
- **Add user** form: name, username, temporary password, role, licence expiry date picker
- **Edit user:** change expiry date (quick buttons +1 month / +1 year), reset password, enable/disable
- Filters: Active / Expiring in 30 days / Expired

---

## 6. Key user flows

**A. First use:** Login → Home (empty) → New Event → Event Page → Start New Design → Add photos → Save → Print.

**B. Everyday use:** Login → open event → Start New Design → pick photos → Save → Create Next Design (repeat) → Gallery → Print.

**C. Licence:** Login checks licence → valid: go to Home · expiring: amber warning chip · expired: Licence Expired screen.

**D. Offline:** App opens from the home screen → cached session → create, edit, save, download all work → Online badge turns red "Offline".

---

## 7. Data the screens show

| Item | Fields |
|---|---|
| **User** | username, name, role (operator/admin), status, licence expiry, last login |
| **Event** | name, paper size, product type, template size, created date, design count |
| **Design** | name (Design 001…), thumbnail, photos per slot (zoom, rotation, position), created date |

Photos and designs stay on the device. Only users and licences are stored on a server.

---

## 8. Components to design once and reuse

- Primary button (gradient), secondary button (grey), danger text button
- Text field, dropdown, disabled dropdown, field hint and error text
- Card, hero card (gradient), list row with chevron
- Pill/chip, badge (online/offline, licence), "Latest" tag
- Thumbnail card
- Slider (zoom) and icon button
- Modal sheet, toast
- Empty-state block with icon and one line of text
- Slot states on the sheet: empty, filled, selected

---

## 9. Ready-to-paste Stitch prompts

**Login**
> Mobile login screen for "MagZ", a fridge magnet printing app. Light background #f4f5fb, centred white card with 14px radius. Gradient logo (indigo #4f46e5 to violet #7c3aed) with a 2x2 grid icon, wordmark "MagZ" with a indigo Z. Title "Welcome back", subtitle "Sign in to your MagZ account". Username field, password field with show/hide eye, "Remember me" checkbox, full-width gradient "Log in" button, link "Forgot password? Contact your admin". Footer "Need the software? Get in touch with us". Friendly, clean, large touch targets. Also show an error variant with a red message "Incorrect username or password".

**Home – Events**
> Mobile home screen for MagZ. Top bar with logo, green "Online" pill, licence chip "Valid until 30 Sep 2027", home and settings icons. Gradient hero card with headline "Fridge magnet sheets, made easy" and a large "✨ New Event" button. Below, a white card "Events" with a list of rows: bold event name, muted product size, "3 designs ›" on the right. Include an empty state variant.

**New Event**
> Mobile form card titled "New Event" with helper text "Choose the product, shape and paper size". Fields in order: Event Name (placeholder "e.g. IACI 2026"); Product Type dropdown (main dropdown: Fridge Magnet, Photo Print, Badge, Keychain, Sticker); Photo Shape dropdown with a small shape icon beside each option (Rectangle landscape, Rectangle portrait, Square, Round, Oval, Rounded rectangle, Heart); Template Size dropdown (disabled state "Select Shape First"); Paper Size dropdown (A6, A5, A4, A3, 4x6 in, 5x7 in, 13x19 in, Custom) with pixel size shown in muted text; Portrait/Landscape toggle. At the bottom a small live preview of the empty sheet with slots drawn in the chosen shape and the text "8 photos per sheet · 80x53 mm · A4". Buttons Cancel (grey) and "Create & Open Event" (gradient). Indigo/violet theme, rounded 10px inputs. Also show the dropdown open state for Photo Shape.

**Event Page**
> Mobile screen with breadcrumb "Events › TM". Gradient hero card showing "TM", "3 designs on this device", chips "FridgeMagnet 3.1 x 2.1", "A4", "8 photos per sheet", and a large "✨ Start New Design" button. Below a card "Saved designs" with an info note and a 2-column grid of A4 sheet thumbnails, the first tagged "Latest". Red text button "Delete event" at the bottom.

**Editor (dark)**
> Mobile photo-layout editor on a dark navy #14122e background. Top bar: back arrow, "TM / Design 001", pill "3 / 8 photos", green Save button. Centre: a white A4 sheet with 8 rectangular landscape slots in 2 columns x 4 rows, some filled with photos, others light grey with a "+" and "Slot 3", one slot with a purple outline selected. Below: a strip of numbered slot chips 1-8, a zoom slider with "100%" and − / + buttons, a rotation slider showing the angle "−90°", and a row of buttons: Add photos, rotate left, rotate right, Flip, Reset, Auto-rotate all, Replace, Remove. A small settings button in the top bar changes shape or paper size. Also design variants with round (circle) slots 3 columns x 4 rows, and with oval slots.

**Saved dialog**
> Centred modal with party emoji, text "Design 001 is in the gallery. Print or download it there, or start the next layout." Buttons: "Create Next Design" (gradient), "View in Gallery" (grey), "Continue Editing" (text).

**Design Preview**
> Modal titled "TM · Design 001" with the sheet preview in a dark frame, buttons Print and "Download PNG" (gradient), second row Edit, Delete (red), Close.

**Licence Expired**
> Mobile screen with warning illustration, title "Your licence has expired", text "Expired on 30 Sep 2027. Contact us to renew.", primary button "Contact to renew", secondary "Log out", small link "Download my saved designs".

**Settings**
> Mobile settings screen with sections Account (username, role, Log out), Licence (badge, valid until, days left), Storage (events and designs count, Download all designs, Clear local data in red), About (version, contact support).

**Admin users (desktop)**
> Desktop admin page for MagZ with a users table: username, name, role, status badge (Active/Disabled), licence expiry date, last login, Edit and Disable actions. Filters: Active, Expiring in 30 days, Expired. "Add user" button top right opens a side panel with name, username, temporary password, role and licence expiry date picker.

---

## 10. Status

| Area | Status |
|---|---|
| Events, editor, gallery, PNG export, print, A4 only, rectangle / square / round shapes, zoom, 90° rotate, pan | Built (phase 1, no login) |
| Main product dropdown, oval / rounded / heart shapes, more paper sizes (A3, A5, A6, photo sizes, custom), orientation, fine rotation, flip, multi-sheet designs, sheet preview | **Designed here, to build next** |
| Login, licence check, expired screen, settings account/licence, admin area | **Design now, build in phase 2 (needs a backend)** |

# Cookie Clicker QoL Mod

## Goal

Build a non-gameplay-altering Cookie Clicker QoL and information mod for the Steam version.

The mod should feel like it belongs in Cookie Clicker rather than looking like a separate web app. Prefer the game's existing UI patterns, sprites, fonts, colors, panels, tooltips, and layout conventions. Add custom elements only when vanilla UI cannot present the information cleanly.

Do not alter progression, production, prices, unlock requirements, achievements, save progression, or other gameplay rules.

The mod is intended for public release on GitHub and potentially Steam Workshop. It is not commercial.

---

## Core features

### 1. FtHoF Planner

Integrate the functionality of FtHoF Planner v6.1 directly into the game UI.

Requirements:

* Read the current live game state directly from Cookie Clicker's in-memory state where practical.
* Investigate Cookie Clicker's own save/export implementation before writing a separate save parser.
* Determine the current seed and relevant Grimoire/Fortune state from the actual game state.
* Show upcoming Hand of Fate outcomes and useful cast information inside the game.
* Preserve the planner's informational nature. It must never automatically cast spells or alter the game state.
* Keep FtHoF calculations isolated from UI and gameplay code so they can be tested independently.
* Use FtHoF Planner v6.1 as a behavioral/formula reference.
* Do not blindly copy its entire implementation or UI.
* Reproduce the relevant calculations independently and verify that identical game states produce matching results.
* Clearly handle situations where the relevant game state is unavailable or the game version is incompatible.

The planner should feel like a native Cookie Clicker information panel, not a website embedded inside the game.

### 2. Statistics / graphs

Add useful historical information without creating a giant dashboard.

Potential metrics:

* CPS over time
* cookies earned over time
* cookies spent
* buildings owned
* upgrades purchased
* prestige / legacy changes
* golden cookie activity
* relevant buff/cast history
* FtHoF cast/prediction history where useful

Prefer small, focused vanilla-style panels or graphs that can be opened when needed.

Do not record enormous histories unnecessarily. Put reasonable bounds on in-memory history and keep persistent history minimal unless there is a clear reason to save it.

Do not build or introduce a general-purpose charting framework for a few graphs. A small custom implementation is preferable if practical.

### 3. "Why?" explanations

Where the mod calculates a recommendation or useful number, provide a small "Why?" interaction.

Examples:

* Why is this building considered efficient?
* Why is this purchase recommended?
* How was the payback time calculated?
* Why does this FtHoF result appear?
* Which game values were used in the calculation?

Show the actual inputs and simple calculation behind the result.

Avoid opaque scoring systems. The user should be able to understand where a number came from.

### 4. Purchase / planning information

Useful informational calculations may include:

* CPS gained from a building purchase
* cookies spent
* payback time
* marginal CPS
* building contribution to total CPS
* upgrade effects
* possible next purchases

These are recommendations and information only.

Never automatically buy anything.

---

## UI rules

* Vanilla Cookie Clicker style is the default.
* Reuse existing game DOM structures and CSS classes when appropriate.
* Reuse official game sprites/assets where appropriate.
* Use Cookie Clicker's existing tooltip system where possible.
* Reuse existing menu/panel patterns instead of inventing a new design system.
* Avoid modern SaaS/dashboard styling.
* Avoid excessive rounded cards, gradients, huge headers, bright accent colors, or unrelated icon sets.
* New panels should visually resemble existing Cookie Clicker menus.
* Information density is good, but keep the UI readable.
* The mod should look believable beside the vanilla Stats, Options, Store, and minigame UI.
* Prefer a few well-integrated controls over a permanent giant sidebar.
* Make every feature optional and easy to close.
* Do not permanently cover important parts of the vanilla interface.
* Custom elements are fine when necessary, but they should visually inherit from the vanilla game.

The goal is:

> Cookie Clicker, but with significantly better information.

Not:

> A modern dashboard pasted onto Cookie Clicker.

---

## Architecture

Use Cookie Clicker's official mod API where possible.

The normal entry point should use:

```js
Game.registerMod(id, mod)
```

The mod should provide the expected `init`, `save`, and `load` methods when persistent mod settings/state are needed.

Use hooks instead of monkey-patching game functions when a suitable hook exists.

Keep calculations separate from DOM/UI code.

A possible structure is:

```
info.txt
main.js
src/
    fthof.js
    stats.js
    planner.js
    ui.js
    calculations.js
css/
    main.css
```

Do not create this structure blindly.

If the project can be cleanly implemented with fewer files, use fewer files. Do not create abstractions or directories just to make the project look more sophisticated.

---

## Source and asset investigation

Before implementing game-specific behavior, inspect the Cookie Clicker Steam installation available on the development machine.

The installed Steam game is located at:

```
C:\Program Files (x86)\Steam\steamapps\common\Cookie Clicker
```

The source and relevant game files are generally located under:

```
C:\Program Files (x86)\Steam\steamapps\common\Cookie Clicker\resources\app\src
```

Inspect the actual installed version rather than relying on old internet copies or outdated wiki examples.

Use the local source to verify:

* current save/export functions
* Grimoire and Hand of Fate implementation
* relevant game state fields
* mod registration
* available hooks
* UI construction patterns
* tooltip functions
* asset paths
* sprite sheets
* CSS conventions
* current version-specific behavior

Do not modify the original Cookie Clicker installation.

Do not copy the entire Cookie Clicker source tree into the repository.

Do not copy large amounts of game assets unnecessarily.

Use the game's runtime assets directly when the mod environment allows it. If assets must be included, only include the minimum necessary and keep their provenance/license implications documented.

The installed game source is a reference for understanding and integrating with Cookie Clicker, not something to fork into this project.

---

## Save handling

Cookie Clicker exports its save as a Base64-encoded representation of game state.

Do not write a second save parser unless there is a concrete technical reason.

First investigate whether the live `Game` object already exposes everything required by FtHoF and the other features.

If parsing the exported save is genuinely required:

* isolate the parser
* document the exact game version assumptions
* fail safely on an unknown format
* never modify the player's save
* never silently import or overwrite progress
* never store or transmit the player's save externally

Prefer reading live game state over serializing and decoding the entire save whenever possible.

---

## Compatibility

Target the current Steam Cookie Clicker version found on the development machine.

Do not assume that old Cookie Clicker wiki/API examples are still exact.

When version-specific behavior is found:

* document it
* keep compatibility-sensitive code isolated
* avoid hardcoding values that can be read from the game
* fail gracefully when an expected API or state field is unavailable

The mod should not silently corrupt or modify game state because of a version mismatch.

---

## Gameplay integrity

This is strictly a QoL/info mod.

Never:

* change CPS
* change building prices
* change upgrade effects
* give free cookies
* alter cooldowns
* alter spell outcomes
* automatically click golden cookies
* automatically cast spells
* automatically buy buildings/upgrades
* modify ascension outcomes
* modify achievements/progression
* inject fake progression into the save
* modify the game's RNG or seeds

The planner may predict and display outcomes.

Prediction is not execution.

---

## Steam achievements

Investigate Cookie Clicker's current mod API/source for the appropriate achievement behavior.

If Cookie Clicker provides an official/documented mechanism for mods to preserve Steam achievements, use that mechanism when appropriate.

Do not assume a flag, workaround, or undocumented behavior is safe without checking the current implementation.

---

## Development principles

* Keep the implementation boring.
* Prefer existing Cookie Clicker APIs over custom abstractions.
* Prefer plain JavaScript and the game's DOM/CSS.
* Do not add a framework unless there is a concrete reason.
* Do not add dependencies unless they solve a real problem.
* Do not build a general-purpose charting framework for a few graphs.
* Do not create an abstraction layer around every Cookie Clicker object.
* Keep calculations deterministic and testable.
* Avoid polling when an existing game hook can provide the needed update.
* Avoid expensive work every game tick.
* Cache values that do not need recalculation every frame.
* Clean up timers, hooks, and DOM nodes when the mod is disabled/reloaded.
* Prefer the smallest implementation that satisfies the feature.
* Do not solve hypothetical future problems before they exist.

When there are two ways to implement something, prefer the simpler solution that integrates with Cookie Clicker's existing systems.

---

## Testing

Test against:

* a fresh save
* an established save
* a save with the Grimoire unlocked
* relevant buffs and spell states
* ascension/reload
* importing/exporting a save
* mod disable/re-enable
* game reload
* different window sizes
* missing or unexpected game state

For FtHoF specifically:

* compare calculated results against FtHoF Planner v6.1 for identical game states
* test different spell configurations
* test relevant buffs and Fortune effects
* test multiple upcoming casts
* test edge cases around cooldowns and spell availability

Do not alter the test save's progression just to make a test pass.

---

## Git / repository

The project is intended to be released publicly on GitHub and potentially through Steam Workshop.

Keep the repository clean:

* no personal save files
* no Steam account data
* no machine-specific absolute paths
* no generated build junk
* no copied full Cookie Clicker source tree
* no unnecessary third-party dependencies
* no private development logs containing personal information

Include clear installation and compatibility documentation.

---

## Working style for Codex

### Investigation comes before implementation

Before coding:

1. Inspect the repository.
2. Inspect the installed Cookie Clicker Steam source/assets.
3. Identify the exact current game version.
4. Locate the relevant vanilla APIs and state fields.
5. Locate the actual Grimoire/FtHoF implementation.
6. Locate save/export logic.
7. Locate relevant UI, tooltip, menu, hook, and sprite systems.
8. Investigate FtHoF Planner v6.1 behavior/formulas.
9. Determine the smallest architecture that can support the planned features.
10. Report findings and the proposed implementation plan.
11. Only then begin implementation.

Do not immediately start coding after reading this file.

During the investigation phase, make no source changes unless a small temporary test is required to verify a finding.

Do not invent Cookie Clicker APIs when the local source can answer the question.

When uncertain about a game-specific formula, verify it from the installed source before implementing it.

### Implementation priority

1. Correctness
2. Vanilla integration
3. Minimal complexity
4. Performance
5. Visual polish

The mod should feel like Cookie Clicker gained better information tools, not like a separate application was bolted onto it.
# Single Wizard UI Plan

## Goal

Replace the current decorative CLI dashboard with one focused Ink wizard for the initial IaC Toolbox CLI experience.

## Requested Behavior

- The CLI should present a single wizard flow instead of a dashboard or static landing screen.
- Users should navigate choices with the up and down arrow keys.
- Users should confirm the highlighted choice with Enter.
- The UI should stay practical and minimal while backend actions are not yet required.
- The flow should make the selected choices clear and end with an explicit summary.

## Current UI Notes

- `src/cli.tsx` only renders the React app with Ink.
- `src/app.tsx` owns the visible UI and currently includes a decorative header, startup loading animation, environment status, a static hello section, and a Ctrl+C footer.

## Proposed Implementation

- Keep `src/cli.tsx` as the minimal Ink render entrypoint.
- Replace the ornamental `src/app.tsx` layout with one `App` wizard component.
- Model the wizard as a small list of steps, each with a prompt and options.
- Track the current step, highlighted option, and selected answers in React state.
- Use Ink `useInput` to handle:
  - Up arrow: move highlight to the previous option.
  - Down arrow: move highlight to the next option.
  - Enter: save the highlighted option and advance the wizard.
- Once all steps are complete, show a concise review screen and note that backend actions are not wired yet.

## Open Questions

- Which real backend action should run after the summary step?
- What final set of IaC workflows should the wizard expose once the CLI has implemented actions?

## Validation

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- Manual smoke check with `npm run dev` to confirm the wizard renders and responds to arrow navigation.

## Definition Of Done

- The old decorative dashboard UI is removed or reduced to a single wizard flow.
- Arrow-key navigation is clear and usable.
- A durable plan exists in `docs/`.
- Validation passes.
- The branch is pushed and a PR linked to issue #19 is opened or updated.

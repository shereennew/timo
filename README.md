# timö — tiny moments: first screen

A mobile-first student workload dashboard made with React, JavaScript, and ordinary CSS.

## Run it

Open this folder in VS Code, open a terminal, then run:

```sh
npm install
npm run dev
```

Open the local address Vite prints. Keep the terminal running. Save an edit to see the browser update automatically.

## Files to learn first

- `src/App.jsx`: the dashboard markup, sample categories, calculated total, and suggestion button. JSX is HTML-like markup inside JavaScript. `className` connects an element to CSS.
- `src/App.css`: dashboard colors, cards, spacing, and small-screen adjustments.
- `src/index.css`: page-wide font, background, and box sizing.
- `src/main.jsx`: attaches the App component to the `root` element in the HTML file.
- `index.html`: the browser page, title, description, and root element.
- `package.json`: dependencies and commands. `dev` runs the local app; `build` creates a production version; `lint` checks code.
- `vite.config.js`: connects React to Vite. You can leave this alone for now.

## Try your first edit

In `src/App.jsx`, change Academic’s `points: 5` to `points: 2` and save. The total becomes 7 / 8 and the warning disappears. Change it back to restore the overloaded demo.

The demo starts at 10 planned points against 8 points of capacity. Points represent illustrative effort, not hours or a medical score. Recovery time is shown separately. Lighten My Load opens a suggestion; it does not move tasks or save changes. Refreshing resets the panel. No database, AI service, account, or extra styling framework is connected.

The generated starter uses Oxlint for its `npm run lint` command.


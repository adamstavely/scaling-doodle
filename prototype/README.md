# Intellect prototype

A standalone, clickable build of the Intellect frontend in this repo running on data recorded from a seeded [intellect-api](https://github.com/adamstavely/intellect-api). It's one HTML file with nothing to install and no server or network needed.

Open `index.html` in a browser. It was built from `main` at 3826d4d, so it does not update when the app changes.

- Every screen works: Summary, Centers & Teams, Research Topics, Papers & Impact, Partner Labs, ⌘K search and the Directorate Brief (`#/?brief=FY27-Q1`).
- Switch between the Chief and PI views from the account menu (top right).
- The calendar is held at 16 Nov 2026, the date the data was seeded, so periods and "as of" labels match the data.
- Grading a paper and creating a topic work, but last only until the page is reloaded.

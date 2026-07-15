# DSA Visualizer

An interactive, browser-based Data Structures & Algorithms visualizer — built with **plain HTML5, CSS3, and vanilla JavaScript (ES6)**. No frameworks, no build step, no dependencies. Clone it, open `index.html`, and start exploring.

The interface is designed around a simple idea: every algorithm runs like a program under a debugger. A breakpoint rail tracks the executing pseudocode line, step controls mirror a debugger's step-in/step-out, and two consistent signal colors (amber = active, teal = visited/settled) carry meaning across every module.

![Theme](https://img.shields.io/badge/theme-dark%20%2F%20light-8C7CFF) ![No dependencies](https://img.shields.io/badge/dependencies-none-5FD97A) ![License](https://img.shields.io/badge/license-MIT-FF8A3D)

## ✨ Features

- **10 visualizer modules** covering sorting, searching, array techniques, recursion, linked lists, stacks, queues, trees, graphs, and dynamic programming
- **Cinematic boot intro** — an ambient particle field resolves into a small animated graph cluster with a terminal-style status log; plays once per session, always skippable (click / `Esc` / skip button), and collapses to an instant reveal under reduced-motion
- **Playback controls everywhere** — Start, Pause, Resume, Step Forward, Step Backward, Reset, and an adjustable speed slider
- **Directional comparison coloring** — every comparison shows *which way it resolved*: blue for the smaller/rejected side, amber for the larger/accepted side, consistently across sorting, searching, trees, graphs, DP, and more
- **Live pseudocode panel** with a highlighted "current line" that tracks execution
- **Stat counters** — comparisons, swaps, visited nodes, elapsed time — updated per step
- **Complexity & theory tabs** — best/average/worst case, space complexity, applications, advantages, and disadvantages for every algorithm
- **Dark & light themes**, fully responsive down to mobile
- **Keyboard shortcuts** (`/` search, `1`–`0` jump to a module, `T` toggle theme, `M` toggle sidebar)
- **Favorites** — star any module from the home screen for quick access
- **Custom & random input** on every visualizer, plus draggable nodes on the graph canvas
- Zero build tools — it's just static files

## 📂 Folder Structure

```
DSA-Visualizer/
├── index.html                # App shell (topbar, sidebar, main content mount, boot intro markup)
├── landing.html               # Optional standalone marketing/splash page — links into index.html
├── css/
│   ├── style.css              # Design tokens (colors, type), resets, base
│   ├── layout.css             # App shell grid, sidebar, responsive breakpoints
│   ├── components.css         # Buttons, panels, code rail, bars, badges, toasts
│   ├── animations.css         # Keyframes & transition helpers
│   ├── intro.css              # Cinematic boot sequence (particle canvas, status log, progress bar)
│   └── landing.css            # In-app home view: hero, stats, feature grid
├── js/
│   ├── utils.js                # DOM helpers, toast system, StepPlayer engine
│   ├── intro.js                 # Boot intro controller (canvas scene + typewriter status log)
│   ├── workspace.js            # Shared workspace builder (stage + controls + tabs)
│   ├── sorting.js               # Bubble/Selection/Insertion/Merge/Quick/Heap/Shell/Counting Sort
│   ├── searching.js             # Linear & Binary Search
│   ├── array.js                 # Two-pointer & sliding-window array/string techniques
│   ├── recursion.js             # Factorial, Tower of Hanoi, recursive binary search, merge-sort tree
│   ├── linkedlist.js            # Singly / Doubly / Circular linked lists
│   ├── stack.js                 # Interactive stack + Parentheses Matching + Next Greater Element
│   ├── queue.js                 # Simple / Circular / Deque / Priority Queue
│   ├── tree.js                  # BST, AVL (with rotations), Max-Heap
│   ├── graph.js                 # BFS, DFS, Dijkstra, Prim, Kruskal, Topological Sort, Cycle Detection, Connected Components
│   ├── dp.js                    # Fibonacci, 0/1 Knapsack, LCS, LIS, Coin Change, Matrix Chain Multiplication
│   └── main.js                   # Sidebar, routing, theme, shortcuts, favorites, home view, boot sequence
├── assets/                    # (space reserved for icons/screenshots)
└── README.md
```

Both `index.html` and `landing.html` share the same design tokens and the same `localStorage` theme key, so toggling dark/light mode on one carries over to the other.

## 🚀 Getting Started

No build step required.

```bash
git clone https://github.com/<your-username>/DSA-Visualizer.git
cd DSA-Visualizer
# then just open index.html in a browser, or serve it locally:
python3 -m http.server 8080
```

Visit `http://localhost:8080` and you're in.

## 🧠 Algorithm Coverage

| Category | Included |
|---|---|
| **Sorting** | Bubble, Selection, Insertion, Merge, Quick, Heap, Shell, Counting Sort |
| **Searching** | Linear Search, Binary Search |
| **Array Techniques** | Reverse Array, Move Zeroes, Container With Most Water, Two Sum, Max Subarray (Kadane's), Fixed Sliding Window Sum, Longest Substring Without Repeating Characters, Sliding Window Maximum |
| **Recursion** | Factorial, Tower of Hanoi, Recursive Binary Search, Merge Sort Recursion Tree |
| **Linked Lists** | Singly, Doubly, Circular — insert head/tail/position, delete, reverse, traverse, search |
| **Stack** | Push/Pop/Peek/Clear, Parentheses Matching, Next Greater Element |
| **Queue** | Simple Queue, Circular Queue, Deque, Priority Queue |
| **Trees** | BST (insert/delete/search/traversals), AVL (with rotation visualization), Max-Heap |
| **Graphs** | BFS, DFS, Dijkstra's Shortest Path, Prim's MST, Kruskal's MST, Topological Sort, Cycle Detection, Connected Components |
| **Dynamic Programming** | Fibonacci, 0/1 Knapsack, Longest Common Subsequence, Longest Increasing Subsequence, Coin Change, Matrix Chain Multiplication |

Every algorithm includes: time complexity (best/average/worst), space complexity, real-world applications, advantages, and disadvantages — all in the side panel.

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus the search bar |
| `1`–`0` | Jump to a module |
| `T` | Toggle dark / light theme |
| `M` | Toggle the sidebar (mobile) |
| `Esc` | Close sidebar / unfocus a field |

## 🛠 Architecture Notes

- **`StepPlayer`** (`utils.js`) is a small generic playback engine. Every algorithm module precomputes an array of `{ desc, line, counters, render }` steps up front; the player just walks an index through that array. This gives every visualizer play/pause/resume/step-forward/step-backward/reset "for free" without duplicating playback logic in each module.
- **`Workspace.build()`** (`workspace.js`) generates the shared stage + control dock + tabbed side panel (Pseudocode / Complexity / Notes) markup used by every module, so each algorithm file only supplies *content*, not layout boilerplate.
- Interactive structures (Stack, Queue, Linked List, Trees) reuse the same `StepPlayer` as an **operation history log** — every push/pop/insert/delete is recorded as a step, so Step Backward doubles as undo.

## 🗺 Future Improvements

- Export animation as GIF / video
- Save & import custom datasets to a file
- Screenshot-to-clipboard button
- More graph algorithms (A*, Bellman-Ford, Floyd-Warshall)
- Red-Black Trees and B-Trees
- Unit tests for core algorithm correctness

## 📄 License

MIT — free to use, modify, and share. Built as a portfolio-quality reference project for learning and teaching data structures & algorithms.

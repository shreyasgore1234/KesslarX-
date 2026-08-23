# KesslerX

> **AI-Powered Orbital Traffic Management & Space Situational Awareness**

![Status](https://img.shields.io/badge/Status-Active-00FF99?style=flat-square)
![Version](https://img.shields.io/badge/Version-2.1-00AEEF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FFC107?style=flat-square)

## Overview

KesslerX is a production-grade aerospace dashboard for monitoring satellites, tracking space debris, predicting collisions, analyzing orbital congestion, and providing mission-control intelligence. Designed with a NASA/SpaceX mission-control aesthetic.

## Features

- 🌍 **3D Orbital Map** — Interactive CesiumJS globe with real-time satellite/debris tracking
- ⚠️ **Collision Monitor** — Conjunction assessment and collision avoidance recommendations
- 📊 **Analytics** — Satellite growth, debris trends, country ownership, collision history
- ☀️ **Space Weather** — Solar activity, Kp index, solar wind, and Bz monitoring
- 🧪 **Kessler Simulator** — Cascading debris collision simulation
- 🤖 **AI Copilot** — AI-powered orbital intelligence assistant
- 🔔 **Alert Center** — Real-time threat notifications with severity classification
- 📋 **Reports** — Automated orbital situation reports with PDF export
- ⚙️ **Settings** — Configurable display, notifications, API keys, and globe settings

## Project Presentation
[View KesslerX Presentation](./KesslerX-presentation.pdf)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| 3D Globe | CesiumJS + Resium |
| Charts | Recharts |
| Routing | React Router v7 |
| Icons | Lucide React |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

## Environment Variables

Create a `.env` file:

```env
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token_here
```

Get a free token at [cesium.com/ion/tokens](https://cesium.com/ion/tokens)

## Project Structure

```
src/
├── components/
│   ├── ai/           # AI Copilot bar
│   ├── alerts/       # Alert cards and stack
│   ├── dashboard/    # Globe, metrics, charts
│   ├── layout/       # Sidebar, Header, RightPanel
│   └── ui/           # Reusable components
├── pages/            # 10 route pages
├── data/             # Mock data catalog
├── App.tsx           # Root with routing
└── index.css         # Design system
```

## AI Development Logs

See [AI_LOGS/](./AI_LOGS/) for full development session history, enabling seamless team handoff.

## Design

- Ultra-dark aerospace theme (#050816)
- Glassmorphism panels with backdrop blur
- Glow effects and animated borders
- Orbitron + Space Grotesk + Inter typography
- Micro-animations on hover and state change

## 📚 Project Resources

| Resource | Description |
|---|---|
| 📊 [Project Presentation](./presentation/KesslerX-Presentation.pdf) | Complete project overview and solution |
| 🎥 [Video Walkthrough](https://youtu.be/z5Q16NOfQpM) | Watch the full project demo |
| 🌐 [Live Demo](https://kessler-x.vercel.app/) | Explore the deployed platform |
| 💻 [Source Code](https://github.com/Anish1302D/KesslerX) | Explore the complete implementation |

## License

MIT

---
blogPost: true
title: "Ultimate Anti-Blocking & Zero Port Exposure: Bidirectional Fake IP for Frp over Xray"
description: Wrapping FRP traffic inside Xray tunnel
date: 2026-07-10
author: 100pangci
tags: [tech, Linux, Xray, Frp]
---

> **Note**: For the complete Chinese version of this article, please refer to the [Chinese original](/posts/Frp-Xray). The English translation is pending.

When dealing with NAT traversal, FRP is often the go-to choice. However, traditional FRP has two fatal pain points:
1. **Obvious traffic patterns, easily blocked by GFW**: Even with TLS, carriers and firewalls can still identify FRP traffic, leading to connection blocking or VPS IP blacklisting.
2. **Full port exposure to the public, extremely insecure**: Any port exposed to the internet will be scanned by various bots and script kiddies instantly.

To solve these two problems, many people's idea is to "wrap FRP in a proxy tunnel." This sounds simple, but in practice, it faces numerous obstacles from proxy software routing rules.

Today, I'll share a highly "deceptive" high-level architecture: **using a "bidirectional fake public IP" trick to perfectly bypass the restrictions of both Xray client and server, achieving true "zero public port exposure" and "perfect traffic camouflage."**

---

## Core Architecture: A "Play" to Deceive Xray

The core of this solution is to completely hide FRP traffic inside Xray (or 3X-UI) secure tunnels (such as VLESS-XTLS / Trojan). To make FRP and Xray work together perfectly, we introduce two **completely fictitious public IPs**:
* **`22.22.22.22`**: Used to deceive the **client Xray**, forcing FRP traffic into the tunnel.
* **`11.11.11.11`**: Used to deceive the **server Xray**, bypassing local private IP access restrictions (anti-SSRF), and ultimately redirecting to the FRP server via the kernel.

The entire architecture exposes only the Xray proxy port (e.g., 443) on the public internet. The FRP server (frps) and all tunneled service ports are "physically hidden" in the VPS's local loopback interface.

---

## Step 1: Server Deployment — Hide FRPS in Local Loopback

### 1. Modify Systemd Startup Script
### 2. Configure FRPS

...

For the complete content (including server deployment, client configuration, routing rules, and data flow diagrams), please read the [Chinese original](/posts/Frp-Xray).

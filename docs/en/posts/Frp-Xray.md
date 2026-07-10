---
blogPost: true
title: "Ultimate Anti-Blocking & Zero Port Exposure: Bidirectional Fake IP for Frp over Xray"
description: Wrapping FRP traffic inside Xray tunnel
date: 2026-07-10
author: 100pangci
tags: [tech, Linux, Xray, Frp]
---

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

Normally, we could let `frps` listen on `127.0.0.1`, but this would be blocked by Xray's security mechanisms later. Therefore, we need to use Linux features to forcibly bind a virtual public IP `11.11.11.11` on the local loopback interface (`lo`).

### 1. Modify Systemd Startup Script
Edit `/etc/systemd/system/frps.service` to dynamically add and remove this virtual IP when starting and stopping the service:

```ini
[Unit]
Description=Frp Server Service
After=network.target

[Service]
Type=simple
User=root

# Bind virtual IP to local lo interface before startup
ExecStartPre=-/sbin/ip addr add 11.11.11.11/32 dev lo
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
# Unbind virtual IP after stop
ExecStopPost=-/sbin/ip addr del 11.11.11.11/32 dev lo

Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
```

### 2. Configure FRPS
Make the FRP server listen only on this virtual IP. The public internet cannot access it directly.

```toml
# /opt/frp/frps.toml
bindAddr = "11.11.11.11"
bindPort = 7000
proxyBindAddr = "11.11.11.11"

[auth]
method = "token"
token = "your-strong-password"

[transport]
tls.force = false
tcpMux = true
heartbeatTimeout = 120
```

> **How it works (Why 11.11.11.11?)**
> Server-side proxy software (e.g., 3X-UI) typically has anti-SSRF protection that **blocks proxy traffic to local private IPs like `127.0.0.1`** . If we redirect directly to 127.0.0.1, the traffic will be dropped by Xray. By specifying `11.11.11.11`, a "fake public IP", Xray's security check treats it as a legitimate external address and allows it through. When the traffic exits Xray, the Linux kernel finds this IP on the local `lo` interface and delivers it precisely to the listening `frps`.

---

## Step 2: Client Configuration — Force Traffic into the Tunnel

On the client machine (e.g., a NAS or PC running Syncthing at home), we need to configure `frpc` to route through the local Xray proxy (e.g., SOCKS5 proxy on port 1145).

### FRPC Configuration
```toml
# config/frpc.toml
serverAddr = "22.22.22.22"  # Key point: this IP is fake!
serverPort = 7000

[auth]
method = "token"
token = "your-strong-password"

[transport]
proxyURL = "socks5://127.0.0.1:1145" # Point to local Xray/v2ray client
tls.enable = false
tcpMux = true
heartbeatInterval = 30
heartbeatTimeout = 120

[[proxies]]
name = "syncthing"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8384
remotePort = 8384
```

> **How it works (Why 22.22.22.22?)**
> Most Xray clients have a high-priority routing rule: `geoip:private -> direct` (direct connection for private IPs). If you use `127.0.0.1` or `192.168.x.x` here, the Xray client will treat it as a local address and skip the proxy tunnel, causing FRP to fail to connect to the external network. Using a fake public IP `22.22.22.22` successfully tricks the Xray client into encrypting and packaging the traffic to the VPS.

---

## Step 3: Server Gateway Routing — 3X-UI Precise Redirection

When an external device (e.g., a phone connected through the proxy) wants to access your home Syncthing (port 8384), the request goes to `22.22.22.22:8384`, reaching the 3X-UI on the VPS.

We need to configure routing rules in 3X-UI to "divert" this traffic to the hidden FRPS.

**1. Create a Routing Rule:**
* Network: `tcp` (or any)
* Destination IP: `22.22.22.22`
* Destination Port: `8384`
* Outbound Tag: `to-8384`

**2. Create a Corresponding Outbound Rule:**
* Protocol: `freedom` (direct)
* Tag: `to-8384`
* **Redirect**: `11.11.11.11:8384`

*(Note: If there are multiple FRP-mapped ports, such as 7000, 8384, etc., you can create multiple corresponding Redirect outbound and routing rules as needed, or use regex matching)*

---

## Complete Data Flow Diagram

With this, the elaborate "deception game" is complete. The complete data flow is as follows:

```text
[Client (e.g., Phone)] -> Requests 22.22.22.22:8384
       │
   (Encrypted Tunnel)
       ▼
[VPS: Xray/3X-UI Server] 
       │ 
       ├─ (Triggers route match 22.22.22.22:8384 -> outbound to-8384)
       │ 
       └─ (Executes Redirect to 11.11.11.11:8384)
       │
[VPS: Linux Kernel takes over] -> Finds 11.11.11.11 on local lo interface
       ▼
[VPS: frps Server (listening on 11.11.11.11)]
       │
   (FRP protocol tunnel - running inside Xray proxy tunnel)
       ▼
[Local: frpc Client] 
       │
       ▼
[Local: Syncthing Service (127.0.0.1:8384)]
```

---
blogPost: true
title: 终极防封与零端口暴露：利用双向伪造 IP 实现 Frp over Xray 隐藏架构
description: Xray包裹Frp流量的实现
date: 2026-07-10
author: 100pangci
tags: [技术, Linux, Xray, Frp]
---

在折腾内网穿透时，FRP 往往是大家的首选。但传统的 FRP 有两个致命痛点：
1. **流量特征明显，极易被墙（GFW）阻断**：哪怕用了 TLS，各大运营商和防火墙依旧能精准识别 FRP 特征，轻则阻断连接，重则封锁 VPS IP。
2. **端口完全暴露在公网，极不安全**：不管你开什么端口，只要暴露在公网上，分分钟就会被各路扫描器和脚本小子扫爆。

为了解决这两个问题，很多人的思路是“把 FRP 套在代理隧道里”。这听起来简单，但在实际操作中会遇到代理软件路由规则的层层阻碍。

今天，我将分享一套极具“欺骗性”的高阶架构：**通过“双向伪造公网 IP”的障眼法，完美绕过 Xray 客户端与服务端的双向限制，实现真正的“公网零端口暴露”与“完美流量伪装”。**

---

## 架构核心思想：一场欺骗 Xray 的“大戏”

这套方案的核心是将 FRP 流量完全隐藏在 Xray（或 3X-UI）的安全隧道（如 VLESS-XTLS / Trojan）中。为了让 FRP 和 Xray 完美配合，我们引入了两个**完全虚构的公网 IP**：
* **`22.22.22.22`**：用于欺骗**客户端 Xray**，强制 FRP 流量进入隧道。
* **`11.11.11.11`**：用于欺骗**服务端 Xray**，绕过本地私有 IP 访问限制（防 SSRF），并最终交由内核重定向到 FRP 服务端。

整个架构在公网上只暴露 Xray 的代理端口（如 443），FRP 服务端（frps）和所有穿透出来的服务端口全部“物理隐身”于 VPS 的本地回环网卡（loopback）中。

---

## 第一步：服务端部署 —— 把 FRPS 藏进本地回环

正常情况下，我们可能会让 `frps` 监听 `127.0.0.1`，但这在后续会被 Xray 的安全机制拦截。因此，我们需要利用 Linux 的特性，在本地回环网卡（`lo`）上强行绑定一个虚拟的公网 IP：`11.11.11.11`。

### 1. 修改 Systemd 启动脚本
编辑 `/etc/systemd/system/frps.service`，在启动和停止服务时，动态添加和删除这个虚拟 IP：

```ini
[Unit]
Description=Frp Server Service
After=network.target

[Service]
Type=simple
User=root

# 启动前将虚拟 IP 绑定到本地 lo 网卡
ExecStartPre=-/sbin/ip addr add 11.11.11.11/32 dev lo
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
# 停止后解绑虚拟 IP
ExecStopPost=-/sbin/ip addr del 11.11.11.11/32 dev lo

Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
```

### 2. 配置 FRPS
让 FRP 服务端只监听在这个虚拟 IP 上。外界公网根本无法直接访问。

```toml
# /opt/frp/frps.toml
bindAddr = "11.11.11.11"
bindPort = 7000
proxyBindAddr = "11.11.11.11"

[auth]
method = "token"
token = "你的超强密码"

[transport]
tls.force = false
tcpMux = true
heartbeatTimeout = 120
```

> **原理揭秘（为什么要用 11.11.11.11？）**
> 服务端的代理软件（如 3X-UI）通常自带防 SSRF 保护，**禁止代理流量访问 `127.0.0.1` 等本地私有 IP**。如果我们直接重定向到 127.0.0.1，流量会被 Xray 丢弃。通过指定 `11.11.11.11` 这个“伪公网 IP”，Xray 的安全检查会将其视为合法的外部地址并予以放行；而当流量从 Xray 流出后，Linux 内核发现这个 IP 就在本地 `lo` 网卡上，于是精准送达监听中的 `frps`。

---

## 第二步：客户端配置 —— 强制流量入洞

在客户端机器上（如家里运行 Syncthing 的 NAS 或电脑），我们需要配置 `frpc` 走本地的 Xray 代理（例如 1145 端口提供的 SOCKS5 代理）。

### FRPC 配置
```toml
# config/frpc.toml
serverAddr = "22.22.22.22"  # 重点：这里的 IP 是伪造的！
serverPort = 7000

[auth]
method = "token"
token = "你的超强密码"

[transport]
proxyURL = "socks5://127.0.0.1:1145" # 指向本地 Xray/v2ray 客户端
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

> **原理揭秘（为什么要用 22.22.22.22？）**
> 大多数 Xray 客户端都有一个高优先级的路由规则：`geoip:private -> direct`（私有 IP 直连）。如果你在这里填 `127.0.0.1` 或者 `192.168.x.x`，Xray 客户端会认为这是内网地址，直接跳过代理隧道，导致 FRP 根本连不上外网。填一个伪造的公网 IP `22.22.22.22`，能成功骗过 Xray 客户端，让它老老实实地把流量加密打包发往 VPS。

---

## 第三步：服务端网关路由 —— 3X-UI 精准重定向

当我们在外面的设备（比如手机连着代理）想要访问家里的 Syncthing（8384 端口）时，请求的是 `22.22.22.22:8384`，流量会到达 VPS 上的 3X-UI。

此时我们需要在 3X-UI 中配置路由规则，将这部分流量“引流”到隐藏的 FRPS 中。

**1. 创建路由规则 (Routing Rule):**
* 网络 (Network): `tcp` (或 any)
* 目标 IP (IP): `22.22.22.22`
* 目标端口 (Port): `8384`
* 出站标签 (Outbound Tag): `to-8384`

**2. 创建对应的出站规则 (Outbound):**
* 协议 (Protocol): `freedom` （直连）
* 标签 (Tag): `to-8384`
* **重定向 (Redirect)**: `11.11.11.11:8384`

*(注：如果有多个 FRP 映射的端口，比如 7000, 8384 等，可以按需创建多条对应的 Redirect 出站和路由规则，或者使用正则匹配)*

---

## 完整数据流向图解

到这里，这场精妙的“欺骗游戏”就完成了。整个数据流向如下：

```text
[访问端 (如手机)] -> 请求访问 22.22.22.22:8384
       │
   (加密隧道)
       ▼
[VPS: Xray/3X-UI 服务端] 
       │ 
       ├─ (触发路由匹配 22.22.22.22:8384 -> 出站 to-8384)
       │ 
       └─ (执行 Redirect 重定向至 11.11.11.11:8384)
       │
[VPS: Linux 内核接管] -> 发现 11.11.11.11 就在本地 lo 网卡
       ▼
[VPS: frps 服务端 (监听在 11.11.11.11)]
       │
   (FRP 协议隧道 - 运行在 Xray 代理隧道内部)
       ▼
[本地: frpc 客户端] 
       │
       ▼
[本地: Syncthing 服务 (127.0.0.1:8384)]
```
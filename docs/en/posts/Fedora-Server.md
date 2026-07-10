---
blogPost: true
title: Fedora Server Installation and Maintenance Guide
description: Containerization! Containerize everything!
date: 2026-07-10
author: 100pangci
tags: [tech, Linux, Fedora, NAS]
---

> **Note**: This article was translated from Chinese. Some technical details may reference the original language version for accuracy.

```text
+----------------------------------------------------------------------------+
|                         Fedora-NAS Architecture                            |
+----------------------------------------------------------------------------+
|                                                                            |
|  +---------------+    +---------------------------------------------------+|
|  |   Internet    |<-->|              Frp Tunnel (Public)                  ||
|  +---------------+    +------------------------+--------------------------+|
|                                                |                           |
|  +---------------------------------------------+--------------------------+|
|  |              enp2s0 - 192.168.86.221/24                                ||
|  |              Router: MAC bind -> Static IP                             ||
|  +---------+----------+----------+----------+----------+------------------+|
|  | SSH :22 | Cockpit  |  Samba   | firewalld| dhcpv6   | iperf3           ||
|  |         | :9090    | 445/139  | 20+ srvs |          |                  ||
|  +---------+----------+----------+----------+----------+------------------+|
|                      Fedora Server 44 - SELinux enforcing                  |
+----------------------------------------------------------------------------+
|                       Podman Container Layer                               |
|                                                                            |
|  +--------------------------------------+   +----------------------------+ |
|  |  LinuxServer <-- host mode -- KEY!   |   |  Frpc (host mode)          | |
|  |  +-- V2rayN  -> :1145 (proxy)        |   |  13 ports tunneled         | |
|  |  +-- noVNC   -> :3000 (desktop)      |   +----------------------------+ |
|  |  +-- Everything Server               |                                  |
|  +-----------------+--------------------+                                  |
|                    | All containers rely on :1145 proxy                    |
|                    v                                                       |
|  +---------+ +---------+ +---------+ +---------+ +---------+ +---------+   |
|  | Jellyfin| | Openlist| |OpenWebUI| |qBittorrt| |Syncthing| | BiliSync|   |
|  |  :8096  | |  :5244  | |  :8080  | |  :7474  | |  :8384  | | :12345  |   |
|  +---------+ +---------+ +---------+ +---------+ +---------+ +---------+   |
|  +---------+ +---------+ +---------+ +---------+                           |
|  | Scrutiny| | PeerBan | |  vnstat | |baidunet |                           |
|  |  :8088  | |  :9898  | |  :8685  | |  :5899  |                           |
|  +---------+ +---------+ +---------+ +---------+                           |
+----------------------------------------------------------------------------+
|                         Storage Layer                                      |
|                                                                            |
|  +-----------+-----------+--------+--------+--------+--------+             |
|  | nvme0n1p3 | nvme1n1p1 |  sda2  |  sdb2  |  sdc2  |  sdd2  |             |
|  | 116.7G VM | 119.2G SSD| 3.6T   | 12.7T  | 3.6T   | 12.7T  |             |
|  | / (system)| Cache     | Old-1  | New-2  | Old-2  | New-1  |             |
|  +-----------+-----------+--------+--------+--------+--------+             |
|                                                                            |
+----------------------------------------------------------------------------+
```

## Part 0: Disaster Recovery Quick Guide

> **Goal**: After a complete system crash, follow this guide to rebuild the NAS server from scratch.
> **Prerequisite**: Read section 0.1 first to ensure all critical files are backed up.

---

### 0.1 Critical Files to Back Up in Advance

Back up the following files to a safe location (USB drive/other computer/cloud) before system crash:

| #   | File Path                              | Purpose        | Backup Method                                                |
| --- | -------------------------------------- | -------------- | ------------------------------------------------------------ |
| 1   | `/etc/fstab`                           | Disk mount cfg | `cp /etc/fstab /mnt/backup/`                                |
| 2   | `/etc/samba/smb.conf`                  | Samba config   | `cp /etc/samba/smb.conf /mnt/backup/`                       |
| 3   | `/etc/dnf/dnf.conf`                    | DNF config     | `cp /etc/dnf/dnf.conf /mnt/backup/`                         |
| 4   | `~/Podman/*/docker-compose.yml`        | Container cfg  | `cp -r ~/Podman /mnt/backup/`                               |
| 5   | `~/Tools/*`                            | Scripts        | `cp -r ~/Tools /mnt/backup/`                                |
| 6   | `~/Scripts/*`                          | Cron scripts   | `cp -r ~/Scripts /mnt/backup/`                              |
| 7   | `/etc/ssh/sshd_config`                 | SSH config     | `cp /etc/ssh/sshd_config /mnt/backup/`                      |
| 8   | `~/.ssh/authorized_keys`               | SSH public key | `cp ~/.ssh/authorized_keys /mnt/backup/`                    |
| 9   | `~/.zshrc` and `~/.p10k.zsh`           | Shell config   | `cp ~/.zshrc ~/.p10k.zsh /mnt/backup/`                      |
| 10  | `/etc/firewalld/zones/`                | Firewall rules | `cp -r /etc/firewalld /mnt/backup/`                         |
| 11  | `~/.config/containers/containers.conf` | Container cfg  | `cp ~/.config/containers/containers.conf /mnt/backup/`      |

> **Note**: For the complete Chinese version of this article (including all detailed sections on system installation, storage architecture, Podman deployment, and daily operations), please refer to the [Chinese original](/posts/Fedora-Server). The English translation of the full content is pending.

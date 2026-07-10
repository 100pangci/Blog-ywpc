---
blogPost: true
title: Fedora Server Installation and Maintenance Guide
description: Containerization! Containerize everything!
date: 2026-07-10
author: 100pangci
tags: [tech, Linux, Fedora, NAS]
---

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
|  |              Router: MAC bind -> Static IP                             |
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
> **Prerequisite**: Read section 0.1 first to ensure all critical files are backed up before proceeding.

---

### 0.1 Critical Files to Back Up in Advance

Back up the following files to a safe location (USB drive/other computer/cloud) before system crash:

| #   | File Path                              | Purpose          | Backup Method                                                |
| --- | -------------------------------------- | ---------------- | ------------------------------------------------------------ |
| 1   | `/etc/fstab`                           | Disk mount config | `cp /etc/fstab /mnt/backup-path/`                           |
| 2   | `/etc/samba/smb.conf`                  | Samba share config | `cp /etc/samba/smb.conf /mnt/backup-path/`                  |
| 3   | `/etc/dnf/dnf.conf`                    | DNF acceleration config | `cp /etc/dnf/dnf.conf /mnt/backup-path/`                |
| 4   | `~/Podman/*/docker-compose.yml`        | All container configs | `cp -r ~/Podman /mnt/backup-path/`                          |
| 5   | `~/Tools/*`                            | Ops scripts      | `cp -r ~/Tools /mnt/backup-path/`                           |
| 6   | `~/Scripts/*`                          | Cron task scripts | `cp -r ~/Scripts /mnt/backup-path/`                         |
| 7   | `/etc/ssh/sshd_config`                 | SSH service config | `cp /etc/ssh/sshd_config /mnt/backup-path/`                 |
| 8   | `~/.ssh/authorized_keys`               | SSH public keys  | `cp ~/.ssh/authorized_keys /mnt/backup-path/`               |
| 9   | `~/.zshrc` and `~/.p10k.zsh`           | Shell config     | `cp ~/.zshrc ~/.p10k.zsh /mnt/backup-path/`                 |
| 10  | `/etc/firewalld/zones/`                | Firewall rules   | `cp -r /etc/firewalld /mnt/backup-path/`                    |
| 11  | `~/.config/containers/containers.conf` | Container engine config | `cp ~/.config/containers/containers.conf /mnt/backup-path/` |

### 0.2 Recovery Overview (7 Phases)

```
Phase 0: Preparation   → Prepare backup files, ISO, network
Phase 1: System Install   → Fedora 44 Server installation (LVM + user config)
Phase 2: Basic Config   → DNF sources → Update → Packages → locale → SSH
Phase 3: Storage Recovery   → NTFS driver → fstab mount → LVM expand → SSD cache
Phase 4: Network Services   → Samba → SELinux → Firewall
Phase 5: Container Platform   → Podman → Linger → Proxy config
Phase 6: Container Deploy   → Start all containers in dependency order
Phase 7: Ops Go-live   → Script restore → Crontab → Full service verification
```

### 0.3 Pre-Recovery Checklist

- [ ] Backup files are complete and readable
- [ ] All hard drives are physically connected (4 HDDs + 2 NVMe)
- [ ] Network cable plugged in, router ready
- [ ] Fedora Server 44 ISO image prepared

---

### 0.4 Common Recovery Failure Handling

| Scenario                     | Possible Cause                       | Solution                                                                |
| ---------------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **Disk UUID mismatch**       | UUID changed after reinstall         | `sudo blkid` to get new UUID, update `/etc/fstab`                      |
| **SELinux blocks service**   | Security context not restored        | `sudo restorecon -Rv /mnt /etc`, or `sudo setenforce 0` temporarily     |
| **Container proxy down**     | LinuxServer not started or V2rayN config lost | Check `ss -tlnp \| grep 1145`, then check `~/Podman/LinuxServer/config/V2rayN/` |
| **Container permission error** | Mount volume SELinux label lost    | `sudo chcon -Rt container_file_t /mnt/*` to rebuild labels              |
| **Samba inaccessible**       | Samba password not set               | `sudo smbpasswd -a ywpc` to reset password                             |
| **Firewall rules lost**      | firewalld zones lost after systemd update | Restore from backup `/etc/firewalld/zones/`                           |
| **frp connection failed**    | Server token or IP changed           | Update `serverAddr` and `token` in `~/Podman/Frpc/config/frpc.toml`     |

---

- [[#Part 0: Disaster Recovery Quick Guide]]
- [[#Part 1: Basic System Installation and Network Optimization]]
- [[#Part 2: Storage Architecture and Shared Services (Samba / LVM / SSD Cache / HDD Spindown)]]
- [[#Part 3: Podman Container Engine and Proxy Configuration]]
- [[#Part 4: Application Service Containerization (Podman Compose Stacks)]]
- [[#Part 5: Automation Scripts and Daily Ops Tools]]
- [[#Part 6: Quick Commands]]
- [[#1.0 System Overview and Port Mapping Table]]
- [[#Appendix: Key File Path Index]]

---

## Part 1: Basic System Installation and Network Optimization

> **Recovery Phase: Phase 1 — System Installation**
> Goal: Install Fedora Server 44 from scratch, complete partitioning, user creation, and network configuration.

### 0.5 System Installation Steps

#### Step 1 — Download and Create Boot Media

- Download Fedora Server 44 ISO from **https://fedoraproject.org/server/**
- Write to USB drive using Rufus (Windows) or `dd` (Linux/Mac)

#### Step 2 — Install System

Boot from USB and enter the Fedora Server graphical installer (Anaconda):

| Step             | Operation                                    | Description                       |
| ---------------- | -------------------------------------------- | --------------------------------- |
| Language         | Default English                              | Can set Chinese later via `localectl` |
| Installation Destination | **Automatic LVM configuration**        | System will create LVM on nvme0n1 |
| Network & Hostname | Enable network, set hostname to `fedora-nas` | Bind MAC to fixed IP on router later |
| User Creation    | Create regular user `ywpc`, check "Make this user administrator" | Added to wheel group for sudo |
| Root Password    | **Must set**                                 | For system-level management       |

Final partition layout is auto-generated (using actual 119.2G NVMe as example):

```
nvme0n1 (119.2G)
├─ nvme0n1p1  600M  /boot/efi   vfat
├─ nvme0n1p2    2G  /boot       xfs
└─ nvme0n1p3  116.7G  LVM2 PV
   └─ fedora_nas-ywpc-root  116.7G  /  xfs
```

#### Step 3 — First-Time Post-Installation Setup

After installation is complete and rebooted, execute in the following order:

```bash
# 1. Check network connectivity
ip a
ping -c 4 fedoraproject.org

# 2. Test network speed (optional)
curl -sSL https://cdn.jsdelivr.net/gh/lework/script/shell/os_repo_speed_test.sh | bash

# 3. Switch DNF mirrors (TUNA)
sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak
sudo sed -e 's|^metalink=|#metalink=|g' \
         -e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \
         -i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

# 4. Configure DNF acceleration + proxy
sudo vi /etc/dnf/dnf.conf
# Refer to section 1.2 for config

# 5. Clear cache and full update
sudo dnf clean all
sudo dnf makecache
sudo dnf update -y

# 6. Reboot
sudo reboot
```

#### Step 4 — Create Data Disk Mount Points

```bash
sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii
```

See **Part 2: Storage Architecture** for detailed mount configuration.

---

### 1.0 System Overview

Actual machine configuration and basic information covered by this guide:

- **Operating System**: Fedora Linux 44 (Server Edition)
- **Kernel Version**: Linux kernel (depends on actual installed version)
- **Hostname**: fedora-nas
- **IP Address**: 192.168.86.221/24 (enp2s0)
- **Podman Bridge**: 10.89.0.1/24 (podman1)
- **Hardware Platform**: GREATWALL PC
- **Timezone**: Asia/Shanghai (CST, +0800)
- **NTP Sync**: Enabled, system clock synchronized

#### Port and Service Mapping Table

| Port  | Service           | Container/Process                    | Description                    |
| ----- | ----------------- | ------------------------------------ | ------------------------------ |
| 22    | SSH               | System native                        | Remote login (internal network) |
| 1145  | HTTP/SOCKS5 Proxy | LinuxServer → V2rayN (host mode)     | Proxy exit for all containers |
| 3000  | noVNC Web Desktop | LinuxServer (host mode)              | Alpine desktop remote management |
| 3306  | MySQL             | openlist_mysql                       | OpenList database              |
| 5244  | Web UI            | OpenList                             | File list system (Alist mod)  |
| 5899  | VNC Remote Desktop | baidunetdisk                        | Baidu Netdisk GUI              |
| 7474  | Web UI            | qBittorrent-EE                       | BT download management (enhanced) |
| 7700  | Meilisearch       | openlist_meilisearch                 | OpenList search engine         |
| 8080  | Web UI            | Open-WebUI                           | AI chat interface              |
| 8088  | Web UI            | Scrutiny                             | Hard drive health monitoring   |
| 8096  | Web UI            | Jellyfin                             | Media server                   |
| 8384  | Web UI            | Syncthing                            | File sync management interface |
| 8685  | Web UI            | vnstat-dashboard                     | Traffic statistics panel       |
| 9090  | Web UI            | Cockpit                              | System management panel (native) |
| 12345 | TCP               | bili-sync-rs                         | Bilibili UP主 video sync       |
| 14630 | TCP               | LinuxServer → Everything             | File indexing service          |

> **Frp Tunnel Mapping** (remote access): See 4.5 Frpc configuration. Remote port mapping: SSH→60022, others are mostly one-to-one.

---

### 1.1 System Upgrade and Mirror Configuration

Back up official mirrors and switch to your preferred domestic mirrors (e.g., TUNA):

```bash

# Back up official mirror config

sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak

  
# Replace with TUNA mirror URLs
sudo sed -e 's|^metalink=|#metalink=|g' \

-e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \

-i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

```

  

### 1.2 DNF Performance Optimization

Edit `/etc/dnf/dnf.conf` to enable multi-threaded downloads, fastest mirror selection, etc.:

```bash

sudo vi /etc/dnf/dnf.conf

```

#### Config file: `/etc/dnf/dnf.conf`

```ini
# see `man dnf.conf` for defaults and possible options
[main]
max_parallel_downloads=10
fastestmirror=True
proxy=http://127.0.0.1:1145
```

After configuration, refresh cache:

```bash

sudo dnf clean all

sudo dnf makecache

sudo dnf update -y

```

  

### 1.3 Zsh Terminal and Theme Setup

Install basic dependencies, fonts, and configure the terminal environment:

```bash

# Install basic dependencies

sudo dnf install zsh git curl util-linux eza fastfetch fzf -y

  

# Create and download required fonts (e.g., MesloLGS NF)

mkdir -p ~/.local/share/fonts/MesloLGS_NF

cd ~/.local/share/fonts/MesloLGS_NF

# [Manually download font files]
curl -fLo "MesloLGS NF Regular.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Regular.ttf"
curl -fLo "MesloLGS NF Bold.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold.ttf"
curl -fLo "MesloLGS NF Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Italic.ttf"
curl -fLo "MesloLGS NF Bold Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold%20Italic.ttf"
  

# Refresh font cache

fc-cache -fv

  

# Install Oh-My-Zsh & plugins

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# [Clone required zsh plugins, e.g., zsh-autosuggestions, zsh-syntax-highlighting, fzf-tab]


# Switch default shell

chsh -s $(which zsh)

```

Edit `~/.zshrc`:

```bash

vim ~/.zshrc

```

#### Config file: `~/.zshrc`

```bash

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
fastfetch
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi
# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH
# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"
# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="powerlevel10k/powerlevel10k"
# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )
# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"
# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"
# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time
# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13
# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"
# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"
# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"
# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"
# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"
# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"
# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"
# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder
# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
zstyle ':omz:plugins:eza' 'icons' yes
zstyle ':omz:plugins:eza' 'dirs-first' yes
zstyle ':omz:plugins:eza' 'git-status' yes
plugins=(git eza zsh-autosuggestions zsh-syntax-highlighting fzf-tab)
source $ZSH/oh-my-zsh.sh
# User configuration
# export MANPATH="/usr/local/man:$MANPATH"
# You may need to manually set your language environment
# export LANG=en_US.UTF-8
# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi
# Compilation flags
# export ARCHFLAGS="-arch $(uname -m)"
# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, while Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
alias proxy="export http_proxy=http://127.0.0.1:1145; export https_proxy=http://127.0.0.1:1145; export all_proxy=socks5://127.0.0.1:1145; echo -e '\e[32m[+] Terminal proxy enabled\e[0m'"
alias unproxy="unset http_proxy; unset https_proxy; unset all_proxy; echo -e '\e[31m[-] Terminal proxy disabled\e[0m'"
alias update="sudo dnf update"
alias sudo='sudo '
# Script aliases
alias par2go="/home/ywpc/Tools/par2go.sh"
alias rar-a="/home/ywpc/Tools/rar_background_archive.sh"
alias rar-u="/home/ywpc/Tools/rar_background_unpacker.sh"
alias vcm="/home/ywpc/Tools/vc_manager.sh"
alias wkupywpc="/home/ywpc/Tools/wakeup_pc.sh"
alias pcsu="/home/ywpc/Tools/pcs_upload.sh"
# Completion fixes
zstyle ':completion:*' completer _expand _complete _ignored _approximate
zstyle ':completion:*:expand:*' keep-prefix true
zstyle ':completion:*:expand:*' accept-exact-directories true
zstyle ':completion:*:expand:*' tag-order 'all-expansions'

```

#### 1.4 Packages
```bash
sudo dnf install -y fuse fuse-libs wget tar fastfetch make samba-client wakeonlan wol fzf p7zip p7zip-plugins ncdu vnstat cockpit-pcp pcp-zeroconf iperf3 
```
  

---

  

## Part 2: Storage Architecture and Shared Services (Samba / LVM / SSD Cache / HDD Spindown)

  

### 2.1 Root Partition LVM Online Expansion

```bash

# Expand logical volume

sudo lvextend -l +100%FREE /dev/mapper/fedora_nas--ywpc-root

  

# Online grow filesystem (XFS example)

sudo xfs_growfs /

```

  

### 2.2 Multi-Disk Mount and NVMe SSD Cache Initialization

Create mount points:

```bash

sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii

```

Format and initialize the SSD cache disk (e.g., `/dev/nvme1n1`):

```bash

sudo parted /dev/nvme1n1 mklabel gpt

sudo parted /dev/nvme1n1 mkpart primary ext4 0% 100%

sudo mkfs.ext4 /dev/nvme1n1p1

sudo chown -R ywpc:ywpc /mnt/SSD-Cache

```

Edit the system's permanent mount table `/etc/fstab`:

```bash

sudo vim /etc/fstab

```

#### Config file: `/etc/fstab`

```text
#
# /etc/fstab
# Created by anaconda on Fri Jun 19 06:48:01 2026
#
# Accessible filesystems, by reference, are maintained under '/dev/disk/'.
# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info.
#
# After editing this file, run 'systemctl daemon-reload' to update systemd
# units generated from this file.
#
UUID=c23cedbf-d4e2-4045-82fc-b507bb25f4f0 / xfs defaults 0 0
UUID=6e41d090-c62f-40f5-a21b-4fd58872b6e3 /boot xfs defaults 0 0
UUID=61EA-9AA6 /boot/efi vfat umask=0077,shortname=winnt 0 2
# HDD NTFS Disks for NAS
UUID=8A7A96047A95ED67  /mnt/New-1  ntfs  defaults,uid=1000,gid=1000,dmask=022,fmask=133,nls=utf8,nofail,context="system_u:object_r:container_file_t:s0"  0  0
UUID=0846868046866E6E  /mnt/Old-1  ntfs  defaults,uid=1000,gid=1000,dmask=022,fmask=133,nls=utf8,nofail,context="system_u:object_r:container_file_t:s0"  0  0
UUID=1A44E2C144E29F2F  /mnt/Old-2  ntfs  defaults,uid=1000,gid=1000,dmask=022,fmask=133,nls=utf8,nofail,context="system_u:object_r:container_file_t:s0"  0  0
UUID=48482B3E482B29E0  /mnt/New-2  ntfs  defaults,uid=1000,gid=1000,dmask=022,fmask=133,nls=utf8,nofail,context="system_u:object_r:container_file_t:s0"  0  0
# SSD Cache
UUID=2ff1a8ea-c5b1-4484-89b7-f2b741dcb1e1 /mnt/SSD-Cache ext4 defaults,noatime,nodiratime 0 2
# Other
```

Reload config and mount:

```bash

sudo systemctl daemon-reload

sudo mount -a

```

  

### 2.3 Samba LAN Share Service

Back up default config:

```bash

sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak

sudo vi /etc/samba/smb.conf

```

#### Config file: `/etc/samba/smb.conf`

```ini

# Run 'testparm' to verify the config is correct after
# you modified it.
#
# Note:
# SMB1 is disabled by default. This means clients without support for SMB2 or
# SMB3 are no longer able to connect to smbd (by default).
[global]
    workgroup = WORKGROUP
    security = user
    passdb backend = tdbsam
    printing = cups
    printcap name = cups
    load printers = no
    cups options = raw
[New-1]
    comment = New-1 NTFS Disk
    path = /mnt/New-1
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[New-2]
    comment = New-2 NTFS Disk
    path = /mnt/New-2
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[Old-1]
    comment = Old-1 NTFS Disk
    path = /mnt/Old-1
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[Old-2]
    comment = Old-2 NTFS Disk
    path = /mnt/Old-2
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[Temp]
    comment = Temp
    path = /mnt/Temp
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[Weii]
    comment = Weii VeraCrypt Disk
    path = /mnt/Weii
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[H]
    comment = H VeraCrypt Disk
    path = /mnt/H
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc
[SSD Cache]
    comment = SSD-Cache
    path = /mnt/SSD-Cache
    browseable = yes
    writable = yes
    guest ok = no
    valid users = ywpc
    force user = ywpc

```

Set password, security rules, and start services:

```bash

# Set Samba user password

sudo smbpasswd -a ywpc

  

# Allow Samba access to external volumes (SELinux rule)

sudo setsebool -P samba_export_all_rw 1

  

# Firewall allow (Samba basic rules)

sudo firewall-cmd --add-service=samba --permanent
sudo firewall-cmd --reload

# ⚠️ Full firewall rule restoration (recommend restoring zone files directly after reinstall)

# If /etc/firewalld/zones/ directory was backed up, restore directly:
# sudo cp -r /backup-path/FedServer.xml /etc/firewalld/zones/
# sudo firewall-cmd --reload

# Otherwise, add all services individually:
# sudo firewall-cmd --add-service={ssh,dhcpv6-client,cockpit,samba} --permanent
# sudo firewall-cmd --add-service={syncthing,syncthing-gui} --permanent
# sudo firewall-cmd --add-service={Jellyfin,scrutiny} --permanent
# sudo firewall-cmd --add-service={Open-WebUI,OpenList,bili-sync} --permanent
# sudo firewall-cmd --add-service={qBittorrent-Enhanced-Edition,qBittorrent-core} --permanent
# sudo firewall-cmd --add-service={peerbanhelper,baidunetdisk,115} --permanent
# sudo firewall-cmd --add-service={LinuxServer,Debian,vnstat,iperf3} --permanent
# sudo firewall-cmd --add-masquerade --permanent
# sudo firewall-cmd --reload

  

# Start and enable on boot

sudo systemctl enable --now smb nmb

```

  

### 2.4 Enterprise HDD Power Management and Spindown Control

Configure udev rules to adjust HDD power and spindown policies:

```bash

# Create and download openSeaChest firmware tools
mkdir -p ~/Software/openSeaChest && cd ~/Software/openSeaChest
# [Manually download and extract openSeaChest portable binary]

# View current EPC power state settings for target disk (e.g., /dev/sdb)
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings

# Disable EPC power-saving feature at firmware level
sudo ./openSeaChest_PowerControl -d /dev/sdb --EPCfeature disable

# Disable Idle_A / Idle_B idle suspend low-power modes
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_a disable
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_b disable

# Recheck to confirm all States are Disabled
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings

```


---

  

## Part 3: Podman Container Engine and Proxy Configuration

  

### 3.1 Container Persistence (Linger Mode)

Ensure rootless containers continue running after user logout:

```bash

sudo loginctl enable-linger ywpc

```

  

### 3.2 Container Engine Global Proxy Configuration

Edit Podman container config file to set proxy parameters for container pulls:

```bash
sudo tee /etc/systemd/system/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# Reload and restart service
sudo systemctl daemon-reload
sudo systemctl restart podman.service

```

```bash
tee ~/.config/systemd/user/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# Reload and restart user service
systemctl --user daemon-reload
systemctl --user restart podman.service
```

#### Config file: `/etc/containers/containers.conf`

```toml
[engine]
compose_warning_logs = false
[containers]
http_proxy = false
```
#### Config file: `~/.config/containers/containers.conf`
```toml
[engine]
compose_warning_logs = false
```

>Check root service config: `sudo systemctl show podman.service --property=Environment`
>Check rootless service config: `systemctl --user show podman.service --property=Environment`

---


## Part 4: Application Service Containerization (Podman Compose Stacks)

  

Container working root directory: `~/Podman`

  
```bash

mkdir -p ~/Podman/{115,baidunetdisk,Bili-Sync,Frpc,Jellyfin,LinuxServer,Openlist,OpenWebUI,PeerBanHelper,qBittorrent-Enhanced-Edition,scrutiny,Syncthing,vnstat-ui}

```

### 4.1 115

> **Status**: Config file exists but container is not running. Start with `podman compose -f ~/Podman/115/docker-compose.yml up -d` when needed.

#### Config file: `~/Podman/115/docker-compose.yml`
```yaml
services:
  115browser:
    image: docker.io/xiuxiu10201/115:latest
    container_name: 115
    restart: "no"
    network_mode: host
    environment:
      - PASSWORD=&NrQ8buRYhf^5#hTAqxe
      - DISPLAY_WIDTH=1280
      - DISPLAY_HEIGHT=720
      - TZ=Asia/Shanghai
      - HTTP_PROXY=http://127.0.0.1:1145
      - HTTPS_PROXY=http://127.0.0.1:1145
      - NO_PROXY=localhost,127.0.0.1,localaddress,.local
    volumes:
      - ./config:/etc/115:z
      - /mnt/Old-1:/mnt/Old-1
      - /mnt/Old-2:/mnt/Old-2
      - /mnt/New-1:/mnt/New-1
      - /mnt/New-2:/mnt/New-2
```

### 4.2 baidunetdisk

#### Config file: `~/Podman/baidunetdisk/docker-compose.yml`

```yaml
services:
  baidunetdisk:
    image: johngong/baidunetdisk:latest
    container_name: baidunetdisk
    restart: "no"
    environment:
      - TZ=Asia/Shanghai
      - DISPLAY_WIDTH=1280
      - DISPLAY_HEIGHT=720
      - USER_ID=0
      - GROUP_ID=0
    volumes:
      - ./config:/config:z
      - /mnt/New-1:/mnt/New-1
      - /mnt/New-2:/mnt/New-2
      - /mnt/Old-1:/mnt/Old-1
      - /mnt/Old-2:/mnt/Old-2
      - /mnt/SSD-Cache:/mnt/SSD-Cache:z
    ports:
      - 5899:5800
    shm_size: 1gb                           # Critical! Fixes login white screen
    cpus: 2
```
### 4.3 Bili-Sync

#### Config file: `~/Podman/Bili-Sync/docker-compose.yml`

```yaml
services:
  bili-sync-rs:
    image: amtoaer/bili-sync-rs:latest
    restart: unless-stopped
    network_mode: bridge
    tty: true
    hostname: bili-sync-rs
    container_name: bili-sync-rs
    security_opt:
      - label=disable
    ports:
      - 12345:12345
    volumes:
      - ./config:/app/.config/bili-sync:Z
      - ./metadata:/app/.config/bili-sync/upper_face:Z
      - /mnt/New-2/Video/Blibili/:/bili-sync
```

### 4.4 Frpc

#### Config file: `~/Podman/Frpc/docker-compose.yml`

```yaml
services:
  frpc:
    image: snowdreamtech/frpc:latest
    container_name: frpc
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./config/frpc.toml:/etc/frp/frpc.toml:ro,z

```

#### Config file: `~/Podman/Frpc/config/frpc.toml`

```yaml
serverAddr = "22.22.22.22"
serverPort = 7000
[auth]
method = "token"
token = "yourtoken"
[transport]
proxyURL = "socks5://127.0.0.1:1145"
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
[[proxies]]
name = "qbittorrent"
type = "tcp"
localIP = "127.0.0.1"
localPort = 7474
remotePort = 7474
[[proxies]]
name = "openlist"
type = "tcp"
localIP = "127.0.0.1"
localPort = 5244
remotePort = 5244
[[proxies]]
name = "bilisync"
type = "tcp"
localIP = "127.0.0.1"
localPort = 12345
remotePort = 12345
[[proxies]]
name = "peerbanhelper"
type = "tcp"
localIP = "127.0.0.1"
localPort = 9898
remotePort = 9898
[[proxies]]
name = "Open-webui"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8080
remotePort = 8080
transport.useCompression = true
[[proxies]]
name = "LinuxServer-Desktop"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3000
remotePort = 3000
[[proxies]]
name = "Cockpit"
type = "tcp"
localIP = "127.0.0.1"
localPort = 9090
remotePort = 9090
[[proxies]]
name = "Scrutiny"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8088
remotePort = 8088
[[proxies]]
name = "SSH"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 60022
[[proxies]]
name = "Panbaidu"
type = "tcp"
localIP = "127.0.0.1"
localPort = 5899
remotePort = 5899
```

### 4.5 Jellyfin

> **Status**: Running (Up 2 days). Intel integrated GPU passthrough (`/dev/dri`) configured for hardware transcoding, accessible via port 8096.

#### Config file: `~/Podman/Jellyfin/docker-compose.yml`

```yaml
services:
  jellyfin:
    image: docker.io/jellyfin/jellyfin:latest
    container_name: jellyfin
    group_add:
      - "keep-groups"
    devices:
      - /dev/dri:/dev/dri
    volumes:
      - ./config:/config:z
      - ./cache:/cache:z
      - /mnt/New-1:/media/New-1
      - /mnt/New-2:/media/New-2
      - /mnt/Old-1:/media/Old-1
      - /mnt/Old-2:/media/Old-2
    ports:
      - "8096:8096"
    restart: always
```

  

### 4.6 LinuxServer (Proxy Core Container — Must Start Before Other Containers)

> **⚠️ Critical Role**: This container runs **V2rayN (Xray core)** internally. All other containers' network proxies depend on this container.
> Currently using `network_mode: host`, V2rayN listens on port 1145 directly in the host network namespace.
> During system recovery, **this container must be started first and proxy availability confirmed** before starting other containers.

> Also runs **Everything Server** and other tools inside the container.

#### Config file: `~/Podman/LinuxServer/docker-compose.yml`

```yaml
services:
  LinuxServer:
    image: lscr.io/linuxserver/webtop:alpine-openbox
    container_name: LinuxServer
    network_mode: host
    dns:
      - 223.5.5.5
      - 8.8.8.8
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Shanghai
      - PASSWORD=34yRiK5jS^Kn46yC%&!S
      # Clear auto-injected proxy env vars (container runs its own proxy)
      - HTTP_PROXY=
      - HTTPS_PROXY=
      - ALL_PROXY=
      - http_proxy=
      - https_proxy=
      - all_proxy=
    volumes:
      - ./config:/config:z             # V2rayN config stored in ./config/V2rayN/
    shm_size: "256mb"
    restart: unless-stopped
```

#### Verify Proxy is Working

After container starts, verify proxy service on host:

```bash
# Confirm port 1145 is listening
ss -tlnp | grep 1145

# Test network connectivity through proxy
curl -x socks5://127.0.0.1:1145 https://www.google.com -o /dev/null -w "%{http_code}" -s
# Should return 200
```

> **Recovery Tip**: V2rayN config is at `~/Podman/LinuxServer/config/V2rayN/`. Restore V2rayN config from this directory during recovery.


### 4.8 Openlist

#### Config file: `~/Podman/Openlist/docker-compose.yml`

```yaml
services:  
  openlist:  
    image: openlistteam/openlist:latest  
    container_name: openlist
    user: '0:0'
    environment:  
      - UMASK=022  
      - TZ=Asia/Shanghai  
      - HTTP_PROXY=http://host.containers.internal:1145
      - HTTPS_PROXY=http://host.containers.internal:1145
      - http_proxy=http://host.containers.internal:1145
      - https_proxy=http://host.containers.internal:1145
      - NO_PROXY=localhost,127.0.0.1,mysql,meilisearch,host.containers.internal
    volumes:  
      - ./config:/opt/openlist/data:z
      - /mnt/Old-1:/mnt/Old-1:rslave
      - /mnt/Old-2:/mnt/Old-2:rslave
      - /mnt/New-1:/mnt/New-1:rslave
      - /mnt/New-2:/mnt/New-2:rslave
      - /mnt/H:/mnt/H:rslave
      - /mnt/Weii:/mnt/Weii:rslave
    ports:  
      - "5244:5244"  
    restart: unless-stopped
    depends_on:
      - mysql
      - meilisearch
  mysql:
    image: mysql:8.0
    container_name: openlist_mysql
    environment:
      - MYSQL_ROOT_PASSWORD=J&B8dwHZq1O
      - MYSQL_DATABASE=Openlist
      - TZ=Asia/Shanghai
    volumes:
      - ./mysql_data:/var/lib/mysql:z
    ports:
      - "3306:3306"
    restart: unless-stopped
    command: --default-authentication-plugin=mysql_native_password
  meilisearch:
    image: getmeili/meilisearch:latest
    container_name: openlist_meilisearch
    environment:
      - MEILI_ENV=development
      - MEILI_NO_ANALYTICS=true
    volumes:
      - ./meili_data:/meili_data:z
    ports:
      - "7700:7700"
    restart: unless-stopped

```

  
### 4.9 OpenWebUI

#### Config file: `~/Podman/OpenWebUI/docker-compose.yml`

```yaml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    network_mode: host
    environment:
      - TZ=Asia/Shanghai
      # 👈 Core: all HTTP/HTTPS requests inside container go through host's 1145 port (v2rayN HTTP proxy)
      - HTTP_PROXY=http://host.containers.internal:1145
      - HTTPS_PROXY=http://host.containers.internal:1145
      # 👈 Pitfall: local connections (e.g., local Ollama on same NAS) should not go through proxy
      - NO_PROXY=localhost,127.0.0.1,host.containers.internal
      - PORT=8080
      - HF_ENDPOINT=https://hf-mirror.com
      - WEBUI_SECRET_KEY=h8DVE80Cw5NNR22E
      - DISABLE_UPDATE_CHECK=true
      - AIOHTTP_CLIENT_TIMEOUT=120
    volumes:
      - ./config:/app/backend/data:z
    restart: unless-stopped
```

  

### 4.10 PeerBanHelper

#### Config file: `~/Podman/PeerBanHelper/docker-compose.yml`

```yaml
services:
  peerbanhelper:
    image: "docker.io/ghostchu/peerbanhelper:latest"
    restart: unless-stopped
    container_name: "peerbanhelper"
    volumes:
      - ./data:/app/data:Z
    network_mode: host
    stop_grace_period: 30s
```


### 4.11 qBittorrent-Enhanced-Edition

#### Config file: `~/Podman/qBittorrent-Enhanced-Edition/docker-compose.yml`

```yaml
services:
  qbittorrent-ee:
    image: superng6/qbittorrentee:latest
    container_name: qbittorrent-ee
    network_mode: "host"
    environment:
      - PUID=0
      - PGID=0
      - TZ=Asia/Shanghai
      - WEBUIPORT=7474
    volumes:
      - ./config:/config:z                 
      - ./vuetorrent:/vuetorrent:z
      - /mnt/Old-1:/mnt/Old-1                  
      - /mnt/Old-2:/mnt/Old-2
      - /mnt/New-1:/mnt/New-1
      - /mnt/New-2:/mnt/New-2
      - /mnt/SSD-Cache/Temp:/mnt/Temp:z                  
    restart: unless-stopped
```

### 4.12 scrutiny

#### Config file: `~/Podman/scrutiny/docker-compose.yml`

```yaml
services:
  scrutiny:
    container_name: scrutiny
    image: ghcr.io/analogj/scrutiny:master-omnibus
    cap_add:
      - SYS_RAWIO
      - SYS_ADMIN
    security_opt:
      - label:disable
    ports:
      - "8088:8080"
      - "8086:8086"
    volumes:
      - /run/udev:/run/udev:ro
      - /dev:/dev
      - ./config:/opt/scrutiny/config:z
      - ./influxdb:/opt/scrutiny/influxdb:z
    privileged: true
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
```

### 4.13 Syncthing

#### Config file: `~/Podman/Syncthing/docker-compose.yml`

```yaml
services:
  syncthing:
    image: lscr.io/linuxserver/syncthing:latest
    container_name: syncthing
    network_mode: "host"
    environment:
      - PUID=0
      - PGID=0
      - TZ=Asia/Shanghai
    volumes:
      - ./config:/config:z               # Config and database on local disk
      - /mnt/SSD-Cache/Syncthing:/mnt/Syncthing:z
    restart: unless-stopped
```

### 4.14 vnstat-ui

#### Config file: `~/Podman/vnstat-ui/docker-compose.yml`

```yaml
services:
  vnstat-dashboard:
    image: kshitizb/vnstat-dashboard:latest
    container_name: vnstat-dashboard
    restart: unless-stopped
    network_mode: host
    privileged: true
    environment:
      - PORT=8685
      - ALLOWED_PREFIXES=eth,enp,wlan,wlp,tailscale,docker,podman,veth
    volumes:
      - /var/lib/vnstat:/var/lib/vnstat:ro
    security_opt:
      - label=disable
```

---

  

## Part 5: Automation Scripts and Daily Ops Tools

  

All custom ops scripts are stored in `~/Tools`. After creating scripts, grant execute permissions with:

```bash

mkdir -p ~/Tools

chmod 700 ~/Tools/* 2>/dev/null || true

```

  

### 5.1 VeraCrypt Volume Mount Manager

#### Script file: `~/Tools/vc_manager.sh`


### 5.2 Everything EFU and Directory Tree Generator

#### Script file: `~/Scripts/generate_efu_and_tree.py`

> **Note**: This script is actually stored in `~/Scripts/` (not `~/Tools/`). The crontab correctly points to `/home/ywpc/Scripts/generate_efu_and_tree.py`.

### 5.3 Background RAR Automatic Packing Tool

#### Script file: `~/Tools/rar_background_archive.sh`

### 5.4 Background Automatic Unpacking Tool

#### Script file: `~/Tools/rar_background_unpacker.sh`

### 5.5 Wake-on-LAN Client Script

#### Script file: `~/Tools/wakeup_pc.sh`

### 5.6 Par2 Redundancy Repair Tool

#### Script file: `~/Tools/par2go.sh`

Automatically creates Par2 redundancy repair packages, supports setting redundancy percentage. Recover with `par2 repair` when files are damaged.

```bash
# Create redundancy repair package (10% redundancy)
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &
# Repair
nohup par2 repair file.par2 > file.log 2>&1 &
```

### 5.7 PCS (Private Cloud Sync) Upload Tool

#### Script file: `~/Tools/pcs_upload.sh`

Upload script to sync local directory to private cloud storage.

### 5.8 RAR Auto-Pack (Vn Variant)

#### Script file: `~/Tools/rar_background_archive_vn.sh`

A variant of `rar_background_archive.sh`, adapted for specific directory structures and naming conventions.

### 5.9 System Scheduled Tasks (Crontab)

Run `sudo crontab -e` and manually enter cron task configuration:

```bash

sudo crontab -e

```

#### Cron task config (root level, `sudo crontab -e`):

```text
30 04 * * * /usr/bin/python3 /home/ywpc/Scripts/generate_efu_and_tree.py > /var/log/daily_scan.log 2>&1
```

#### Cron task config (user level, `crontab -e`):

```text
0 */6 * * * /home/ywpc/Tools/check-fedora-kernel-ntfs.sh >/dev/null 2>&1
0 6 * * * find /home/ywpc/Podman/OpenWebUI/config/uploads -type f -mtime +60 -delete
```

Manually enable and restart cron service:

```bash

sudo systemctl restart crond

sudo systemctl status crond

```

## Part 6: Quick Commands

### 6.1 View Commands

```bash
# View remaining disk space on /mnt mounts
df -h | grep /mnt

# View cockpit panel logs
journalctl -u cockpit

# View running status of all containers
podman ps --all --format "table {{.Names}} {{.Status}}"
```

### 6.2 Service Management

```bash
# Reload firewall
sudo firewall-cmd --reload

# Restart SMB and NMB services
sudo systemctl restart smb nmb

# Restart container
podman restart container-name

# Restart entire container stack
podman compose -f ~/Podman/container-name/docker-compose.yml restart
```

### 6.3 Container Operations

```bash
# View container real-time logs
podman logs -f container-name

# Load offline image
podman load -i *.tar
```

### 6.4 File Operations

```bash
# Par2 create redundancy package (recommend using ~/Tools/par2go.sh)
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &

# Par2 repair
nohup par2 repair file.par2 > file.log 2>&1 &
```

---

## Appendix: Key File Path Index

| File Path                                                | Purpose                    | Category       |
| -------------------------------------------------------- | -------------------------- | -------------- |
| `/etc/fstab`                                             | Disk mount config          | System config  |
| `/etc/samba/smb.conf`                                    | Samba share config         | Samba          |
| `/etc/dnf/dnf.conf`                                      | DNF package manager optimization | System config |
| `/etc/selinux/config`                                    | SELinux mode (Enforcing)   | System config  |
| `/etc/firewalld/zones/FedServer.xml`                    | Firewall rules persistence | Network        |
| `/etc/systemd/system/podman.service.d/override.conf`     | Podman system-level proxy config | Container     |
| `~/.config/systemd/user/podman.service.d/override.conf` | Podman user-level proxy config | Container      |
| `~/.config/containers/containers.conf`                  | Podman container engine user config | Container     |
| `~/.zshrc`                                              | Zsh terminal config        | Shell          |
| `~/.p10k.zsh`                                           | Powerlevel10k theme config | Shell          |
| `~/.ssh/authorized_keys`                                | SSH public key auth        | SSH            |
| `~/Scripts/generate_efu_and_tree.py`                    | Daily file directory tree generation | Cron           |
| `~/Tools/rar_background_archive.sh`                     | RAR background auto-packing | Ops            |
| `~/Tools/rar_background_unpacker.sh`                    | RAR background auto-unpacking | Ops           |
| `~/Tools/par2go.sh`                                     | Par2 redundancy repair tool | Ops            |
| `~/Tools/vc_manager.sh`                                 | VeraCrypt volume mount manager | Storage       |
| `~/Tools/pcs_upload.sh`                                 | Private cloud sync upload  | Ops            |
| `~/Tools/wakeup_pc.sh`                                  | Wake-on-LAN client         | Network        |
| `~/Podman/*/docker-compose.yml`                         | Container orchestration files | Container     |
| `~/Podman/LinuxServer/config/V2rayN/`                   | V2rayN proxy config (incl. subscriptions) | Proxy         |
| `/etc/xray/`                                            | (Alternate) Xray native config | Proxy        |
| `/var/log/daily_scan.log`                               | Daily file scan log        | Log            |
| `~/.bash_history` / `~/.zsh_history`                    | Shell command history      | Shell          |

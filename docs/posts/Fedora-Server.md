---
blogPost: true
title: Fedora Server 系统安装与维护手册
date: 2026-07-10
author: 100pangci
tags: [技术, Linux, Fedora, NAS]
---

# Fedora Server 系统安装与维护手册


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

## 第零部分：灾难恢复快速指南

> **目标**：系统彻底崩溃后，按照本指南可从零开始完整重建 NAS 服务器。
> **前提**：请先阅读 0.1 节，确保备份了所有关键文件后再动手。

---

### 0.1 必须提前备份的关键文件清单

系统崩溃前请将以下文件备份到安全位置（U盘/其他电脑/云端）：

| #   | 文件路径                               | 作用           | 备份方法                                                 |
| --- | -------------------------------------- | -------------- | -------------------------------------------------------- |
| 1   | `/etc/fstab`                           | 磁盘挂载配置   | `cp /etc/fstab /mnt/备份路径/`                           |
| 2   | `/etc/samba/smb.conf`                  | Samba 共享配置 | `cp /etc/samba/smb.conf /mnt/备份路径/`                  |
| 3   | `/etc/dnf/dnf.conf`                    | DNF 加速配置   | `cp /etc/dnf/dnf.conf /mnt/备份路径/`                    |
| 4   | `~/Podman/*/docker-compose.yml`        | 所有容器配置   | `cp -r ~/Podman /mnt/备份路径/`                          |
| 5   | `~/Tools/*`                            | 运维脚本       | `cp -r ~/Tools /mnt/备份路径/`                           |
| 6   | `~/Scripts/*`                          | 定时任务脚本   | `cp -r ~/Scripts /mnt/备份路径/`                         |
| 7   | `/etc/ssh/sshd_config`                 | SSH 服务配置   | `cp /etc/ssh/sshd_config /mnt/备份路径/`                 |
| 8   | `~/.ssh/authorized_keys`               | SSH 公钥       | `cp ~/.ssh/authorized_keys /mnt/备份路径/`               |
| 9   | `~/.zshrc` 和 `~/.p10k.zsh`            | Shell 配置     | `cp ~/.zshrc ~/.p10k.zsh /mnt/备份路径/`                 |
| 10  | `/etc/firewalld/zones/`                | 防火墙规则     | `cp -r /etc/firewalld /mnt/备份路径/`                    |
| 11  | `~/.config/containers/containers.conf` | 容器引擎配置   | `cp ~/.config/containers/containers.conf /mnt/备份路径/` |

### 0.2 恢复概览（共 7 个阶段）

```
Phase 0: 准备阶段   → 准备好备份文件、ISO、网络
Phase 1: 系统安装   → Fedora 44 Server 安装（LVM + 用户配置）
Phase 2: 基础配置   → DNF 源 → 升级 → 软件包 → locale → SSH
Phase 3: 存储恢复   → NTFS 驱动 → fstab 挂载 → LVM扩容 → SSD缓存
Phase 4: 网络服务   → Samba → SELinux → 防火墙
Phase 5: 容器平台   → Podman → Linger → 代理配置
Phase 6: 容器部署   → 按依赖顺序启动所有容器
Phase 7: 运维上线   → 脚本恢复 → Crontab → 全服务验证
```

### 0.3 恢复前先检查

- [ ] 备份文件完整可读
- [ ] 所有硬盘物理连接正常（4 块 HDD + 2 块 NVMe）
- [ ] 网线已插入，路由器已就绪
- [ ] 已准备好 Fedora Server 44 ISO 镜像

---

### 0.4 常见恢复失败处理

| 场景                     | 可能原因                             | 解决方法                                                                     |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| **磁盘 UUID 不匹配**     | 新安装后磁盘 UUID 变了               | `sudo blkid` 获取新 UUID，更新 `/etc/fstab`                                  |
| **SELinux 阻止服务启动** | 安全上下文未正确恢复                 | `sudo restorecon -Rv /mnt /etc`，或 `sudo setenforce 0` 临时关闭后重新加载   |
| **容器代理不通**         | LinuxServer 未启动或 V2rayN 配置丢失 | 先确认 `ss -tlnp \| grep 1145`，再检查 `~/Podman/LinuxServer/config/V2rayN/` |
| **容器启动报权限错误**   | 挂载卷的 SELinux 标签丢了            | `sudo chcon -Rt container_file_t /mnt/*` 重建标签                            |
| **Samba 无法访问**       | Samba 密码未设置                     | `sudo smbpasswd -a ywpc` 重设密码                                            |
| **防火墙规则重置**       | systemd 更新后 firewalld 区域丢失    | 用备份的 `/etc/firewalld/zones/` 恢复                                        |
| **frp 连不上**           | 服务器端 token 或 IP 变更            | 更新 `~/Podman/Frpc/config/frpc.toml` 中的 `serverAddr` 和 `token`           |

---



- [[#第零部分：灾难恢复快速指南]]
- [[#第一部分：基础系统安装与网络优化]]
- [[#第二部分：存储架构与共享服务（Samba / LVM / SSD缓存 / 硬盘休眠）]]
- [[#第三部分：Podman 容器引擎与代理配置]]
- [[#第四部分：应用服务容器化部署（Podman Compose 堆栈）]]
- [[#第五部分：自动化脚本与日常运维工具]]
- [[#第六部分：快捷命令]]
- [[#1.0 系统概况及端口映射表]]
- [[#附录：关键文件路径索引]]

---



## 第一部分：基础系统安装与网络优化

> **恢复阶段：Phase 1 — 系统安装**
> 目标：从零安装 Fedora Server 44，完成基本分区、用户创建和网络配置。

### 0.5 系统安装步骤

#### Step 1 — 下载与制作启动盘

- 从 **https://fedoraproject.org/server/** 下载 Fedora Server 44 ISO
- 用 Rufus（Windows）或 `dd`（Linux/Mac）写入 U 盘

#### Step 2 — 安装系统

启动 U 盘，进入 Fedora Server 图形安装器（Anaconda）：

| 步骤         | 操作                                          | 说明                            |
| ------------ | --------------------------------------------- | ------------------------------- |
| 语言         | 默认英文                                      | 后续可通过 `localectl` 设置中文 |
| 安装目的地   | **自动配置 LVM**                              | 系统会自动在 nvme0n1 上创建 LVM |
| 网络与主机名 | 启用网卡，主机名设为 `fedora-nas`             | 后续在路由器绑定 MAC 固定 IP    |
| 用户创建     | 创建普通用户 `ywpc`，勾选"将此用户设为管理员" | 即加入 wheel 组，后续 sudo 授权 |
| Root 密码    | **必须设置**                                  | 用于系统级管理操作              |

最终分区布局自动生成如下（以实际 119.2G NVMe 为例）：

```
nvme0n1 (119.2G)
├─ nvme0n1p1  600M  /boot/efi   vfat
├─ nvme0n1p2    2G  /boot       xfs
└─ nvme0n1p3  116.7G  LVM2 PV
   └─ fedora_nas-ywpc-root  116.7G  /  xfs
```

#### Step 3 — 安装后首次配置

安装完成重启后，按以下顺序执行：

```bash
# 1. 检查网络连通性
ip a
ping -c 4 fedoraproject.org

# 2. 测试网络速度（可选）
curl -sSL https://cdn.jsdelivr.net/gh/lework/script/shell/os_repo_speed_test.sh | bash

# 3. DNF 换源（清华 TUNA）
sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak
sudo sed -e 's|^metalink=|#metalink=|g' \
         -e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \
         -i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

# 4. 配置 DNF 加速 + 代理
sudo vi /etc/dnf/dnf.conf
# 参考 1.2 节配置内容

# 5. 刷新缓存并全量更新
sudo dnf clean all
sudo dnf makecache
sudo dnf update -y

# 6. 重启
sudo reboot
```

#### Step 4 — 创建数据盘挂载点

```bash
sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii
```

详细挂载配置见 **第二部分：存储架构**。

---

### 1.0 系统概况

本手册对应机器的实际配置与基本信息：

- **操作系统**：Fedora Linux 44 (Server Edition)
- **内核版本**：Linux 内核（当前安装版本以系统实际为准）
- **主机名**：fedora-nas（Fedora-NAS）
- **IP 地址**：192.168.86.221/24（enp2s0）
- **Podman 网桥**：10.89.0.1/24（podman1）
- **硬件平台**：GREATWALL PC（长城台式机）
- **时区**：Asia/Shanghai (CST, +0800)
- **NTP 同步**：已开启，系统时钟已同步

#### 端口与服务映射表

| 端口  | 服务             | 所属容器/进程                     | 说明                       |
| ----- | ---------------- | --------------------------------- | -------------------------- |
| 22    | SSH              | 系统原生                          | 远程登录（内网）           |
| 1145  | HTTP/SOCKS5 代理 | LinuxServer → V2rayN（host 模式） | 所有容器的代理出口         |
| 3000  | noVNC 网页桌面   | LinuxServer（host 模式）          | Alpine 桌面远程管理        |
| 3306  | MySQL            | openlist_mysql                    | OpenList 数据库            |
| 5244  | Web UI           | OpenList                          | 文件列表系统（Alist 魔改） |
| 5899  | VNC 远程桌面     | baidunetdisk                      | 百度网盘 GUI               |
| 7474  | Web UI           | qBittorrent-EE                    | BT 下载管理（增强版）      |
| 7700  | Meilisearch      | openlist_meilisearch              | OpenList 搜索引擎          |
| 8080  | Web UI           | Open-WebUI                        | AI 对话界面                |
| 8088  | Web UI           | Scrutiny                          | 硬盘健康监控               |
| 8096  | Web UI           | Jellyfin                          | 媒体服务器                 |
| 8384  | Web UI           | Syncthing                         | 文件同步管理界面           |
| 8685  | Web UI           | vnstat-dashboard                  | 流量统计面板               |
| 9090  | Web UI           | Cockpit                           | 系统管理面板（原生）       |
| 12345 | TCP              | bili-sync-rs                      | B站 UP 主视频同步          |
| 14630 | TCP              | LinuxServer → Everything          | 文件索引服务               |

> **Frp 穿透映射**（远程访问）：见 4.5 Frpc 配置。远程端口对应关系：SSH→60022，其他基本一一映射。

---

### 1.1 系统升级与国内源配置

备份官方源并替换为您偏好的国内镜像源（如清华 TUNA 镜像源）：

```bash

# 备份官方源配置

sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak

  
# 替换为清华镜像源地址
sudo sed -e 's|^metalink=|#metalink=|g' \

-e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \

-i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

```

  

### 1.2 DNF 性能优化配置

编辑 `/etc/dnf/dnf.conf` 以开启多线程下载、最快镜像选择等：

```bash

sudo vi /etc/dnf/dnf.conf

```

#### 配置文件：`/etc/dnf/dnf.conf`

```ini
# see `man dnf.conf` for defaults and possible options
[main]
max_parallel_downloads=10
fastestmirror=True
proxy=http://127.0.0.1:1145
```

配置完成后刷新缓存：

```bash

sudo dnf clean all

sudo dnf makecache

sudo dnf update -y

```

  

### 1.3 Zsh 终端与美化配置

安装基础依赖、字体并配置终端环境：

```bash

# 安装基础依赖

sudo dnf install zsh git curl util-linux eza fastfetch fzf -y

  

# 创建并下载您需要的字体（例如 MesloLGS NF）

mkdir -p ~/.local/share/fonts/MesloLGS_NF

cd ~/.local/share/fonts/MesloLGS_NF

# [手动下载您的字体文件]
curl -fLo "MesloLGS NF Regular.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Regular.ttf"
curl -fLo "MesloLGS NF Bold.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold.ttf"
curl -fLo "MesloLGS NF Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Italic.ttf"
curl -fLo "MesloLGS NF Bold Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold%20Italic.ttf"
  

# 刷新字体缓存

fc-cache -fv

  

# 安装 Oh-My-Zsh & 插件

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# [克隆您需要的 zsh 插件，如 zsh-autosuggestions、zsh-syntax-highlighting、fzf-tab]


# 切换默认 Shell

chsh -s $(which zsh)

```

编辑 `~/.zshrc`：

```bash

vim ~/.zshrc

```

#### 配置文件：`~/.zshrc`

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
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
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
alias proxy="export http_proxy=http://127.0.0.1:1145; export https_proxy=http://127.0.0.1:1145; export all_proxy=socks5://127.0.0.1:1145; echo -e '\e[32m[+] 终端代理已开启\e[0m'"
alias unproxy="unset http_proxy; unset https_proxy; unset all_proxy; echo -e '\e[31m[-] 终端代理已关闭\e[0m'"
alias update="sudo dnf update"
alias sudo='sudo '
# 脚本快捷别名
alias par2go="/home/ywpc/Tools/par2go.sh"
alias rar-a="/home/ywpc/Tools/rar_background_archive.sh"
alias rar-u="/home/ywpc/Tools/rar_background_unpacker.sh"
alias vcm="/home/ywpc/Tools/vc_manager.sh"
alias wkupywpc="/home/ywpc/Tools/wakeup_pc.sh"
alias pcsu="/home/ywpc/Tools/pcs_upload.sh"
# 补全修复
zstyle ':completion:*' completer _expand _complete _ignored _approximate
zstyle ':completion:*:expand:*' keep-prefix true
zstyle ':completion:*:expand:*' accept-exact-directories true
zstyle ':completion:*:expand:*' tag-order 'all-expansions'

```

#### 1.4 软件包
```bash
sudo dnf install -y fuse fuse-libs wget tar fastfetch make samba-client wakeonlan wol fzf p7zip p7zip-plugins ncdu vnstat cockpit-pcp pcp-zeroconf iperf3 
```
  

---

  

## 第二部分：存储架构与共享服务（Samba / LVM / SSD缓存 / 硬盘休眠）

  

### 2.1 根分区 LVM 在线扩容

```bash

# 扩容逻辑卷

sudo lvextend -l +100%FREE /dev/mapper/fedora_nas--ywpc-root

  

# 在线拉伸文件系统（以 XFS 为例）

sudo xfs_growfs /

```

  

### 2.2 多盘挂载与 NVMe SSD 缓存初始化

创建挂载点：

```bash

sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii

```

格式化并初始化您的 SSD 缓存盘（例如 `/dev/nvme1n1`）：

```bash

sudo parted /dev/nvme1n1 mklabel gpt

sudo parted /dev/nvme1n1 mkpart primary ext4 0% 100%

sudo mkfs.ext4 /dev/nvme1n1p1

sudo chown -R ywpc:ywpc /mnt/SSD-Cache

```

编辑系统的永久挂载表 `/etc/fstab`：

```bash

sudo vim /etc/fstab

```

#### 配置文件：`/etc/fstab`

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

重新加载配置并挂载：

```bash

sudo systemctl daemon-reload

sudo mount -a

```

  

### 2.3 Samba 局域网共享服务

备份默认配置：

```bash

sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak

sudo vi /etc/samba/smb.conf

```

#### 配置文件：`/etc/samba/smb.conf`

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

设置密码、安全规则并启动服务：

```bash

# 设置 Samba 用户密码

sudo smbpasswd -a ywpc

  

# 允许 Samba 访问外部挂载卷（SELinux 规则）

sudo setsebool -P samba_export_all_rw 1

  

# 防火墙放行（Samba 基础规则）

sudo firewall-cmd --add-service=samba --permanent
sudo firewall-cmd --reload

# ⚠️ 完整防火墙规则恢复（系统重装后建议直接还原 zone 文件）

# 如果备份了 /etc/firewalld/zones/ 目录，直接还原：
# sudo cp -r /备份路径/FedoraServer.xml /etc/firewalld/zones/
# sudo firewall-cmd --reload

# 否则需逐一添加所有服务：
# sudo firewall-cmd --add-service={ssh,dhcpv6-client,cockpit,samba} --permanent
# sudo firewall-cmd --add-service={syncthing,syncthing-gui} --permanent
# sudo firewall-cmd --add-service={Jellyfin,scrutiny} --permanent
# sudo firewall-cmd --add-service={Open-WebUI,OpenList,bili-sync} --permanent
# sudo firewall-cmd --add-service={qBittorrent-Enhanced-Edition,qBittorrent-core} --permanent
# sudo firewall-cmd --add-service={peerbanhelper,baidunetdisk,115} --permanent
# sudo firewall-cmd --add-service={LinuxServer,Debian,vnstat,iperf3} --permanent
# sudo firewall-cmd --add-masquerade --permanent
# sudo firewall-cmd --reload

  

# 启动并开机自启

sudo systemctl enable --now smb nmb

```

  

### 2.4 企业级硬盘能耗与休眠控制

配置 udev 规则来调整机械硬盘的能耗和休眠策略：

```bash

# 创建并下载 openSeaChest 固件工具  
mkdir -p ~/Software/openSeaChest && cd ~/Software/openSeaChest  
# [手动下载并解压 openSeaChest 绿色便携版二进制文件]  
  
# 查看目标硬盘（如 /dev/sdb）当前的 EPC（Power Choice）电源状态设置  
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings  
  
# 固件级禁用该硬盘的 EPC 节电特性（使其不再因系统空闲而强制降速或停转）  
sudo ./openSeaChest_PowerControl -d /dev/sdb --EPCfeature disable  
  
# 固件级禁用 Idle_A / Idle_B 等空闲挂起低功耗模式  
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_a disable  
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_b disable  
  
# 再次核对，确认各项 State 均已显示为 Disabled  
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings

```


---

  

## 第三部分：Podman 容器引擎与代理配置

  

### 3.1 容器免登录常驻（Linger 模式）

确保 Rootless 容器在用户退出登录后继续保持运行：

```bash

sudo loginctl enable-linger ywpc

```

  

### 3.2 容器引擎全局代理配置

编辑 Podman 容器配置文件，配置容器拉取的代理参数：

```bash
sudo tee /etc/systemd/system/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# 重新加载并重启服务
sudo systemctl daemon-reload
sudo systemctl restart podman.service

```

```bash
tee ~/.config/systemd/user/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# 重新加载并重启用户服务
systemctl --user daemon-reload
systemctl --user restart podman.service
```

#### 配置文件：`/etc/containers/containers.conf`

```toml
[engine]
compose_warning_logs = false
[containers]
http_proxy = false
```
#### 配置文件：`~/.config/containers/containers.conf`
```toml
[engine]
compose_warning_logs = false
```

>检查Root 服务配置是否已变为 1145：`sudo systemctl show podman.service --property=Environment`
>检查 Rootless 服务配置是否已变为 1145：`systemctl --user show podman.service --property=Environment`

---


## 第四部分：应用服务容器化部署（Podman Compose 堆栈）

  

容器工作根目录：`~/Podman`

  
```bash

mkdir -p ~/Podman/{115,baidunetdisk,Bili-Sync,Frpc,Jellyfin,LinuxServer,Openlist,OpenWebUI,PeerBanHelper,qBittorrent-Enhanced-Edition,scrutiny,Syncthing,vnstat-ui}

```

### 4.1 115

> **现状**：配置文件已存在，但容器当前未运行。需要时执行 `podman compose -f ~/Podman/115/docker-compose.yml up -d` 启动。

#### 配置文件：`~/Podman/115/docker-compose.yml`
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

#### 配置文件：`~/Podman/baidunetdisk/docker-compose.yml`

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
    shm_size: 1gb                           # 关键！解决登录白屏
    cpus: 2
```
### 4.3 Bili-Sync

#### 配置文件：`~/Podman/Bili-Sync/docker-compose.yml`

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
      - /mnt/New-2/Video/Blibili爬取:/bili-sync
```

### 4.4 Frpc

#### 配置文件：`~/Podman/Frpc/docker-compose.yml`

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

#### 配置文件：`~/Podman/Frpc/config/frpc.toml`

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

> **现状**：已在运行中（Up 2 days）。已配置 Intel 核显直通（`/dev/dri`）实现硬件转码，通过端口 8096 访问。

#### 配置文件：`~/Podman/Jellyfin/docker-compose.yml`

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

  

### 4.6 LinuxServer（代理核心容器 — 必须先于其他容器启动）

> **⚠️ 关键角色**：此容器内部运行着 **V2rayN（Xray 核心）**，所有其他容器的网络代理全部依赖此容器。
> 当前使用 `network_mode: host`（宿主机网络），V2rayN 直接在宿主机网络命名空间内监听 1145 端口。
> 系统恢复时，**必须先启动此容器并确认代理生效后**，才能启动其他容器。

> 同时容器内还运行有 **Everything Server** 等工具。

#### 配置文件：`~/Podman/LinuxServer/docker-compose.yml`

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
      # 清除自动注入的代理环境变量（容器自身跑代理，不需要走代理）
      - HTTP_PROXY=
      - HTTPS_PROXY=
      - ALL_PROXY=
      - http_proxy=
      - https_proxy=
      - all_proxy=
    volumes:
      - ./config:/config:z             # V2rayN 配置存储在 ./config/V2rayN/
    shm_size: "256mb"
    restart: unless-stopped
```

#### 验证代理生效

容器启动后，在宿主机验证代理服务正常：

```bash
# 确认 1145 端口在监听
ss -tlnp | grep 1145

# 通过代理测试网络连通性
curl -x socks5://127.0.0.1:1145 https://www.google.com -o /dev/null -w "%{http_code}" -s
# 应返回 200
```

> **恢复提示**：V2rayN 配置位于 `~/Podman/LinuxServer/config/V2rayN/`，恢复时从此目录还原 V2rayN 配置。


### 4.8 Openlist

#### 配置文件：`~/Podman/Openlist/docker-compose.yml`

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

#### 配置文件：`~/Podman/OpenWebUI/docker-compose.yml`

```yaml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    network_mode: host
    environment:
      - TZ=Asia/Shanghai
      # 👈 核心：让容器内的所有 HTTP/HTTPS 请求全部走宿主机的 1146 端口（也就是 v2rayN 的 HTTP 代理）
      - HTTP_PROXY=http://host.containers.internal:1145
      - HTTPS_PROXY=http://host.containers.internal:1145
      # 👈 避坑：本地连接（比如连接同台 NAS 上的 local Ollama）不要走代理
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

#### 配置文件：`~/Podman/PeerBanHelper/docker-compose.yml`

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

#### 配置文件：`~/Podman/qBittorrent-Enhanced-Edition/docker-compose.yml`

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

#### 配置文件：`~/Podman/scrutiny/docker-compose.yml`

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

#### 配置文件：`~/Podman/Syncthing/docker-compose.yml`

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
      - ./config:/config:z               # 配置和数据库放本地硬盘
      - /mnt/SSD-Cache/Syncthing:/mnt/Syncthing:z
    restart: unless-stopped
```

### 4.14 vnstat-ui

#### 配置文件：`~/Podman/vnstat-ui/docker-compose.yml`

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

  

## 第五部分：自动化脚本与日常运维工具

  

所有的自定义运维脚本保存在 `~/Tools`。编写完脚本后，请执行以下命令赋予执行权限：

```bash

mkdir -p ~/Tools

chmod 700 ~/Tools/* 2>/dev/null || true

```

  

### 5.1 VeraCrypt 加密卷挂载管理器

#### 脚本文件：`~/Tools/vc_manager.sh`


### 5.2 Everything EFU 与目录树生成器

#### 脚本文件：`~/Scripts/generate_efu_and_tree.py`

> **说明**：该脚本实际保存在 `~/Scripts/` 目录下（非 `~/Tools/`），crontab 中已正确指向 `/home/ywpc/Scripts/generate_efu_and_tree.py`。



### 5.3 后台 RAR 自动打包压缩工具

#### 脚本文件：`~/Tools/rar_background_archive.sh`



### 5.4 后台自动解压工具

#### 脚本文件：`~/Tools/rar_background_unpacker.sh`



### 5.5 网络唤醒客户端脚本

#### 脚本文件：`~/Tools/wakeup_pc.sh`

### 5.6 Par2 冗余修复工具

#### 脚本文件：`~/Tools/par2go.sh`

自动创建 Par2 冗余修复包，支持按百分比设置冗余比例，在文件损坏时通过 `par2 repair` 恢复。

```bash
# 创建冗余修复包（10% 冗余）
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &
# 修复
nohup par2 repair file.par2 > file.log 2>&1 &
```

### 5.7 PCS（私有云同步）上传工具

#### 脚本文件：`~/Tools/pcs_upload.sh`

将本地目录同步至私有云存储的上传脚本。

### 5.8 RAR 自动打包（Vn 变体）

#### 脚本文件：`~/Tools/rar_background_archive_vn.sh`

`rar_background_archive.sh` 的变体版本，适配特定的目录结构和命名规则。

### 5.9 系统定时计划任务 (Crontab)

执行 `sudo crontab -e` 并手动录入定时任务配置：

```bash

sudo crontab -e

```

#### 定时任务配置内容（root 级，`sudo crontab -e`）：

```text
30 04 * * * /usr/bin/python3 /home/ywpc/Scripts/generate_efu_and_tree.py > /var/log/daily_scan.log 2>&1
```

#### 定时任务配置内容（用户级，`crontab -e`）：

```text
0 */6 * * * /home/ywpc/Tools/check-fedora-kernel-ntfs.sh >/dev/null 2>&1
0 6 * * * find /home/ywpc/Podman/OpenWebUI/config/uploads -type f -mtime +60 -delete
```

手动使能并重启 cron 调度服务：

```bash

sudo systemctl restart crond

sudo systemctl status crond

```

## 第六部分：快捷命令

### 6.1 查看类

```bash
# 查看挂载到 /mnt 的磁盘剩余空间
df -h | grep /mnt

# 查看 cockpit 面板日志
journalctl -u cockpit

# 查看所有容器运行状态
podman ps --all --format "table {{.Names}} {{.Status}}"
```

### 6.2 服务管理

```bash
# 重载防火墙
sudo firewall-cmd --reload

# 重载 SMB 和 NMB 服务
sudo systemctl restart smb nmb

# 重启容器
podman restart 容器名

# 重启整个容器堆栈
podman compose -f ~/Podman/某个容器/docker-compose.yml restart
```

### 6.3 容器操作

```bash
# 查看容器实时日志
podman logs -f 容器名

# 加载离线镜像包
podman load -i *.tar
```

### 6.4 文件操作

```bash
# Par2 创建冗余修复包（推荐用 ~/Tools/par2go.sh）
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &

# Par2 修复
nohup par2 repair file.par2 > file.log 2>&1 &
```

---

## 附录：关键文件路径索引

| 文件路径                                                | 用途                       | 所属     |
| ------------------------------------------------------- | -------------------------- | -------- |
| `/etc/fstab`                                            | 磁盘挂载配置               | 系统配置 |
| `/etc/samba/smb.conf`                                   | Samba 共享配置             | Samba    |
| `/etc/dnf/dnf.conf`                                     | DNF 包管理器优化           | 系统配置 |
| `/etc/selinux/config`                                   | SELinux 模式（Enforcing）  | 系统配置 |
| `/etc/firewalld/zones/FedServer.xml`                    | 防火墙规则持久化           | 网络     |
| `/etc/systemd/system/podman.service.d/override.conf`    | Podman 系统级代理配置      | 容器     |
| `~/.config/systemd/user/podman.service.d/override.conf` | Podman 用户级代理配置      | 容器     |
| `~/.config/containers/containers.conf`                  | Podman 容器引擎用户配置    | 容器     |
| `~/.zshrc`                                              | Zsh 终端配置               | Shell    |
| `~/.p10k.zsh`                                           | Powerlevel10k 主题配置     | Shell    |
| `~/.ssh/authorized_keys`                                | SSH 公钥认证               | SSH      |
| `~/Scripts/generate_efu_and_tree.py`                    | 每日文件目录树生成         | Cron     |
| `~/Tools/rar_background_archive.sh`                     | RAR 后台自动打包           | 运维     |
| `~/Tools/rar_background_unpacker.sh`                    | RAR 后台自动解压           | 运维     |
| `~/Tools/par2go.sh`                                     | Par2 冗余修复包工具        | 运维     |
| `~/Tools/vc_manager.sh`                                 | VeraCrypt 加密卷挂载管理器 | 存储     |
| `~/Tools/pcs_upload.sh`                                 | 私有云同步上传             | 运维     |
| `~/Tools/wakeup_pc.sh`                                  | 网络唤醒客户端             | 网络     |
| `~/Podman/*/docker-compose.yml`                         | 各容器编排文件             | 容器     |
| `~/Podman/LinuxServer/config/V2rayN/`                   | V2rayN 代理配置（含订阅）  | 代理     |
| `/etc/xray/`                                            | （备用）Xray 原生配置      | 代理     |
| `/var/log/daily_scan.log`                               | 每日文件扫描日志           | 日志     |
| `~/.bash_history` / `~/.zsh_history`                    | Shell 历史命令             | Shell    |
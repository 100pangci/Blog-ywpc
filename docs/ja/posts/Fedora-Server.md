---
blogPost: true
title: Fedora Server システムインストールとメンテナンスガイド
description: コンテナ化！すべてコンテナ化！
date: 2026-07-10
author: 100pangci
tags: [技術, Linux, Fedora, NAS]
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

## 第0部：災害復旧クイックガイド

> **目標**：システム完全破壊後、このガイドに従って NAS サーバーをゼロから再構築します。
> **前提**：セクション0.1を読んで、すべての重要なファイルをバックアップしてから作業を開始してください。

---

### 0.1 事前にバックアップすべき重要なファイル一覧

システムクラッシュ前に、以下のファイルを安全な場所（USBメモリ／別のPC／クラウド）にバックアップしてください：

| #   | ファイルパス                            | 役割          | バックアップ方法                                              |
| --- | --------------------------------------- | ------------- | ------------------------------------------------------------- |
| 1   | `/etc/fstab`                            | ディスクマウント設定 | `cp /etc/fstab /mnt/バックアップ先/`                   |
| 2   | `/etc/samba/smb.conf`                   | Samba 共有設定 | `cp /etc/samba/smb.conf /mnt/バックアップ先/`              |
| 3   | `/etc/dnf/dnf.conf`                     | DNF 高速化設定 | `cp /etc/dnf/dnf.conf /mnt/バックアップ先/`                |
| 4   | `~/Podman/*/docker-compose.yml`         | 全コンテナ設定  | `cp -r ~/Podman /mnt/バックアップ先/`                    |
| 5   | `~/Tools/*`                             | 運用スクリプト  | `cp -r ~/Tools /mnt/バックアップ先/`                       |
| 6   | `~/Scripts/*`                           | 定期タスクスクリプト | `cp -r ~/Scripts /mnt/バックアップ先/`                   |
| 7   | `/etc/ssh/sshd_config`                  | SSH 設定       | `cp /etc/ssh/sshd_config /mnt/バックアップ先/`             |
| 8   | `~/.ssh/authorized_keys`                | SSH 公開鍵     | `cp ~/.ssh/authorized_keys /mnt/バックアップ先/`             |
| 9   | `~/.zshrc` と `~/.p10k.zsh`             | Shell 設定     | `cp ~/.zshrc ~/.p10k.zsh /mnt/バックアップ先/`             |
| 10  | `/etc/firewalld/zones/`                 | ファイアウォールルール | `cp -r /etc/firewalld /mnt/バックアップ先/`            |
| 11  | `~/.config/containers/containers.conf`  | コンテナエンジン設定 | `cp ~/.config/containers/containers.conf /mnt/バックアップ先/` |

### 0.2 復旧概要（全7フェーズ）

```
Phase 0: 準備フェーズ   → バックアップファイル、ISO、ネットワークを準備
Phase 1: システムインストール → Fedora 44 Server インストール（LVM + ユーザー設定）
Phase 2: 基本設定   → DNF ソース → アップグレード → パッケージ → locale → SSH
Phase 3: ストレージ復旧   → NTFS ドライバ → fstab マウント → LVM 拡張 → SSD キャッシュ
Phase 4: ネットワークサービス   → Samba → SELinux → ファイアウォール
Phase 5: コンテナプラットフォーム   → Podman → Linger → プロキシ設定
Phase 6: コンテナデプロイ   → 依存順に全コンテナを起動
Phase 7: 運用移行   → スクリプト復旧 → Crontab → 全サービス検証
```

### 0.3 復旧前の確認事項

- [ ] バックアップファイルが完全に読み取り可能
- [ ] 全ハードディスクが物理的に接続されている（4台 HDD + 2台 NVMe）
- [ ] ネットワークケーブルが接続され、ルーターが準備完了
- [ ] Fedora Server 44 ISO イメージが準備済み

---

### 0.4 よくある復旧失敗と対処法

| シナリオ                  | 考えられる原因                      | 解決方法                                                                  |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| **ディスク UUID 不一致**  | 再インストール後に UUID が変化      | `sudo blkid` で新しい UUID を確認し、`/etc/fstab` を更新                  |
| **SELinux がサービス起動をブロック** | セキュリティコンテキストが未復旧    | `sudo restorecon -Rv /mnt /etc`、または `sudo setenforce 0` で一時的に無効化して再読込 |
| **コンテナプロキシ不通**  | LinuxServer 未起動または V2rayN 設定喪失 | `ss -tlnp \| grep 1145` で確認後、`~/Podman/LinuxServer/config/V2rayN/` を確認 |
| **コンテナ起動時の権限エラー** | マウントボリュームの SELinux ラベル消失 | `sudo chcon -Rt container_file_t /mnt/*` でラベル再作成                  |
| **Samba にアクセス不可**  | Samba パスワード未設定              | `sudo smbpasswd -a ywpc` でパスワード再設定                              |
| **ファイアウォールルール消失** | systemd 更新後に firewalld ゾーン消失 | バックアップの `/etc/firewalld/zones/` から復旧                        |
| **frp 接続不可**          | サーバー側 token または IP 変更     | `~/Podman/Frpc/config/frpc.toml` の `serverAddr` と `token` を更新       |

---

- [[#第0部：災害復旧クイックガイド]]
- [[#第1部：基本システムインストールとネットワーク最適化]]
- [[#第2部：ストレージアーキテクチャと共有サービス（Samba / LVM / SSDキャッシュ / ハードディスク休止）]]
- [[#第3部：Podman コンテナエンジンとプロキシ設定]]
- [[#第4部：アプリケーションサービスのコンテナ化デプロイ（Podman Compose スタック）]]
- [[#第5部：自動化スクリプトと日常運用ツール]]
- [[#第6部：クイックコマンド]]
- [[#1.0 システム概要とポートマッピング表]]
- [[#付録：重要ファイルパス索引]]

---

## 第1部：基本システムインストールとネットワーク最適化

> **復旧フェーズ：Phase 1 — システムインストール**
> 目標：Fedora Server 44 をゼロからインストールし、基本的なパーティション、ユーザー作成、ネットワーク設定を完了します。

### 0.5 システムインストール手順

#### Step 1 — ダウンロードと起動ディスクの作成

- **https://fedoraproject.org/server/** から Fedora Server 44 ISO をダウンロード
- Rufus（Windows）または `dd`（Linux/Mac）で USB メモリに書き込み

#### Step 2 — システムインストール

USB メモリから起動し、Fedora Server グラフィカルインストーラ（Anaconda）を起動：

| ステップ       | 操作                                          | 説明                            |
| -------------- | --------------------------------------------- | ------------------------------- |
| 言語           | デフォルト英語                                | 後で `localectl` で中国語設定可 |
| インストール先 | **自動構成 LVM**                              | システムが nvme0n1 に LVM を作成 |
| ネットワークとホスト名 | ネットワークを有効化、ホスト名を `fedora-nas` に設定 | 後でルーターで MAC 固定 IP をバインド |
| ユーザー作成   | 一般ユーザー `ywpc` を作成、「このユーザーを管理者に設定」にチェック | wheel グループに追加、sudo 権限 |
| Root パスワード | **必ず設定**                                  | システム管理操作に使用          |

最終的なパーティション構成は自動生成されます（実際の 119.2G NVMe の場合）：

```
nvme0n1 (119.2G)
├─ nvme0n1p1  600M  /boot/efi   vfat
├─ nvme0n1p2    2G  /boot       xfs
└─ nvme0n1p3  116.7G  LVM2 PV
   └─ fedora_nas-ywpc-root  116.7G  /  xfs
```

#### Step 3 — インストール後の初期設定

インストール完了後、再起動して以下の順序で実行：

```bash
# 1. ネットワーク接続を確認
ip a
ping -c 4 fedoraproject.org

# 2. ネットワーク速度テスト（オプション）
curl -sSL https://cdn.jsdelivr.net/gh/lework/script/shell/os_repo_speed_test.sh | bash

# 3. DNF ミラー変更（TUNA）
sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak
sudo sed -e 's|^metalink=|#metalink=|g' \
         -e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \
         -i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

# 4. DNF 高速化 + プロキシ設定
sudo vi /etc/dnf/dnf.conf
# 1.2 節の設定内容を参照

# 5. キャッシュをクリアし、フル更新
sudo dnf clean all
sudo dnf makecache
sudo dnf update -y

# 6. 再起動
sudo reboot
```

#### Step 4 — データディスクマウントポイントの作成

```bash
sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii
```

詳細なマウント設定は **第2部：ストレージアーキテクチャ** を参照。

---

### 1.0 システム概要

本ガイドの対象マシンの実際の構成と基本情報：

- **オペレーティングシステム**：Fedora Linux 44 (Server Edition)
- **カーネルバージョン**：Linux カーネル（実際のインストールバージョンに依存）
- **ホスト名**：fedora-nas
- **IP アドレス**：192.168.86.221/24（enp2s0）
- **Podman ブリッジ**：10.89.0.1/24（podman1）
- **ハードウェアプラットフォーム**：GREATWALL PC
- **タイムゾーン**：Asia/Shanghai (CST, +0800)
- **NTP 同期**：有効、システムクロック同期済み

#### ポートとサービスマッピング表

| ポート  | サービス          | 所属コンテナ/プロセス                | 説明                       |
| ------- | ----------------- | ------------------------------------ | -------------------------- |
| 22      | SSH               | システムネイティブ                   | リモートログイン（内部ネットワーク） |
| 1145    | HTTP/SOCKS5 プロキシ | LinuxServer → V2rayN（host モード） | 全コンテナのプロキシ出口   |
| 3000    | noVNC ウェブデスクトップ | LinuxServer（host モード）          | Alpine デスクトップリモート管理 |
| 3306    | MySQL             | openlist_mysql                       | OpenList データベース      |
| 5244    | Web UI            | OpenList                             | ファイルリストシステム（Alist 改造版） |
| 5899    | VNC リモートデスクトップ | baidunetdisk                         | 百度網盤 GUI               |
| 7474    | Web UI            | qBittorrent-EE                       | BT ダウンロード管理（強化版） |
| 7700    | Meilisearch       | openlist_meilisearch                 | OpenList 検索エンジン      |
| 8080    | Web UI            | Open-WebUI                           | AI 対話インターフェース    |
| 8088    | Web UI            | Scrutiny                             | ハードディスク健全性監視   |
| 8096    | Web UI            | Jellyfin                             | メディアサーバー           |
| 8384    | Web UI            | Syncthing                            | ファイル同期管理インターフェース |
| 8685    | Web UI            | vnstat-dashboard                     | トラフィック統計パネル     |
| 9090    | Web UI            | Cockpit                              | システム管理パネル（ネイティブ） |
| 12345   | TCP               | bili-sync-rs                         | Bilibili UP 主動画同期     |
| 14630   | TCP               | LinuxServer → Everything             | ファイルインデックスサービス |

> **Frp トンネルマッピング**（リモートアクセス）：4.5 Frpc 設定を参照。リモートポート対応：SSH→60022、その他は基本的に一対一マッピング。

---

### 1.1 システムアップグレードと国内ミラー設定

公式ミラーをバックアップし、好みの国内ミラー（TUNA など）に変更：

```bash

# 公式ミラー設定をバックアップ

sudo cp -a /etc/yum.repos.d /etc/yum.repos.d.bak

  
# TUNA ミラーに変更
sudo sed -e 's|^metalink=|#metalink=|g' \

-e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \

-i /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo

```

  

### 1.2 DNF パフォーマンス最適化設定

`/etc/dnf/dnf.conf` を編集してマルチスレッドダウンロード、最速ミラー選択などを有効化：

```bash

sudo vi /etc/dnf/dnf.conf

```

#### 設定ファイル：`/etc/dnf/dnf.conf`

```ini
# see `man dnf.conf` for defaults and possible options
[main]
max_parallel_downloads=10
fastestmirror=True
proxy=http://127.0.0.1:1145
```

設定完了後、キャッシュを更新：

```bash

sudo dnf clean all

sudo dnf makecache

sudo dnf update -y

```

  

### 1.3 Zsh ターミナルと美化設定

基本依存関係、フォントをインストールし、ターミナル環境を設定：

```bash

# 基本依存関係をインストール

sudo dnf install zsh git curl util-linux eza fastfetch fzf -y

  

# 必要なフォントを作成・ダウンロード（例：MesloLGS NF）

mkdir -p ~/.local/share/fonts/MesloLGS_NF

cd ~/.local/share/fonts/MesloLGS_NF

# [フォントファイルを手動でダウンロード]
curl -fLo "MesloLGS NF Regular.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Regular.ttf"
curl -fLo "MesloLGS NF Bold.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold.ttf"
curl -fLo "MesloLGS NF Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Italic.ttf"
curl -fLo "MesloLGS NF Bold Italic.ttf" "https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Bold%20Italic.ttf"
  

# フォントキャッシュを更新

fc-cache -fv

  

# Oh-My-Zsh & プラグインをインストール

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# [必要な zsh プラグインをクローン：zsh-autosuggestions、zsh-syntax-highlighting、fzf-tab]


# デフォルト Shell を変更

chsh -s $(which zsh)

```

`~/.zshrc` を編集：

```bash

vim ~/.zshrc

```

#### 設定ファイル：`~/.zshrc`

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
alias proxy="export http_proxy=http://127.0.0.1:1145; export https_proxy=http://127.0.0.1:1145; export all_proxy=socks5://127.0.0.1:1145; echo -e '\e[32m[+] ターミナルプロキシを有効化\e[0m'"
alias unproxy="unset http_proxy; unset https_proxy; unset all_proxy; echo -e '\e[31m[-] ターミナルプロキシを無効化\e[0m'"
alias update="sudo dnf update"
alias sudo='sudo '
# スクリプトエイリアス
alias par2go="/home/ywpc/Tools/par2go.sh"
alias rar-a="/home/ywpc/Tools/rar_background_archive.sh"
alias rar-u="/home/ywpc/Tools/rar_background_unpacker.sh"
alias vcm="/home/ywpc/Tools/vc_manager.sh"
alias wkupywpc="/home/ywpc/Tools/wakeup_pc.sh"
alias pcsu="/home/ywpc/Tools/pcs_upload.sh"
# 補完修復
zstyle ':completion:*' completer _expand _complete _ignored _approximate
zstyle ':completion:*:expand:*' keep-prefix true
zstyle ':completion:*:expand:*' accept-exact-directories true
zstyle ':completion:*:expand:*' tag-order 'all-expansions'

```

#### 1.4 パッケージ
```bash
sudo dnf install -y fuse fuse-libs wget tar fastfetch make samba-client wakeonlan wol fzf p7zip p7zip-plugins ncdu vnstat cockpit-pcp pcp-zeroconf iperf3 
```
  

---

  

## 第2部：ストレージアーキテクチャと共有サービス（Samba / LVM / SSDキャッシュ / ハードディスク休止）

  

### 2.1 ルートパーティション LVM オンライン拡張

```bash

# 論理ボリュームを拡張

sudo lvextend -l +100%FREE /dev/mapper/fedora_nas--ywpc-root

  

# ファイルシステムをオンライン拡張（XFS の場合）

sudo xfs_growfs /

```

  

### 2.2 マルチディスクマウントと NVMe SSD キャッシュ初期化

マウントポイントを作成：

```bash

sudo mkdir -p /mnt/Old-1 /mnt/Old-2 /mnt/New-1 /mnt/New-2 /mnt/SSD-Cache /mnt/H /mnt/Weii

```

SSD キャッシュディスク（例：`/dev/nvme1n1`）をフォーマットして初期化：

```bash

sudo parted /dev/nvme1n1 mklabel gpt

sudo parted /dev/nvme1n1 mkpart primary ext4 0% 100%

sudo mkfs.ext4 /dev/nvme1n1p1

sudo chown -R ywpc:ywpc /mnt/SSD-Cache

```

システムの永続マウントテーブル `/etc/fstab` を編集：

```bash

sudo vim /etc/fstab

```

#### 設定ファイル：`/etc/fstab`

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

設定を再読み込みしてマウント：

```bash

sudo systemctl daemon-reload

sudo mount -a

```

  

### 2.3 Samba ローカルネットワーク共有サービス

デフォルト設定をバックアップ：

```bash

sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak

sudo vi /etc/samba/smb.conf

```

#### 設定ファイル：`/etc/samba/smb.conf`

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

パスワード、セキュリティルールを設定し、サービスを起動：

```bash

# Samba ユーザーパスワードを設定

sudo smbpasswd -a ywpc

  

# 外部マウントボリュームへの Samba アクセスを許可（SELinux ルール）

sudo setsebool -P samba_export_all_rw 1

  

# ファイアウォールで許可（Samba 基本ルール）

sudo firewall-cmd --add-service=samba --permanent
sudo firewall-cmd --reload

# ⚠️ 完全なファイアウォールルール復旧（システム再インストール後は zone ファイルを直接復元することを推奨）

# /etc/firewalld/zones/ ディレクトリをバックアップしていた場合、直接復元：
# sudo cp -r /バックアップ先/FedServer.xml /etc/firewalld/zones/
# sudo firewall-cmd --reload

# そうでない場合は、すべてのサービスを個別に追加：
# sudo firewall-cmd --add-service={ssh,dhcpv6-client,cockpit,samba} --permanent
# sudo firewall-cmd --add-service={syncthing,syncthing-gui} --permanent
# sudo firewall-cmd --add-service={Jellyfin,scrutiny} --permanent
# sudo firewall-cmd --add-service={Open-WebUI,OpenList,bili-sync} --permanent
# sudo firewall-cmd --add-service={qBittorrent-Enhanced-Edition,qBittorrent-core} --permanent
# sudo firewall-cmd --add-service={peerbanhelper,baidunetdisk,115} --permanent
# sudo firewall-cmd --add-service={LinuxServer,Debian,vnstat,iperf3} --permanent
# sudo firewall-cmd --add-masquerade --permanent
# sudo firewall-cmd --reload

  

# 起動して自動起動を有効化

sudo systemctl enable --now smb nmb

```

  

### 2.4 エンタープライズ級ハードディスク省電力と休止制御

udev ルールを設定して、機械式ハードディスクの省電力と休止ポリシーを調整：

```bash

# openSeaChest ファームウェアツールを作成・ダウンロード
mkdir -p ~/Software/openSeaChest && cd ~/Software/openSeaChest
# [openSeaChest ポータブルバイナリを手動でダウンロード・解凍]

# 対象ディスク（例：/dev/sdb）の現在の EPC 電源状態を表示
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings

# ファームウェアレベルで EPC 省電力機能を無効化
sudo ./openSeaChest_PowerControl -d /dev/sdb --EPCfeature disable

# Idle_A / Idle_B などのアイドルサスペンド低電力モードを無効化
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_a disable
sudo ./openSeaChest_PowerControl -d /dev/sdb --idle_b disable

# 再度確認し、すべての State が Disabled になっていることを確認
sudo ./openSeaChest_PowerControl -d /dev/sdb --showEPCSettings

```


---

  

## 第3部：Podman コンテナエンジンとプロキシ設定

  

### 3.1 コンテナのログイン不要常駐（Linger モード）

Rootless コンテナがユーザーログアウト後も実行され続けるようにする：

```bash

sudo loginctl enable-linger ywpc

```

  

### 3.2 コンテナエンジン全体のプロキシ設定

Podman コンテナ設定ファイルを編集し、コンテナプルのプロキシパラメータを設定：

```bash
sudo tee /etc/systemd/system/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# 設定を再読み込みしてサービスを再起動
sudo systemctl daemon-reload
sudo systemctl restart podman.service

```

```bash
tee ~/.config/systemd/user/podman.service.d/override.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:1145" "HTTPS_PROXY=http://127.0.0.1:1145" "NO_PROXY=localhost,127.0.0.1"
EOF

# 設定を再読み込みしてユーザーサービスを再起動
systemctl --user daemon-reload
systemctl --user restart podman.service
```

#### 設定ファイル：`/etc/containers/containers.conf`

```toml
[engine]
compose_warning_logs = false
[containers]
http_proxy = false
```
#### 設定ファイル：`~/.config/containers/containers.conf`
```toml
[engine]
compose_warning_logs = false
```

> Root サービス設定の確認：`sudo systemctl show podman.service --property=Environment`
> Rootless サービス設定の確認：`systemctl --user show podman.service --property=Environment`

---


## 第4部：アプリケーションサービスのコンテナ化デプロイ（Podman Compose スタック）

  

コンテナ作業ルートディレクトリ：`~/Podman`

  
```bash

mkdir -p ~/Podman/{115,baidunetdisk,Bili-Sync,Frpc,Jellyfin,LinuxServer,Openlist,OpenWebUI,PeerBanHelper,qBittorrent-Enhanced-Edition,scrutiny,Syncthing,vnstat-ui}

```

### 4.1 115

> **現状**：設定ファイルは存在しますが、コンテナは現在実行されていません。必要に応じて `podman compose -f ~/Podman/115/docker-compose.yml up -d` を実行して起動します。

#### 設定ファイル：`~/Podman/115/docker-compose.yml`
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

#### 設定ファイル：`~/Podman/baidunetdisk/docker-compose.yml`

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
    shm_size: 1gb                           # 重要！ログイン白画面対策
    cpus: 2
```
### 4.3 Bili-Sync

#### 設定ファイル：`~/Podman/Bili-Sync/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/Frpc/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/Frpc/config/frpc.toml`

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

> **現状**：実行中（Up 2 days）。Intel 内蔵 GPU パススルー（`/dev/dri`）でハードウェアトランスコーディングを構成済み、ポート 8096 でアクセス可能。

#### 設定ファイル：`~/Podman/Jellyfin/docker-compose.yml`

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

  

### 4.6 LinuxServer（プロキシ中核コンテナ — 他のコンテナより先に起動必須）

> **⚠️ 重要**：このコンテナ内部では **V2rayN（Xray コア）** が動作しており、他の全コンテナのネットワークプロキシはこのコンテナに依存しています。
> 現在は `network_mode: host`（ホストネットワーク）を使用しており、V2rayN がホストのネットワーク名前空間でポート 1145 を直接リッスンしています。
> システム復旧時は、**このコンテナを最初に起動し、プロキシが有効になったことを確認してから**、他のコンテナを起動してください。

> また、コンテナ内では **Everything Server** などのツールも実行されています。

#### 設定ファイル：`~/Podman/LinuxServer/docker-compose.yml`

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
      # 自動注入されるプロキシ環境変数をクリア（コンテナ自身がプロキシを実行）
      - HTTP_PROXY=
      - HTTPS_PROXY=
      - ALL_PROXY=
      - http_proxy=
      - https_proxy=
      - all_proxy=
    volumes:
      - ./config:/config:z             # V2rayN 設定は ./config/V2rayN/ に保存
    shm_size: "256mb"
    restart: unless-stopped
```

#### プロキシ有効化の確認

コンテナ起動後、ホストでプロキシサービスが正常に動作していることを確認：

```bash
# 1145 ポートがリッスンしていることを確認
ss -tlnp | grep 1145

# プロキシ経由でネットワーク接続をテスト
curl -x socks5://127.0.0.1:1145 https://www.google.com -o /dev/null -w "%{http_code}" -s
# 200 が返されるはず
```

> **復旧ヒント**：V2rayN 設定は `~/Podman/LinuxServer/config/V2rayN/` にあります。復旧時はこのディレクトリから V2rayN 設定を復元してください。


### 4.8 Openlist

#### 設定ファイル：`~/Podman/Openlist/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/OpenWebUI/docker-compose.yml`

```yaml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    network_mode: host
    environment:
      - TZ=Asia/Shanghai
      # 👈 重要：コンテナ内の全 HTTP/HTTPS リクエストをホストの 1145 ポート（v2rayN HTTP プロキシ）経由に
      - HTTP_PROXY=http://host.containers.internal:1145
      - HTTPS_PROXY=http://host.containers.internal:1145
      # 👈 注意：ローカル接続（同一 NAS 上の local Ollama など）はプロキシを通さない
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

#### 設定ファイル：`~/Podman/PeerBanHelper/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/qBittorrent-Enhanced-Edition/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/scrutiny/docker-compose.yml`

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

#### 設定ファイル：`~/Podman/Syncthing/docker-compose.yml`

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
      - ./config:/config:z               # 設定とデータベースはローカルディスクに保存
      - /mnt/SSD-Cache/Syncthing:/mnt/Syncthing:z
    restart: unless-stopped
```

### 4.14 vnstat-ui

#### 設定ファイル：`~/Podman/vnstat-ui/docker-compose.yml`

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

  

## 第5部：自動化スクリプトと日常運用ツール

  

カスタム運用スクリプトはすべて `~/Tools` に保存します。スクリプト作成後、以下のコマンドで実行権限を付与：

```bash

mkdir -p ~/Tools

chmod 700 ~/Tools/* 2>/dev/null || true

```

  

### 5.1 VeraCrypt 暗号化ボリュームマウントマネージャー

#### スクリプトファイル：`~/Tools/vc_manager.sh`


### 5.2 Everything EFU とディレクトリツリー生成

#### スクリプトファイル：`~/Scripts/generate_efu_and_tree.py`

> **説明**：このスクリプトは実際には `~/Scripts/` ディレクトリに保存されています（`~/Tools/` ではありません）。crontab では `/home/ywpc/Scripts/generate_efu_and_tree.py` と正しく指定されています。

### 5.3 バックグラウンド RAR 自動パッケージ圧縮ツール

#### スクリプトファイル：`~/Tools/rar_background_archive.sh`

### 5.4 バックグラウンド自動解凍ツール

#### スクリプトファイル：`~/Tools/rar_background_unpacker.sh`

### 5.5 Wake-on-LAN クライアントスクリプト

#### スクリプトファイル：`~/Tools/wakeup_pc.sh`

### 5.6 Par2 冗長性修復ツール

#### スクリプトファイル：`~/Tools/par2go.sh`

Par2 冗長性修復パッケージを自動作成。ファイル破損時に `par2 repair` で復元可能。

```bash
# 冗長性修復パッケージを作成（10% 冗長）
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &
# 修復
nohup par2 repair file.par2 > file.log 2>&1 &
```

### 5.7 PCS（プライベートクラウド同期）アップロードツール

#### スクリプトファイル：`~/Tools/pcs_upload.sh`

ローカルディレクトリをプライベートクラウドストレージに同期するアップロードスクリプト。

### 5.8 RAR 自動パッケージ（Vn バリアント）

#### スクリプトファイル：`~/Tools/rar_background_archive_vn.sh`

`rar_background_archive.sh` のバリアント版。特定のディレクトリ構造と命名規則に適合。

### 5.9 システム定期タスク（Crontab）

`sudo crontab -e` を実行し、定期タスク設定を手動で入力：

```bash

sudo crontab -e

```

#### 定期タスク設定内容（root 級、`sudo crontab -e`）：

```text
30 04 * * * /usr/bin/python3 /home/ywpc/Scripts/generate_efu_and_tree.py > /var/log/daily_scan.log 2>&1
```

#### 定期タスク設定内容（ユーザー級、`crontab -e`）：

```text
0 */6 * * * /home/ywpc/Tools/check-fedora-kernel-ntfs.sh >/dev/null 2>&1
0 6 * * * find /home/ywpc/Podman/OpenWebUI/config/uploads -type f -mtime +60 -delete
```

手動で cron を有効化し再起動：

```bash

sudo systemctl restart crond

sudo systemctl status crond

```

## 第6部：クイックコマンド

### 6.1 表示系

```bash
# /mnt にマウントされたディスクの空き容量を表示
df -h | grep /mnt

# cockpit パネルのログを表示
journalctl -u cockpit

# 全コンテナの稼働状態を表示
podman ps --all --format "table {{.Names}} {{.Status}}"
```

### 6.2 サービス管理

```bash
# ファイアウォールを再読込
sudo firewall-cmd --reload

# SMB と NMB サービスを再起動
sudo systemctl restart smb nmb

# コンテナを再起動
podman restart コンテナ名

# コンテナスタック全体を再起動
podman compose -f ~/Podman/コンテナ名/docker-compose.yml restart
```

### 6.3 コンテナ操作

```bash
# コンテナのリアルタイムログを表示
podman logs -f コンテナ名

# オフラインイメージをロード
podman load -i *.tar
```

### 6.4 ファイル操作

```bash
# Par2 冗長性修復パッケージを作成（~/Tools/par2go.sh 推奨）
nohup par2 create -r10 /path/to/file.par2 /path/to/file > /path/to/file.log 2>&1 &

# Par2 修復
nohup par2 repair file.par2 > file.log 2>&1 &
```

---

## 付録：重要ファイルパス索引

| ファイルパス                                             | 用途                     | 所属     |
| -------------------------------------------------------- | ------------------------ | -------- |
| `/etc/fstab`                                             | ディスクマウント設定     | システム設定 |
| `/etc/samba/smb.conf`                                    | Samba 共有設定           | Samba    |
| `/etc/dnf/dnf.conf`                                      | DNF パッケージマネージャ最適化 | システム設定 |
| `/etc/selinux/config`                                    | SELinux モード（Enforcing） | システム設定 |
| `/etc/firewalld/zones/FedServer.xml`                     | ファイアウォールルール永続化 | ネットワーク |
| `/etc/systemd/system/podman.service.d/override.conf`     | Podman システム級プロキシ設定 | コンテナ |
| `~/.config/systemd/user/podman.service.d/override.conf`  | Podman ユーザー級プロキシ設定 | コンテナ |
| `~/.config/containers/containers.conf`                   | Podman コンテナエンジンユーザー設定 | コンテナ |
| `~/.zshrc`                                               | Zsh ターミナル設定        | Shell    |
| `~/.p10k.zsh`                                            | Powerlevel10k テーマ設定  | Shell    |
| `~/.ssh/authorized_keys`                                 | SSH 公開鍵認証            | SSH      |
| `~/Scripts/generate_efu_and_tree.py`                     | 日次ファイルディレクトリツリー生成 | Cron     |
| `~/Tools/rar_background_archive.sh`                      | RAR バックグラウンド自動パッケージ | 運用     |
| `~/Tools/rar_background_unpacker.sh`                     | RAR バックグラウンド自動解凍 | 運用     |
| `~/Tools/par2go.sh`                                      | Par2 冗長性修復パッケージツール | 運用     |
| `~/Tools/vc_manager.sh`                                  | VeraCrypt 暗号化ボリュームマウントマネージャー | ストレージ |
| `~/Tools/pcs_upload.sh`                                  | プライベートクラウド同期アップロード | 運用     |
| `~/Tools/wakeup_pc.sh`                                   | Wake-on-LAN クライアント   | ネットワーク |
| `~/Podman/*/docker-compose.yml`                          | 各コンテナオーケストレーションファイル | コンテナ |
| `~/Podman/LinuxServer/config/V2rayN/`                    | V2rayN プロキシ設定（サブスク含む） | プロキシ |
| `/etc/xray/`                                             | （予備）Xray ネイティブ設定 | プロキシ |
| `/var/log/daily_scan.log`                                | 日次ファイルスキャンログ  | ログ     |
| `~/.bash_history` / `~/.zsh_history`                     | Shell コマンド履歴        | Shell    |

// VitePress 主题配置扩展 — 让 config.mts 中的自定义项有类型提示
declare module 'vitepress' {
  namespace DefaultTheme {
    interface Config {
      /** 自部署计数器端点（Cloudflare Worker）。留空则回退到公共不蒜子服务 */
      counterEndpoint?: string
    }
  }
}

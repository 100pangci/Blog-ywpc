// Cloudflare Worker — 自部署页面计数器
// 部署方式：
//   1. 安装 wrangler: npm i -g wrangler
//   2. wrangler login
//   3. wrangler kv:namespace create "BLOG_COUNTER"
//   4. 将 namespace ID 填入 wrangler.toml
//   5. wrangler deploy
//
// 前端组件需将 endpoint 指向 https://你的worker名.workers.dev/counter

// ========== wrangler.toml ==========
// name = "blog-counter"
// main = "counter.js"
// compatibility_date = "2026-01-01"
//
// [[kv_namespaces]]
// binding = "BLOG_COUNTER"
// id = "你的namespace-id"
// ========== end ==========

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '/'

    // site-level counters (per day)
    const today = new Date().toISOString().slice(0, 10)
    const sitePvKey = `site_pv`
    const siteUvKey = `site_uv:${today}:${request.headers.get('CF-Connecting-IP') || 'anon'}`

    // page-level counters
    const pagePvKey = `page_pv:${page}`

    // atomic increment
    const sitePv = await env.BLOG_COUNTER.get(sitePvKey)
    await env.BLOG_COUNTER.put(sitePvKey, String((parseInt(sitePv) || 0) + 1))

    // unique visitor per day (idempotent — only counts once per IP per day)
    const siteUvRaw = await env.BLOG_COUNTER.get(siteUvKey)
    if (!siteUvRaw) {
      await env.BLOG_COUNTER.put(siteUvKey, '1', { expirationTtl: 86400 })
    }

    // page pv
    const pagePv = await env.BLOG_COUNTER.get(pagePvKey)
    await env.BLOG_COUNTER.put(pagePvKey, String((parseInt(pagePv) || 0) + 1))

    // count unique IPs today
    const siteUvList = await env.BLOG_COUNTER.list({ prefix: `site_uv:${today}:` })
    const siteUv = siteUvList.keys.length

    return Response.json({
      site_pv: parseInt(sitePv) + 1,
      site_uv: siteUv,
      page_pv: parseInt(pagePv) + 1,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    })
  },
}

// Cloudflare Worker — 自部署页面计数器（JSON / JSONP 双模式）
//
// 部署方式：
//   1. npm i -g wrangler && wrangler login
//   2. wrangler kv namespace create "BLOG_COUNTER"
//   3. 把返回的 namespace id 填进同目录的 wrangler.toml
//   4. cd docs && wrangler deploy
//   5. 把 worker 地址填进 docs/.vitepress/config.mts 的 themeConfig.counterEndpoint

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// JSONP 回调名白名单校验，避免把任意脚本注入响应
function isValidCallback(name) {
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(name)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (!env || !env.BLOG_COUNTER) {
      return json({ error: 'KV binding BLOG_COUNTER is missing' }, 500)
    }

    const page = (url.searchParams.get('page') || '/').slice(0, 300)
    const today = new Date().toISOString().slice(0, 10)

    // 站点总访问量
    const sitePvKey = 'site_pv'
    const sitePv = parseInt(await env.BLOG_COUNTER.get(sitePvKey)) || 0
    await env.BLOG_COUNTER.put(sitePvKey, String(sitePv + 1))

    // 独立访客（按 IP + 日期去重，24h 过期）
    const ip = request.headers.get('CF-Connecting-IP') || 'anon'
    const siteUvKey = `site_uv:${today}:${ip}`
    if (!await env.BLOG_COUNTER.get(siteUvKey)) {
      await env.BLOG_COUNTER.put(siteUvKey, '1', { expirationTtl: 86400 })
    }
    const siteUvList = await env.BLOG_COUNTER.list({ prefix: `site_uv:${today}:` })
    const siteUv = siteUvList.keys.length

    // 单页访问量
    const pagePvKey = `page_pv:${page}`
    const pagePv = parseInt(await env.BLOG_COUNTER.get(pagePvKey)) || 0
    await env.BLOG_COUNTER.put(pagePvKey, String(pagePv + 1))

    const payload = {
      site_pv: sitePv + 1,
      site_uv: siteUv,
      page_pv: pagePv + 1,
      page,
    }

    // JSONP 兼容（?jsonpCallback=fn）
    const callback = url.searchParams.get('jsonpCallback') || url.searchParams.get('callback')
    if (callback) {
      if (!isValidCallback(callback)) return json({ error: 'invalid callback name' }, 400)
      return new Response(`${callback}(${JSON.stringify(payload)})`, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8' },
      })
    }

    return json(payload)
  },
}

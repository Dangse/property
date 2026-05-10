# 독립 Worker 프록시 (대안)

> **권장 배포 경로는 [Cloudflare Pages + Functions](../DEPLOY.md)** 입니다.
> 같은 origin에서 SPA와 `/api/chat`이 함께 제공되어 CORS·도메인 화이트리스트가 불필요합니다.
>
> 본 디렉터리(`worker/`)는 **Pages를 사용할 수 없는 환경**(예: 별도 호스팅에 SPA 배포 + Cloudflare에는 API만)을 위한 대안입니다.

## 언제 사용?

- SPA를 GitHub Pages, Vercel, Netlify 등 다른 호스트에 두고 API만 Cloudflare에서 운영할 때
- 여러 프론트엔드 도메인이 동일한 프록시를 공유해야 할 때

## 설정

```bash
npm install -g wrangler
wrangler login

cd worker
wrangler secret put ANTHROPIC_API_KEY
wrangler deploy
```

배포 후 출력되는 URL(예: `https://tax-ai-proxy.your-subdomain.workers.dev`)을 SPA의 `index.html`에 다음 메타 태그로 등록:

```html
<meta name="api-base" content="https://tax-ai-proxy.your-subdomain.workers.dev">
```

`src/ai/chat.js`의 `resolveApiUrl()`이 이 메타 태그를 우선 사용합니다.

## 보안 (대안 경로 사용 시 필수)

- `index.js` 의 `CORS_ALLOW_ORIGIN` 을 본인 도메인으로 제한 (예: `https://tax-ai.example.com`)
- 또는 환경변수 `ALLOWED_ORIGINS` 를 추가하고 코드에서 동적 검사
- Cloudflare Workers Rate Limiting 추가 권장

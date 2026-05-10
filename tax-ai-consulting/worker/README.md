# Tuzaga AI 세금 상담 — Cloudflare Worker 프록시

Anthropic Claude API 키를 보호하면서 클라이언트(SPA)에서 직접 호출 가능하게 하는 프록시 워커.

## 설정

```bash
# 1) wrangler 설치
npm install -g wrangler

# 2) Cloudflare 로그인
wrangler login

# 3) Anthropic API 키 비밀로 등록
wrangler secret put ANTHROPIC_API_KEY
# (콘솔에 키 입력)

# 4) 배포
wrangler deploy
```

배포 후 출력되는 URL(예: `https://tax-ai-proxy.your-subdomain.workers.dev`)을 SPA의 `src/ai/chat.js`의 `WORKER_URL`에 설정.

## 엔드포인트

### `POST /api/chat`

요청:
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "system":   "system prompt",
  "max_tokens": 4096
}
```

응답: `text/event-stream` (Anthropic SSE 그대로 패스스루)

## 보안

- 운영 시 `index.js`의 `CORS_ALLOW_ORIGIN`을 본인 도메인으로 제한
- 필요 시 Cloudflare Workers의 [Rate Limiting](https://developers.cloudflare.com/workers/configuration/bindings/#rate-limiting) 추가

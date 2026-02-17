# Use Your PC as Mira's Server (Free)

When your computer is on, Mira works from any device — phone, tablet, another computer — no paid hosting.

## 1. Start Ollama (if not running)

Make sure Ollama is running and has a model:

```
ollama serve
ollama run gemma3:4b
```

## 2. Start the proxy

```bash
cd server
npm start
```

The proxy runs on port 3000 and forwards to Ollama. Keep this terminal open.

## 3. Expose your PC with Cloudflare Tunnel (free, works on phones)

Open a **second terminal** and run:

```bash
cd server
npm run tunnel
```

Or: `npx cloudflared tunnel --url http://localhost:3000`

You'll get a URL like `https://abc-xyz.trycloudflare.com`. **Copy it.** This works for API calls (unlike localtunnel, which breaks on phones).

## 4. Point Mira at your tunnel

Edit `api-config.js` in the project root and set:

```js
window.MIRA_API_BASE = 'https://abc-xyz.trycloudflare.com';
```

Use the URL from step 3 (no trailing slash).

## 5. Deploy to GitHub

Push your changes and deploy to GitHub Pages. Mira will connect to your PC through the tunnel.

## 6. Use Mira remotely

As long as:

- Your PC is on
- Ollama is running
- The proxy (`npm start`) is running
- The tunnel (`npm run tunnel`) is running

…Mira works from anywhere. Phone, laptop, whatever.

---

**Note:** Cloudflare gives a new URL each time you run the tunnel. After restarting, copy the new URL, update `api-config.js`, and push to GitHub.

<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>歡迎使用</title>
  <style>
    :root {
      --bg1: #0f172a;
      --bg2: #1e293b;
      --card: rgba(255,255,255,0.08);
      --border: rgba(255,255,255,0.18);
      --text: #f8fafc;
      --sub: #cbd5e1;
      --glow: rgba(96,165,250,0.35);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(59,130,246,0.28), transparent 35%),
        radial-gradient(circle at bottom right, rgba(168,85,247,0.22), transparent 35%),
        linear-gradient(135deg, var(--bg1), var(--bg2));
      overflow: hidden;
    }

    .wrap {
      width: min(92vw, 900px);
      padding: 48px 28px;
      text-align: center;
      border: 1px solid var(--border);
      background: var(--card);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-radius: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      position: relative;
    }

    .wrap::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 28px;
      padding: 1px;
      background: linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.05));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
              mask-composite: exclude;
      pointer-events: none;
    }

    h1 {
      font-size: clamp(52px, 10vw, 110px);
      letter-spacing: 0.18em;
      text-indent: 0.18em;
      font-weight: 900;
      line-height: 1.1;
      text-shadow: 0 0 28px var(--glow);
    }

    p {
      margin-top: 20px;
      font-size: clamp(16px, 2vw, 20px);
      color: var(--sub);
      letter-spacing: 0.08em;
    }

    .dot {
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.35;
      z-index: -1;
    }

    .dot.one {
      top: 8%;
      left: 10%;
      background: #60a5fa;
    }

    .dot.two {
      right: 8%;
      bottom: 10%;
      background: #a78bfa;
    }

    @media (max-width: 640px) {
      .wrap {
        padding: 40px 20px;
        border-radius: 22px;
      }

      h1 {
        letter-spacing: 0.12em;
        text-indent: 0.12em;
      }
    }
  </style>
</head>
<body>
  <div class="dot one"></div>
  <div class="dot two"></div>

  <main class="wrap">
    <h1>歡迎使用</h1>
    <p>Simple · Clean · Elegant</p>
  </main>
</body>
</html>


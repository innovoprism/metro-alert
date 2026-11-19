// Metro Alert settings you can change without touching the app code.
window.METRO_ALERT_CONFIG = {
  // Your Metro Alert server (Cloudflare Worker), e.g. 'https://metro-alert.yourname.workers.dev'
  // Used by the phone apps for usage counting, learned train timings and updates.
  // The web app hosted on that server finds it by itself, so this can stay empty for web.
  api: '',
  // Where to look for new versions when no server is set (GitHub releases)
  githubRepo: 'innovoprism/metro-alert'
};

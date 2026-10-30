<script setup>
import { ref } from 'vue'
import { siWhatsapp, siTelegram, siDiscord, siMessenger } from 'simple-icons'

const props = defineProps({ year: String, zone: String })

// Live site always shares the main domain, even if opened from *.vercel.app
const SITE_URL = 'https://taxaudit.tanbirahmod.com'
const url = import.meta.env.PROD ? SITE_URL : window.location.origin

// The TIN is never put in the message, so people don't leak it by sharing
const news =
  `🎉 Good news! My tax return is NOT on the AY ${props.year} audit list (${props.zone} zone).\n` +
  `সুখবর! আমার রিটার্ন অডিট তালিকায় নেই 🎉`
const fullText = `${news}\n\nCheck yours here 👉 ${url}`
// Telegram always puts the link above the text, so point up to it
const telegramText = `☝️ Check yours at the link above\n\n${news}`

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const toast = ref('')
let toastTimer

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3500)
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(fullText)
    return true
  } catch {
    return false
  }
}

const open = (href) => window.open(href, '_blank', 'noopener')

// Discord and Messenger (on desktop) have no "share with text" link,
// so the message is copied and the app is opened for the user to paste it.
async function copyAndOpen(href, app) {
  const ok = await copyText()
  showToast(ok ? `Message copied — paste it in ${app}` : `Open ${app} and share: ${url}`)
  open(href)
}

const targets = [
  {
    name: 'WhatsApp',
    icon: siWhatsapp,
    go: () => open(`https://wa.me/?text=${encodeURIComponent(fullText)}`),
  },
  {
    name: 'Telegram',
    icon: siTelegram,
    go: () =>
      open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(telegramText)}`),
  },
  {
    name: 'Discord',
    icon: siDiscord,
    go: () => copyAndOpen('https://discord.com/channels/@me', 'Discord'),
  },
  {
    name: 'Messenger',
    icon: siMessenger,
    go: () =>
      isMobile
        ? (window.location.href = `fb-messenger://share/?link=${encodeURIComponent(url)}`)
        : copyAndOpen('https://www.messenger.com/', 'Messenger'),
  },
]
</script>

<template>
  <div class="share">
    <div class="share-title">Share this good news <span class="bn muted">· সুখবরটি শেয়ার করুন</span></div>
    <div class="share-row">
      <button
        v-for="t in targets"
        :key="t.name"
        class="share-btn"
        :style="{ '--c': '#' + t.icon.hex }"
        :aria-label="`Share on ${t.name}`"
        @click="t.go"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path :d="t.icon.path" fill="currentColor" /></svg>
        <span>{{ t.name }}</span>
      </button>
    </div>
    <p class="share-note small muted">Your TIN is not included in the message.</p>
    <transition name="fade">
      <div v-if="toast" class="toast small" role="status">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.share { margin-top: 14px; padding-top: 14px; border-top: 1px dashed color-mix(in srgb, var(--ok) 35%, transparent); }
.share-title { font-weight: 600; font-size: 14px; margin-bottom: 10px; }
.muted { color: var(--muted); font-weight: 400; }
.small { font-size: 12px; }
.share-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.share-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px 10px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--c); font-weight: 600; font-size: 13px;
  transition: background .15s, color .15s, border-color .15s, transform .1s;
}
.share-btn span { color: var(--text); }
.share-btn:hover { background: var(--c); border-color: var(--c); color: #fff; }
.share-btn:hover span { color: #fff; }
.share-btn:active { transform: scale(.97); }
.share-note { margin: 8px 0 0; }
.toast { margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: var(--text); color: var(--surface); display: inline-block; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .share-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>

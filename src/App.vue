<script setup>
import { computed, ref, watch } from 'vue'
import { records, byTin, circles, normalizeTin, formatTin, downloadCsv } from './utils'

const total = records.length
const meta = { year: records[0].year, zone: records[0].zone }

/* ---------- Single TIN check ---------- */
const mode = ref('single')
const tinInput = ref('')
const tin = computed(() => normalizeTin(tinInput.value))
const match = computed(() => (tin.value.length === 12 ? byTin.get(tin.value) : null))
const status = computed(() => {
  if (!tin.value) return 'empty'
  if (tin.value.length < 12) return 'typing'
  if (tin.value.length > 12) return 'invalid'
  return match.value ? 'found' : 'clear'
})
// While typing, show TINs that start with what was typed
const suggestions = computed(() => {
  if (status.value !== 'typing' || tin.value.length < 4) return []
  return records.filter((r) => r.tin.startsWith(tin.value)).slice(0, 5)
})

/* ---------- Bulk check ---------- */
const bulkInput = ref('')
const bulkResults = computed(() => {
  const seen = new Set()
  const out = []
  for (const part of bulkInput.value.split(/[\n,;]+/)) {
    const t = normalizeTin(part)
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push({ tin: t, valid: t.length === 12, rec: byTin.get(t) || null })
  }
  return out
})
const bulkFound = computed(() => bulkResults.value.filter((r) => r.rec))
const bulkInvalid = computed(() => bulkResults.value.filter((r) => !r.valid).length)

/* ---------- Browse list ---------- */
const query = ref('')
const circle = ref('')
const sortKey = ref('id')
const sortDir = ref(1)
const page = ref(1)
const perPage = 25

const circleStats = computed(() => {
  const counts = {}
  for (const r of records) counts[r.circle] = (counts[r.circle] || 0) + 1
  const max = Math.max(...Object.values(counts))
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, pct: (count / max) * 100 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const filtered = computed(() => {
  const q = normalizeTin(query.value)
  let list = records.filter(
    (r) => (!circle.value || r.circle === circle.value) && (!q || r.tin.includes(q)),
  )
  const k = sortKey.value
  return [...list].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * sortDir.value)
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage))
watch([query, circle], () => (page.value = 1))

function setSort(k) {
  if (sortKey.value === k) sortDir.value *= -1
  else (sortKey.value = k), (sortDir.value = 1)
}

function pickCircle(name) {
  circle.value = circle.value === name ? '' : name
  document.getElementById('list')?.scrollIntoView({ behavior: 'smooth' })
}

// Split TIN into parts so the matched digits can be highlighted
function highlight(t) {
  const q = normalizeTin(query.value)
  const i = q ? t.indexOf(q) : -1
  if (i < 0) return [{ text: t, hit: false }]
  return [
    { text: t.slice(0, i), hit: false },
    { text: t.slice(i, i + q.length), hit: true },
    { text: t.slice(i + q.length), hit: false },
  ]
}

const copied = ref('')
async function copy(t) {
  try {
    await navigator.clipboard.writeText(t)
    copied.value = t
    setTimeout(() => copied.value === t && (copied.value = ''), 1200)
  } catch {}
}

function exportFiltered() {
  const suffix = circle.value ? '-' + circle.value.replace(/\W+/g, '-').toLowerCase() : ''
  downloadCsv(filtered.value, `audit-tins${suffix}.csv`)
}
</script>

<template>
  <header class="top">
    <div class="wrap top-inner">
      <div class="brand">
        <span class="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>
        </span>
        <div>
          <div class="brand-title">Tax Audit TIN Checker</div>
          <div class="brand-sub bn">অডিটের জন্য নির্বাচিত রিটার্ন যাচাই</div>
        </div>
      </div>
      <div class="pills">
        <span class="pill">AY {{ meta.year }}</span>
        <span class="pill">{{ meta.zone }} Zone</span>
      </div>
    </div>
  </header>

  <main class="wrap">
    <!-- Hero checker -->
    <section class="hero card">
      <div class="hero-head">
        <h1>Is your return selected for audit?</h1>
        <p class="muted bn">আপনার ১২ সংখ্যার TIN লিখুন — বাংলা বা ইংরেজি সংখ্যা, স্পেস বা ড্যাশসহ লিখলেও চলবে।</p>
      </div>

      <div class="tabs" role="tablist">
        <button role="tab" :aria-selected="mode === 'single'" :class="{ on: mode === 'single' }" @click="mode = 'single'">Single TIN</button>
        <button role="tab" :aria-selected="mode === 'bulk'" :class="{ on: mode === 'bulk' }" @click="mode = 'bulk'">Bulk check</button>
      </div>

      <div v-if="mode === 'single'">
        <label class="search">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input
            v-model="tinInput"
            class="mono"
            inputmode="numeric"
            autocomplete="off"
            placeholder="e.g. 2900 9274 7380"
            aria-label="TIN number"
            autofocus
          />
          <span class="count mono" :class="{ full: tin.length === 12 }">{{ tin.length }}/12</span>
          <button v-if="tinInput" class="clear" aria-label="Clear" @click="tinInput = ''">×</button>
        </label>

        <transition name="pop" mode="out-in">
          <div v-if="status === 'found'" key="found" class="result danger">
            <div class="result-icon">!</div>
            <div class="result-body">
              <div class="result-title">This TIN is on the audit list</div>
              <div class="bn result-sub">এই TIN টি অডিটের জন্য নির্বাচিত হয়েছে</div>
              <dl class="facts">
                <div><dt>TIN</dt><dd class="mono">{{ formatTin(match.tin) }}</dd></div>
                <div><dt>Circle</dt><dd>{{ match.circle }}</dd></div>
                <div><dt>Zone</dt><dd>{{ match.zone }}</dd></div>
                <div><dt>Assessment year</dt><dd>{{ match.year }}</dd></div>
                <div><dt>Serial in list</dt><dd>#{{ match.id }}</dd></div>
              </dl>
            </div>
          </div>
          <div v-else-if="status === 'clear'" key="clear" class="result ok">
            <div class="result-icon">✓</div>
            <div class="result-body">
              <div class="result-title">Not on this list</div>
              <div class="bn result-sub">এই TIN টি তালিকায় নেই</div>
              <p class="small muted">Checked against all {{ total }} TINs for {{ meta.zone }} zone, AY {{ meta.year }}. Other zones are not included in this file.</p>
            </div>
          </div>
          <div v-else-if="status === 'invalid'" key="invalid" class="result warn">
            <div class="result-icon">?</div>
            <div class="result-body">
              <div class="result-title">A TIN has 12 digits</div>
              <div class="small">You entered {{ tin.length }} digits. Please check the number.</div>
            </div>
          </div>
          <div v-else-if="suggestions.length" key="sugg" class="suggest">
            <div class="small muted">TINs starting with <b class="mono">{{ tin }}</b></div>
            <button v-for="s in suggestions" :key="s.tin" class="sugg-item" @click="tinInput = s.tin">
              <span class="mono"><b>{{ s.tin.slice(0, tin.length) }}</b>{{ s.tin.slice(tin.length) }}</span>
              <span class="muted small">{{ s.circle }}</span>
            </button>
          </div>
          <div v-else-if="status === 'typing'" key="typing" class="hint small muted">Keep typing… {{ 12 - tin.length }} digits left</div>
        </transition>
      </div>

      <div v-else>
        <textarea
          v-model="bulkInput"
          class="bulk mono"
          rows="5"
          placeholder="Paste several TINs — one per line, or separated by commas"
          aria-label="TIN list"
        ></textarea>
        <div v-if="bulkResults.length" class="bulk-summary">
          <span><b>{{ bulkResults.length }}</b> checked</span>
          <span class="tag danger"><b>{{ bulkFound.length }}</b> on audit list</span>
          <span class="tag ok"><b>{{ bulkResults.length - bulkFound.length - bulkInvalid }}</b> not listed</span>
          <span v-if="bulkInvalid" class="tag warn"><b>{{ bulkInvalid }}</b> invalid</span>
          <button v-if="bulkFound.length" class="btn ghost sm" @click="downloadCsv(bulkFound.map((r) => r.rec), 'my-audit-matches.csv')">Export matches</button>
        </div>
        <ul v-if="bulkResults.length" class="bulk-list">
          <li v-for="r in bulkResults" :key="r.tin" :class="r.rec ? 'danger' : r.valid ? 'ok' : 'warn'">
            <span class="dot"></span>
            <span class="mono">{{ formatTin(r.tin) }}</span>
            <span class="grow"></span>
            <span v-if="r.rec">{{ r.rec.circle }} · #{{ r.rec.id }}</span>
            <span v-else-if="r.valid" class="muted">Not listed</span>
            <span v-else class="muted">Needs 12 digits</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats">
      <div class="stat card">
        <div class="stat-num">{{ total }}</div>
        <div class="stat-label">TINs selected</div>
      </div>
      <div class="stat card">
        <div class="stat-num">{{ circles.length }}</div>
        <div class="stat-label">Tax circles</div>
      </div>
      <div class="stat card">
        <div class="stat-num">{{ meta.year }}</div>
        <div class="stat-label">Assessment year</div>
      </div>
    </section>

    <section class="card">
      <div class="sec-head">
        <h2>By tax circle</h2>
        <span class="small muted">Click a circle to filter the list</span>
      </div>
      <div class="bars">
        <button
          v-for="c in circleStats"
          :key="c.name"
          class="bar"
          :class="{ on: circle === c.name }"
          @click="pickCircle(c.name)"
        >
          <span class="bar-name">{{ c.name }}</span>
          <span class="bar-track"><span class="bar-fill" :style="{ width: c.pct + '%' }"></span></span>
          <span class="bar-count">{{ c.count }}</span>
        </button>
      </div>
    </section>

    <!-- Full list -->
    <section id="list" class="card">
      <div class="sec-head">
        <h2>Full list</h2>
        <span class="small muted">{{ filtered.length }} of {{ total }}</span>
      </div>

      <div class="toolbar">
        <input v-model="query" class="field mono" inputmode="numeric" placeholder="Filter by any part of TIN" aria-label="Filter TIN" />
        <select v-model="circle" class="field" aria-label="Circle">
          <option value="">All circles</option>
          <option v-for="c in circles" :key="c" :value="c">{{ c }}</option>
        </select>
        <button class="btn ghost" @click="exportFiltered">Export CSV</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="col in [['id', '#'], ['tin', 'TIN'], ['circle', 'Circle']]" :key="col[0]">
                <button class="th" @click="setSort(col[0])">
                  {{ col[1] }}
                  <span class="arrow" :class="{ on: sortKey === col[0] }">{{ sortKey === col[0] && sortDir < 0 ? '↓' : '↑' }}</span>
                </button>
              </th>
              <th class="hide-sm">Zone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pageRows" :key="r.id">
              <td class="muted">{{ r.id }}</td>
              <td class="mono">
                <span v-for="(p, i) in highlight(r.tin)" :key="i" :class="{ hit: p.hit }">{{ p.text }}</span>
              </td>
              <td>{{ r.circle }}</td>
              <td class="hide-sm muted">{{ r.zone }}</td>
              <td class="right">
                <button class="copy" :class="{ done: copied === r.tin }" @click="copy(r.tin)">
                  {{ copied === r.tin ? 'Copied' : 'Copy' }}
                </button>
              </td>
            </tr>
            <tr v-if="!pageRows.length">
              <td colspan="5" class="empty">No TIN matches this filter.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pages > 1" class="pager">
        <button class="btn ghost sm" :disabled="page === 1" @click="page--">‹ Prev</button>
        <span class="small muted">Page {{ page }} of {{ pages }}</span>
        <button class="btn ghost sm" :disabled="page === pages" @click="page++">Next ›</button>
      </div>
    </section>

    <footer class="foot small muted">
      Data taken from the published PDF list (AY {{ meta.year }}, {{ meta.zone }} zone, {{ total }} TINs).
      Unofficial helper tool — confirm with your tax circle office.
    </footer>
  </main>
</template>

<style scoped>
.wrap { max-width: 980px; margin: 0 auto; padding: 0 16px; }

.top { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); }
.top-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; padding-bottom: 12px; }
.brand { display: flex; align-items: center; gap: 12px; }
.logo { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--brand); color: #fff; }
.brand-title { font-weight: 700; }
.brand-sub { font-size: 13px; color: var(--muted); }
.pills { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.pill { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--brand-soft); color: var(--brand); white-space: nowrap; }

main.wrap { padding-top: 28px; padding-bottom: 40px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }

.hero { padding: 28px; }
.hero h1 { font-size: clamp(22px, 4vw, 30px); line-height: 1.2; margin: 0 0 6px; letter-spacing: -0.01em; }
.muted { color: var(--muted); }
.small { font-size: 13px; }
.hero-head p { margin: 0 0 18px; }

.tabs { display: inline-flex; background: var(--surface-2); border-radius: 10px; padding: 4px; margin-bottom: 14px; }
.tabs button { border: 0; background: none; padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 14px; color: var(--muted); }
.tabs button.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }

.search { display: flex; align-items: center; gap: 10px; border: 2px solid var(--border); border-radius: 14px; padding: 0 14px; background: var(--surface); transition: border-color .15s; color: var(--muted); }
.search:focus-within { border-color: var(--brand); }
.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font-size: clamp(18px, 4vw, 24px); padding: 14px 0; color: var(--text); }
.count { font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--surface-2); }
.count.full { background: var(--brand-soft); color: var(--brand); }
.clear { border: 0; background: none; font-size: 24px; line-height: 1; color: var(--muted); padding: 4px; }

.result { display: flex; gap: 16px; margin-top: 16px; padding: 18px; border-radius: 14px; border: 1px solid; }
.result.danger { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 35%, transparent); }
.result.ok { background: var(--ok-soft); border-color: color-mix(in srgb, var(--ok) 35%, transparent); }
.result.warn { background: var(--warn-soft); border-color: color-mix(in srgb, var(--warn) 35%, transparent); }
.result-icon { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 20px; }
.danger .result-icon { background: var(--danger); }
.ok .result-icon { background: var(--ok); }
.warn .result-icon { background: var(--warn); }
.result-body { flex: 1; min-width: 0; }
.result-title { font-weight: 700; font-size: 18px; }
.danger .result-title { color: var(--danger); }
.ok .result-title { color: var(--ok); }
.warn .result-title { color: var(--warn); }
.result-sub { margin-bottom: 8px; }
.result p { margin: 4px 0 0; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px 20px; margin: 10px 0 0; }
.facts dt { font-size: 12px; color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }

.hint { margin-top: 12px; }
.suggest { margin-top: 12px; display: grid; gap: 6px; }
.sugg-item { display: flex; justify-content: space-between; gap: 12px; text-align: left; border: 1px solid var(--border); background: var(--surface-2); border-radius: 10px; padding: 8px 12px; }
.sugg-item:hover { border-color: var(--brand); }

.bulk { width: 100%; border: 2px solid var(--border); border-radius: 14px; padding: 12px 14px; background: var(--surface); resize: vertical; outline: 0; font-size: 15px; }
.bulk:focus { border-color: var(--brand); }
.bulk-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0; font-size: 14px; }
.tag { padding: 2px 10px; border-radius: 999px; font-size: 13px; }
.tag.danger { background: var(--danger-soft); color: var(--danger); }
.tag.ok { background: var(--ok-soft); color: var(--ok); }
.tag.warn { background: var(--warn-soft); color: var(--warn); }
.bulk-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: 12px; max-height: 320px; overflow: auto; }
.bulk-list li { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 14px; flex-wrap: wrap; }
.bulk-list li:last-child { border-bottom: 0; }
.bulk-list li.danger { background: var(--danger-soft); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.danger .dot { background: var(--danger); }
.ok .dot { background: var(--ok); }
.warn .dot { background: var(--warn); }
.grow { flex: 1; }

.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.stat { min-width: 0; }
.stat { padding: 16px 20px; }
.stat-num { font-size: clamp(20px, 4vw, 28px); font-weight: 700; color: var(--brand); }
.stat-label { font-size: 13px; color: var(--muted); }

.sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
h2 { font-size: 18px; margin: 0; }

.bars { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 4px 24px; }
.bar { display: grid; grid-template-columns: 170px minmax(0, 1fr) 32px; align-items: center; gap: 10px; border: 0; background: none; padding: 6px 8px; border-radius: 8px; text-align: left; font-size: 13px; }
.bar:hover { background: var(--surface-2); }
.bar.on { background: var(--brand-soft); }
.bar-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
.bar.on .bar-track { background: var(--surface); }
.bar-fill { display: block; height: 100%; background: var(--brand); border-radius: 4px; }
.bar-count { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }

.toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.field { border: 1px solid var(--border); background: var(--surface); border-radius: 10px; padding: 9px 12px; outline: 0; min-width: 0; }
.field:focus { border-color: var(--brand); }
.toolbar input { flex: 1 1 220px; }
.toolbar select { flex: 0 1 220px; }

.btn { border-radius: 10px; padding: 9px 14px; font-weight: 600; font-size: 14px; border: 1px solid var(--border); }
.btn.ghost { background: var(--surface); }
.btn.ghost:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.btn.sm { padding: 5px 12px; font-size: 13px; }
.btn:disabled { opacity: .45; cursor: default; }

.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--surface-2); }
th { background: var(--surface-2); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.th { border: 0; background: none; padding: 0; font: inherit; color: inherit; text-transform: inherit; letter-spacing: inherit; display: inline-flex; gap: 4px; }
.arrow { opacity: .25; }
.arrow.on { opacity: 1; color: var(--brand); }
.hit { background: color-mix(in srgb, var(--brand) 22%, transparent); color: var(--text); border-radius: 3px; }
.right { text-align: right; }
.copy { border: 1px solid var(--border); background: none; border-radius: 6px; font-size: 12px; padding: 2px 8px; color: var(--muted); }
.copy:hover { color: var(--brand); border-color: var(--brand); }
.copy.done { color: var(--ok); border-color: var(--ok); }
.empty { text-align: center; padding: 28px; color: var(--muted); }

.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }

.foot { text-align: center; padding: 8px 0; }

.pop-enter-active, .pop-leave-active { transition: all .18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(4px); }

@media (max-width: 600px) {
  .hero { padding: 20px; }
  .card { padding: 16px; }
  .stats { gap: 8px; }
  .stat { padding: 12px; }
  .bars { grid-template-columns: 1fr; }
  .bar { grid-template-columns: 128px minmax(0, 1fr) 28px; }
  .stat-num { font-size: 18px; }
  .stat-label { font-size: 12px; }
  .hide-sm { display: none; }
  .result { gap: 12px; padding: 14px; }
  .result-icon { width: 32px; height: 32px; font-size: 16px; }
  .facts { grid-template-columns: 1fr 1fr; }
  .facts > div:first-child { grid-column: 1 / -1; }
  th, td { padding: 9px 10px; }
  .pills .pill:last-child { display: none; }
}
</style>

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Auto-format phone numbers to the (555) 555-5555 US pattern as the user types.
// Strips all non-digits, caps at 10 digits, then reflows into parens + dash.
function formatPhone(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length < 4) return `(${d}`
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// Convert "HH:mm" 24h (from <input type="time">) to "H:MM AM/PM" for display.
function formatTime12h(hhmm) {
  if (!hhmm) return null
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = m.toString().padStart(2, '0')
  return `${h12}:${mm} ${ampm}`
}

// Turn a course's booking window + opens-at time into a user-facing pill string.
// Returns null when no window is set.
function formatBookingLabel(days, time) {
  if (days === null || days === undefined) return null
  const t = formatTime12h(time)
  if (days === 0) return t ? `Same-day booking at ${t}` : 'Same-day booking'
  const base = `Books ${days} day${days === 1 ? '' : 's'} out`
  return t ? `${base} at ${t}` : base
}

// Initial/empty state for the edit form. Keeping this as a helper so we reset
// every field in exactly one place (add, cancel, after save all use this).
const EMPTY_FORM = {
  name: '',
  notes: '',
  tee_time_url: '',
  phone: '',
  booking_window_days: null,
  booking_opens_time: '',
  booking_notes: '',
}

// Preset buttons for the Booking Window segmented control. `null` = "Not set".
const BOOKING_PRESETS = [
  { label: 'Not set', value: null },
  { label: 'Same day', value: 0 },
  { label: '3 days', value: 3 },
  { label: '5 days', value: 5 },
  { label: '7 days', value: 7 },
]

// Preset buttons for the Booking Opens At segmented control. Covers the two
// times that account for ~95% of Florida courses; anything else lives under
// "Other" (shows an hour dropdown) or in Booking Notes (phone-only, etc).
const BOOKING_TIME_PRESETS = [
  { label: 'Not set', value: '' },
  { label: 'Midnight', value: '00:00' },
  { label: '6 AM', value: '06:00' },
]

// 24 hourly options in 12-hour format. Values stay "HH:mm" 24h for the DB,
// labels are what the user sees. We only offer :00 marks — no golf course
// has ever said "booking opens at 6:17 AM."
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hh = h.toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  let label = `${h12}:00 ${ampm}`
  if (h === 0) label = '12:00 AM (Midnight)'
  if (h === 12) label = '12:00 PM (Noon)'
  return { value: `${hh}:00`, label }
})

export default function CoursesPage() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  // When true, the Booking Window segmented control switches to a numeric
  // input. Tracked separately so a custom value like 14 doesn't re-match a
  // preset by coincidence.
  const [useCustomWindow, setUseCustomWindow] = useState(false)
  // Same pattern for the time picker: most courses are Midnight or 6 AM, so
  // those are one-tap presets. Anything else shows the <input type="time">.
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      loadCourses(session.user.id)
    }
    init()
  }, [])

  async function loadCourses(userId) {
    setLoading(true)
    const { data } = await supabase
      .from('saved_courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setCourses(data)
    setLoading(false)
  }

  async function saveCourse() {
    if (!form.name.trim()) return
    setSaving(true)
    // Normalize booking fields: empty time string → null in DB so the column
    // stays truly "not set" rather than storing "".
    const bookingPayload = {
      booking_window_days:
        form.booking_window_days === null || form.booking_window_days === undefined
          ? null
          : Math.max(0, parseInt(form.booking_window_days, 10)),
      booking_opens_time: form.booking_opens_time || null,
      booking_notes: form.booking_notes || null,
    }
    if (editingId) {
      await supabase.from('saved_courses').update({
        name: form.name,
        notes: form.notes,
        tee_time_url: form.tee_time_url,
        phone: form.phone || '',
        ...bookingPayload,
      }).eq('id', editingId)
    } else {
      await supabase.from('saved_courses').insert({
        user_id: user.id,
        name: form.name,
        notes: form.notes,
        tee_time_url: form.tee_time_url,
        phone: form.phone || '',
        ...bookingPayload,
      })
    }
    setForm(EMPTY_FORM)
    setUseCustomWindow(false)
    setUseCustomTime(false)
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    loadCourses(user.id)
  }

  async function deleteCourse(id) {
    await supabase.from('saved_courses').delete().eq('id', id)
    loadCourses(user.id)
  }

  function startEdit(course) {
    const days = course.booking_window_days
    const hasDays = days !== null && days !== undefined
    // Switch to Custom mode if the saved value isn't one of our presets —
    // e.g. a course with a 14-day window shouldn't silently snap to a preset.
    const presetValues = BOOKING_PRESETS.map(p => p.value)
    setUseCustomWindow(hasDays && !presetValues.includes(days))
    // Mirror the same preset-detection logic for the opens-at time.
    const timeVal = course.booking_opens_time || ''
    const timePresetValues = BOOKING_TIME_PRESETS.map(p => p.value)
    setUseCustomTime(!!timeVal && !timePresetValues.includes(timeVal))
    setForm({
      name: course.name,
      notes: course.notes || '',
      tee_time_url: course.tee_time_url || '',
      phone: course.phone || '',
      booking_window_days: hasDays ? days : null,
      booking_opens_time: course.booking_opens_time || '',
      booking_notes: course.booking_notes || '',
    })
    setEditingId(course.id)
    setShowForm(true)
  }

  function cancelForm() {
    setForm(EMPTY_FORM)
    setUseCustomWindow(false)
    setUseCustomTime(false)
    setEditingId(null)
    setShowForm(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed header — locked at the top on every scroll, including iOS
          Safari where `sticky` inside a flex-col body can drift. */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/clubhouse" className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0" aria-label="Back to Clubhouse">← Clubhouse</a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">🏠</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Home Courses</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight">Notes, tips &amp; tee times</p>
            </div>
          </div>
          <a href="/bag" className="text-3xl shrink-0 hover:scale-110 transition-transform leading-none" aria-label="Your Golf Bag" title="Your Golf Bag">🏌️</a>
        </div>
      </header>
      {/* Spacer to offset fixed header height (py-3 + line-height ≈ 60px). */}
      <div className="h-[60px]" aria-hidden="true" />

      <main className="max-w-4xl mx-auto px-4 py-5">
        <div className="text-center px-2 mb-4">
          <p className="text-sm font-semibold text-gray-700 leading-snug">
            Your home courses, always within reach.
          </p>
          <p className="text-xs text-gray-500 leading-snug mt-0.5">
            Save favorite courses with notes, phone numbers, and tee time links — ready the next time you play.
          </p>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setUseCustomWindow(false); setUseCustomTime(false) }}
            className="mt-2 text-xs font-semibold text-green-700 hover:text-green-900 hover:underline"
          >
            + Add Course
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-5 border-2 border-green-200 rounded-2xl bg-green-50">
            <h3 className="font-bold text-gray-900 mb-4">{editingId ? 'Edit Course' : 'Add a Course'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Pelican Sound Golf Club"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <a
                href={form.name.trim() ? `https://www.google.com/search?q=${encodeURIComponent(form.name + ' tee time booking')}` : '#'}
                target={form.name.trim() ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-sm font-semibold ${form.name.trim() ? 'text-green-700 hover:text-green-900' : 'text-gray-300 pointer-events-none'}`}
              >
                <span>🔍 {form.name.trim() ? "Search tee times for " + form.name : "Type a course name above"}</span>
              </a>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Course tips, favorite holes, yardages, conditions..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  placeholder="(555) 555-5555"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tee Time Link</label>
                <input
                  type="url"
                  value={form.tee_time_url}
                  onChange={e => setForm(f => ({ ...f, tee_time_url: e.target.value }))}
                  placeholder="Paste tee time booking URL here"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              {/* Booking Rules — a small self-contained block inside the form.
                  Saved to saved_courses.booking_window_days / _opens_time / _notes. */}
              <div className="pt-2 border-t border-green-200">
                <h4 className="text-sm font-bold text-gray-900 mb-1">📅 Booking Rules</h4>
                <p className="text-xs text-gray-500 mb-3">Never miss a tee-time window again.</p>

                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Window</label>
                <p className="text-xs text-gray-500 mb-2">How many days out does this course let you book?</p>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_PRESETS.map(opt => {
                    const isActive = !useCustomWindow && form.booking_window_days === opt.value
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          setUseCustomWindow(false)
                          setForm(f => ({ ...f, booking_window_days: opt.value }))
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                          isActive
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomWindow(true)
                      // Preserve any existing custom value; otherwise seed with null
                      // so the number input starts empty.
                      const presetValues = BOOKING_PRESETS.map(p => p.value)
                      setForm(f => ({
                        ...f,
                        booking_window_days: presetValues.includes(f.booking_window_days) ? null : f.booking_window_days,
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                      useCustomWindow
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {useCustomWindow && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={form.booking_window_days ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        setForm(f => ({
                          ...f,
                          booking_window_days: v === '' ? null : Math.max(0, parseInt(v, 10) || 0),
                        }))
                      }}
                      placeholder="Days in advance"
                      className="w-40 border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Opens At</label>
                  <p className="text-xs text-gray-500 mb-2">Most courses open at midnight or 6 AM. Anything else, use Other — or drop phone-only rules in the notes below.</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_TIME_PRESETS.map(opt => {
                      const isActive = !useCustomTime && (form.booking_opens_time || '') === opt.value
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setUseCustomTime(false)
                            setForm(f => ({ ...f, booking_opens_time: opt.value }))
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                            isActive
                              ? 'bg-green-700 text-white border-green-700'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomTime(true)
                        // If current value matches a preset, clear it so the
                        // custom picker starts fresh. Otherwise keep it.
                        const timePresetValues = BOOKING_TIME_PRESETS.map(p => p.value)
                        setForm(f => ({
                          ...f,
                          booking_opens_time: timePresetValues.includes(f.booking_opens_time || '')
                            ? ''
                            : f.booking_opens_time,
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                        useCustomTime
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  {useCustomTime && (
                    <div className="mt-2">
                      <select
                        value={form.booking_opens_time || ''}
                        onChange={e => setForm(f => ({ ...f, booking_opens_time: e.target.value }))}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                      >
                        <option value="">— Pick a time —</option>
                        {HOUR_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Notes</label>
                  <textarea
                    value={form.booking_notes || ''}
                    onChange={e => setForm(f => ({ ...f, booking_notes: e.target.value.slice(0, 1000) }))}
                    placeholder="Member priority, phone-only, any extra booking quirks..."
                    rows={2}
                    maxLength={1000}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{(form.booking_notes || '').length}/1000</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveCourse}
                  disabled={saving || !form.name.trim()}
                  className="px-6 py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Course' : 'Save Course'}
                </button>
                <button onClick={cancelForm} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-gray-200 border-l-8 border-l-green-600 bg-white hover:border-green-300 hover:shadow-sm transition-all">
            <p className="text-3xl mb-2">🏌️</p>
            <p className="text-gray-500 font-medium">No courses saved yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your favorite courses to keep notes and tee time links handy</p>
            <button onClick={() => setShowForm(true)} className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">+ Add your first course</button>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="p-5 rounded-2xl border-2 border-gray-200 border-l-8 border-l-green-600 bg-white hover:border-green-300 hover:bg-green-50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3
                      className="font-bold text-gray-900 text-lg cursor-pointer hover:text-green-700 transition-colors"
                      onClick={() => startEdit(course)}
                    >
                      {course.name}
                    </h3>

                    {/* Booking window pill — only shown when the user has set one.
                        Reminds the golfer "Books 7 days out at 12:00 AM" so they
                        don't miss the midnight drop during in-season. */}
                    {(() => {
                      const label = formatBookingLabel(course.booking_window_days, course.booking_opens_time)
                      if (!label) return null
                      return (
                        <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          📅 {label}
                        </span>
                      )
                    })()}

                    {/* Phone number — clickable tel: link */}
                    {course.phone && (
                      <a
                        href={`tel:${course.phone.replace(/\D/g, '')}`}
                        className="inline-flex items-center gap-1.5 mt-3 text-sm text-green-700 font-semibold hover:text-green-900"
                      >
                        📞 {course.phone}
                      </a>
                    )}

                    {course.notes && (
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">{course.notes}</p>
                    )}

                    {course.booking_notes && (
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">
                        <span className="font-semibold text-gray-700">📅 Booking: </span>
                        {course.booking_notes}
                      </p>
                    )}

                    {course.tee_time_url && (
                      <a
                        href={course.tee_time_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 ml-4 mt-3 text-sm text-green-700 font-semibold hover:text-green-900"
                      >
                        🕐 Book Tee Time →
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 items-end shrink-0">
                    <button onClick={() => startEdit(course)} className="text-sm font-medium text-gray-500 hover:text-gray-700">Edit</button>
                    <button onClick={() => deleteCourse(course.id)} className="text-sm font-medium text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
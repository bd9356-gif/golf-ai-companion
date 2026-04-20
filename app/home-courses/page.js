'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function CoursesPage() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', notes: '', tee_time_url: '', phone: '' })
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
    if (editingId) {
      await supabase.from('saved_courses').update({
        name: form.name,
        notes: form.notes,
        tee_time_url: form.tee_time_url,
        phone: form.phone || '',
      }).eq('id', editingId)
    } else {
      await supabase.from('saved_courses').insert({
        user_id: user.id,
        name: form.name,
        notes: form.notes,
        tee_time_url: form.tee_time_url,
        phone: form.phone || '',
      })
    }
    setForm({ name: '', notes: '', tee_time_url: '', phone: '' })
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
    setForm({
      name: course.name,
      notes: course.notes || '',
      tee_time_url: course.tee_time_url || '',
      phone: course.phone || '',
    })
    setEditingId(course.id)
    setShowForm(true)
  }

  function cancelForm() {
    setForm({ name: '', notes: '', tee_time_url: '', phone: '' })
    setEditingId(null)
    setShowForm(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/clubhouse" className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0" aria-label="Back to Clubhouse">← Clubhouse</a>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">🏠</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">Your Home Courses</h1>
              <p className="text-xs text-green-700 font-semibold leading-tight">Notes, tips &amp; tee times</p>
            </div>
          </div>
          <a href="/bag" className="text-sm text-gray-500 hover:text-gray-800 shrink-0" aria-label="Your Golf Bag">🏌️</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <p className="text-gray-500 flex-1">Save your favorite courses — notes, tips, and tee time links all in one place.</p>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', notes: '', tee_time_url: '', phone: '' }) }}
            className="shrink-0 text-sm font-semibold text-green-700 border-2 border-green-700 rounded-xl px-4 py-2 hover:bg-green-50 transition-colors"
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
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. (239) 555-1234"
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
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
            <p className="text-3xl mb-2">🏌️</p>
            <p className="text-gray-500 font-medium">No courses saved yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your favorite courses to keep notes and tee time links handy</p>
            <button onClick={() => setShowForm(true)} className="mt-4 inline-block text-sm text-green-700 font-semibold hover:underline">+ Add your first course</button>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="border border-gray-200 rounded-xl p-5 hover:border-green-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3
                      className="font-bold text-gray-900 text-lg cursor-pointer hover:text-green-700 transition-colors"
                      onClick={() => startEdit(course)}
                    >
                      {course.name}
                    </h3>

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

                    {course.tee_time_url && (
                      <a
                        href={course.tee_time_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-5 text-sm text-green-700 font-semibold hover:text-green-900"
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
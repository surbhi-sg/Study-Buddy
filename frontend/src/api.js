// Every request to the backend goes through this file.
// While P3's backend isn't ready, USE_MOCK = true returns data from src/mocks/.
// On integration day, set it to false — no page needs to change.
const USE_MOCK = true

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`)
  return body
}

async function mock(file) {
  await delay(300) // so you can see the loading state
  return (await import(`./mocks/${file}.json`)).default
}

export async function getDashboard() {
  return USE_MOCK ? mock('dashboard') : request('/dashboard')
}

export async function getSubjects() {
  return USE_MOCK ? mock('subjects') : request('/subjects')
}

export async function getGroups() {
  return USE_MOCK ? mock('groups') : request('/groups')
}

export async function getProfile() {
  return USE_MOCK ? mock('profile') : request('/profile')
}

// Ranked list of possible study buddies for a subject on a date.
export async function findBuddy(subjectId, date) {
  if (USE_MOCK) return mock('findBuddy')
  return request(`/match/buddies?subject_id=${subjectId}&date=${date}`)
}

// Pair me with the chosen student: creates a 2-person group + one session (one transaction on the backend).
export async function createPair({ buddyId, subjectId, date, slot }) {
  if (USE_MOCK) {
    await delay(500)
    return { group_id: 31, session_id: 640, status: 'created' }
  }
  return request('/match/pair', {
    method: 'POST',
    body: JSON.stringify({ buddy_id: buddyId, subject_id: subjectId, date, start_time: slot.start_time, end_time: slot.end_time }),
  })
}

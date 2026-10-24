// One accent colour per subject, used for borders, tags and progress bars.
const colors = {
  Mathematics: { border: 'border-b-primary', tag: 'bg-primary-100 text-primary', bar: 'bg-primary' },
  DBMS: { border: 'border-b-success', tag: 'bg-[#DDF7E6] text-[#1E8A4C]', bar: 'bg-success' },
  'Operating Systems': { border: 'border-b-secondary', tag: 'bg-secondary-100 text-[#B86A00]', bar: 'bg-secondary' },
  'Computer Networks': { border: 'border-b-info', tag: 'bg-[#DCE8FF] text-info', bar: 'bg-info' },
  DSA: { border: 'border-b-error', tag: 'bg-[#FDE2E2] text-[#C03A3A]', bar: 'bg-error' },
}
const fallback = { border: 'border-b-primary-300', tag: 'bg-primary-50 text-primary', bar: 'bg-primary-300' }
export const subjectColor = (name) => colors[name] || fallback

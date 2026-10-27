const palette = [
  'bg-primary-100 text-primary',
  'bg-secondary-100 text-[#B86A00]',
  'bg-[#DDF7E6] text-[#1E8A4C]',
  'bg-[#FDE2E2] text-[#C03A3A]',
  'bg-[#DCE8FF] text-info',
]

export default function Avatar({ name, id = 0, size = 'h-11 w-11 text-sm' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <div className={`${size} ${palette[id % palette.length]} grid shrink-0 place-items-center rounded-full font-bold`}>
      {initials}
    </div>
  )
}

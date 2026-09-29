import Reveal from './Reveal'

export default function SectionHeading({ eyebrow, title, description, align = 'center', className = '' }) {
  const alignment = align === 'center' ? 'mx-auto text-center items-center' : 'text-left items-start'
  return (
    <div className={`flex max-w-3xl flex-col gap-5 ${alignment} ${className}`}>
      {eyebrow && (
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-nova-300">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-nova-400" />
            {eyebrow}
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-nova-400" />
          </span>
        </Reveal>
      )}
      <Reveal delay={80}>
        <h2 className="text-gradient text-balance text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={160}>
          <p className="text-balance text-base leading-relaxed text-slate-400 sm:text-lg">{description}</p>
        </Reveal>
      )}
    </div>
  )
}

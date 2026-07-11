'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'

const promotions = [
  {
    title: 'Starter kits',
    description: 'Equipos para entrar rápido con bundles atractivos.',
    tone: 'from-[#ece7ff] to-[#d8d3ff]',
  },
  {
    title: 'Liquids top',
    description: 'Sabores más vendidos con rotación constante.',
    tone: 'from-[#efe4ff] to-[#d8ccff]',
  },
  {
    title: 'Pods y coils',
    description: 'Accesorios de reposición y compra recurrente.',
    tone: 'from-[#e7f0ff] to-[#d7e0ff]',
  },
  {
    title: 'Descuentos flash',
    description: 'Ofertas por tiempo limitado para empujar conversión.',
    tone: 'from-[#f1e9ff] to-[#dfd8ff]',
  },
]

export default function Content() {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleNext = () => {
    scrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })
  }

  return (
    <section id="shop" className="space-y-8 rounded-[2rem] bg-white px-1 py-2">
      <div id="promotions" className="flex flex-col items-center gap-2 text-center">
        <p className="text-[0.8rem] font-black uppercase tracking-[0.4em] text-[#1f2a9b]">
          Directo a las
        </p>

        <h1 className="text-5xl font-black uppercase tracking-[0.03em] text-[#1f2a9b] sm:text-7xl">
          Promociones
        </h1>

      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 pr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {promotions.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className={`min-w-[260px] flex-1 rounded-[1.6rem] border border-white/70 bg-gradient-to-br ${item.tone} p-5 shadow-[0_18px_40px_rgba(31,42,155,0.14)] sm:min-w-[300px]`}
            >
              <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[1.25rem] border border-white/70 bg-white/30 p-5 backdrop-blur-sm">
                <div className="space-y-3">
                  <span className="inline-flex rounded-full bg-[#1f2a9b] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.25em] text-white">
                    Promo
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-[0.12em] text-[#1f2a9b]">{item.title}</h3>
                  <p className="max-w-xs text-sm leading-6 text-slate-700">{item.description}</p>
                </div>

                <div className="flex items-center justify-between pt-6">
                  <div className="h-14 w-14 rounded-full border border-[#1f2a9b]/15 bg-white/70 shadow-inner" />
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#1f2a9b]">Ver más</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Desplazar promociones"
          className="absolute right-0 top-1/2 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white text-[#1f2a9b] shadow-[0_14px_30px_rgba(31,42,155,0.16)] transition hover:-translate-y-[calc(50%+2px)] hover:bg-[#f1efff]"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="#shop"
          className="inline-flex items-center rounded-full border border-[#d8d3ff] bg-white px-8 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#1f2a9b] shadow-[0_12px_28px_rgba(31,42,155,0.1)] transition hover:-translate-y-0.5 hover:border-[#1f2a9b]"
        >
          Ver más
        </Link>
      </div>
    </section>
  )
}
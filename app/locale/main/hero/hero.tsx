'use client'

import Navbar from '@/app/components/navbar/navbar'
import HeroBG from './heroBG'
import HeroContent from './heroContent'

export default function Hero() {
  return (
    <>
      {/* Animacion levadiza anterior, por si se quiere reactivar:
          <motion.div
            initial={false}
            animate={showNavbar ? 'open' : 'closed'}
            variants={{
              open: { y: 0, opacity: 1, pointerEvents: 'auto' },
              closed: { y: '-100%', opacity: 0, pointerEvents: 'none' },
            }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-0 z-[60]"
          >
            <Navbar />
          </motion.div>
      */}
      <div className="fixed inset-x-0 top-0 z-[60]">
        <Navbar />
      </div>

      <section id="about" className="w-full overflow-hidden bg-[#120f2b]">
        <div className="relative min-h-[640px] w-full lg:min-h-[640px]">
          <HeroBG />
          <HeroContent />
        </div>
      </section>
    </>
  )
}

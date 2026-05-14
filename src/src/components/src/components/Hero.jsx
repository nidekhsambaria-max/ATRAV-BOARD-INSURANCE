import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">

      <div className="absolute w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] rounded-full top-[-100px] left-[-100px]" />

      <div className="absolute w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px]" />

      <div className="max-w-5xl mx-auto text-center z-10">

        <motion.h1
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-7xl font-extrabold leading-tight"
        >
          Smart Travel
          <span className="block text-cyan-400">
            Insurance Platform
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-slate-300 text-lg max-w-2xl mx-auto"
        >
          AI-powered protection for modern travelers.
          Secure your trips, documents, and adventures in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-col md:flex-row gap-4 justify-center"
        >
          <button className="bg-cyan-400 text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition">
            Explore Plans
          </button>

          <button className="border border-white/20 px-8 py-4 rounded-full hover:bg-white/10 transition">
            Learn More
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

import { motion } from "framer-motion";
import { Menu } from "lucide-react";

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-lg bg-white/5 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-wide">
          AWAARA
        </h1>

        <div className="hidden md:flex gap-8 text-sm font-medium">
          <a href="#">Home</a>
          <a href="#">Insurance</a>
          <a href="#">Travel</a>
          <a href="#">Support</a>
        </div>

        <button className="bg-white text-black px-5 py-2 rounded-full font-semibold hover:scale-105 transition">
          Get Started
        </button>

        <button className="md:hidden">
          <Menu />
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;

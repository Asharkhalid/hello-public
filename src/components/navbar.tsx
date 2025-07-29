"use client"

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppleHelloEnglishEffect } from "@/components/animated-logo"
import { ModeToggle } from "@/components/mode-toggle"
import { NavbarUserButton } from "@/components/navbar-user-button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = authClient.useSession()

  const toggleMenu = () => setIsOpen(!isOpen)

  const baseNavItems = [
    { name: "Home", href: "/" },
    { name: "Library", href: "/agents" }
  ]

  // Add Meetings tab only if user is logged in
  const navItems = session?.user 
    ? [...baseNavItems, { name: "Meetings", href: "/meetings" }]
    : baseNavItems

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === "/") return "Home"
    if (pathname.startsWith("/agents")) return "Library"
    if (pathname.startsWith("/meetings")) return "Meetings"
    return "Home"
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex justify-center w-full py-6 px-4">
      <div className="flex items-center justify-between px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full shadow-lg border w-full max-w-4xl relative z-10">
        {/* Left - Animated Logo */}
        <div className="flex items-center">
          <Link href="/">
            <motion.div
              className="mr-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <AppleHelloEnglishEffect speed={3} className="h-8" />
            </motion.div>
          </Link>
        </div>
        
        {/* Desktop Navigation - Middle with Tubelight Effect */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.name

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                  "text-foreground/80 hover:text-primary",
                  isActive && "text-primary"
                )}
              >
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="lamp"
                    className="absolute inset-0 w-full bg-primary/10 rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                      <div className="absolute w-12 h-6 bg-primary/30 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-primary/40 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-primary/30 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right - Mode Toggle + User Button */}
        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <NavbarUserButton />
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <motion.button 
          className="md:hidden flex items-center" 
          onClick={toggleMenu} 
          whileTap={{ scale: 0.9 }}
        >
          <Menu className="h-6 w-6 text-foreground" />
        </motion.button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-background z-50 pt-24 px-6 md:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute top-6 right-6 p-2"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <X className="h-6 w-6 text-foreground" />
            </motion.button>
            <div className="flex flex-col space-y-6">
              {navItems.map((item, i) => {
                const isActive = activeTab === item.name
                
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.1 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="relative"
                  >
                    <Link 
                      href={item.href} 
                      className={cn(
                        "text-base font-medium block py-2 px-4 rounded-lg transition-colors",
                        isActive ? "text-primary bg-primary/10" : "text-foreground"
                      )}
                      onClick={toggleMenu}
                    >
                      {item.name}
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </Link>
                  </motion.div>
                )
              })}

              <div className="flex items-center justify-between pt-4">
                <ModeToggle />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                exit={{ opacity: 0, y: 20 }}
                className="pt-2"
              >
                <NavbarUserButton onMobileMenuClose={toggleMenu} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Navbar } 
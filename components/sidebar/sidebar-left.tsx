"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavFavorites } from "@/components/sidebar/nav-favorites"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import { NavWorkspaces } from "@/components/sidebar/nav-workspaces"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { CommandIcon, AudioWave01Icon, SearchIcon, SparklesIcon, HomeIcon, InboxIcon, CalendarIcon, Settings05Icon, CubeIcon, Delete02Icon, MessageQuestionIcon, BriefcaseIcon } from "@hugeicons/core-free-icons"

// This is sample data.
const data = {
  teams: [
    {
      name: "Acme Inc",
      logo: (
        <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
      ),
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: (
        <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
      ),
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Search",
      url: "#",
      icon: (
        <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Ask AI",
      url: "#",
      icon: (
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Home",
      url: "/dashboard",
      icon: (
        <HugeiconsIcon icon={HomeIcon} strokeWidth={2} />
      ),
    },
    {
      title: "Inbox",
      url: "#",
      icon: (
        <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Job Hunt",
      url: "/applications",
      icon: (
        <HugeiconsIcon icon={BriefcaseIcon} strokeWidth={2} />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Calendar",
      url: "#",
      icon: (
        <HugeiconsIcon icon={CalendarIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Templates",
      url: "#",
      icon: (
        <HugeiconsIcon icon={CubeIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Trash",
      url: "#",
      icon: (
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      ),
      disabled: true,
    },
    {
      title: "Help",
      url: "#",
      icon: (
        <HugeiconsIcon icon={MessageQuestionIcon} strokeWidth={2} />
      ),
      disabled: true,
    },
  ],
  favorites: [
    {
      name: "Project Management & Task Tracking",
      url: "#",
      emoji: "📊",
    },
    {
      name: "Family Recipe Collection & Meal Planning",
      url: "#",
      emoji: "🍳",
    },
    {
      name: "Fitness Tracker & Workout Routines",
      url: "#",
      emoji: "💪",
    },
    {
      name: "Book Notes & Reading List",
      url: "#",
      emoji: "📚",
    },
    {
      name: "Sustainable Gardening Tips & Plant Care",
      url: "#",
      emoji: "🌱",
    },
    {
      name: "Language Learning Progress & Resources",
      url: "#",
      emoji: "🗣️",
    },
    {
      name: "Home Renovation Ideas & Budget Tracker",
      url: "#",
      emoji: "🏠",
    },
    {
      name: "Personal Finance & Investment Portfolio",
      url: "#",
      emoji: "💰",
    },
    {
      name: "Movie & TV Show Watchlist with Reviews",
      url: "#",
      emoji: "🎬",
    },
    {
      name: "Daily Habit Tracker & Goal Setting",
      url: "#",
      emoji: "✅",
    },
  ],
  workspaces: [
    {
      name: "Personal Life Management",
      emoji: "🏠",
      pages: [
        {
          name: "Daily Journal & Reflection",
          url: "#",
          emoji: "📔",
        },
        {
          name: "Health & Wellness Tracker",
          url: "#",
          emoji: "🍏",
        },
        {
          name: "Personal Growth & Learning Goals",
          url: "#",
          emoji: "🌟",
        },
      ],
    },
    {
      name: "Professional Development",
      emoji: "💼",
      pages: [
        {
          name: "Career Objectives & Milestones",
          url: "#",
          emoji: "🎯",
        },
        {
          name: "Skill Acquisition & Training Log",
          url: "#",
          emoji: "🧠",
        },
        {
          name: "Networking Contacts & Events",
          url: "#",
          emoji: "🤝",
        },
      ],
    },
    {
      name: "Creative Projects",
      emoji: "🎨",
      pages: [
        {
          name: "Writing Ideas & Story Outlines",
          url: "#",
          emoji: "✍️",
        },
        {
          name: "Art & Design Portfolio",
          url: "#",
          emoji: "🖼️",
        },
        {
          name: "Music Composition & Practice Log",
          url: "#",
          emoji: "🎵",
        },
      ],
    },
    {
      name: "Home Management",
      emoji: "🏡",
      pages: [
        {
          name: "Household Budget & Expense Tracking",
          url: "#",
          emoji: "💰",
        },
        {
          name: "Home Maintenance Schedule & Tasks",
          url: "#",
          emoji: "🔧",
        },
        {
          name: "Family Calendar & Event Planning",
          url: "#",
          emoji: "📅",
        },
      ],
    },
    {
      name: "Travel & Adventure",
      emoji: "🧳",
      pages: [
        {
          name: "Trip Planning & Itineraries",
          url: "#",
          emoji: "🗺️",
        },
        {
          name: "Travel Bucket List & Inspiration",
          url: "#",
          emoji: "🌎",
        },
        {
          name: "Travel Journal & Photo Gallery",
          url: "#",
          emoji: "📸",
        },
      ],
    },
  ],
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const navMain = data.navMain.map((item) => ({
    ...item,
    isActive:
      item.url !== "#" &&
      (pathname === item.url || pathname.startsWith(`${item.url}/`)),
  }))

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavFavorites favorites={data.favorites} />
        <NavWorkspaces workspaces={data.workspaces} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

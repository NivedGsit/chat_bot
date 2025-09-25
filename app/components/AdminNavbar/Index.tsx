"use client"

import ClientSideLink from '@/app/(admin)/admin/(auth)/client-side-link';
import React, { useState } from 'react'
import {
  ChatBubbleBottomCenterIcon,
  } from "@heroicons/react/24/outline";



const AdminNavbar = () => {

    const [openLink, setOpenLink] = useState<string | null>(null);
    
    const navItems = [
        { name: "Chat", href: "/admin/chat", icon: ChatBubbleBottomCenterIcon },
      ];

  return (
    navItems.map((item) => {
        const Icon = item.icon;
        return (
          <ClientSideLink
            key={item.href}
            href={item.href}
            name={item.name}
            icon={<Icon className="h-5 w-5" />}
            isOpen={openLink === item.href}
            setOpenLink={setOpenLink}
          />
        );
      })
  )
}

export default AdminNavbar
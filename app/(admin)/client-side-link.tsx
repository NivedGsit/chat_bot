"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { MdExpandCircleDown } from "react-icons/md";

interface ClientSideLinkProps {
  href: string;
  name: string;
  icon: React.ReactNode;
  className?: string;
  children?: { href: string; name: string }[];
  isOpen?: boolean;
  setOpenLink?: (href: string | null) => void;
  hasChild?: boolean;
}

// Client component for handling active states
function ClientSideLink({
  href,
  name,
  icon,
  className,
  children,
  isOpen = false,
  setOpenLink,
  hasChild = false,
}: ClientSideLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === `${href}` || pathname?.startsWith(`${href}/`);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/admin/login";
      }
    } catch (error) {
      console.log(error);
    }
  }


  return (
    <>
      <Link
        href={href == "/admin/logout" ? "#" : href}
        onClick={() => {  // Prevent navigation on click
          setOpenLink?.(isOpen ? null : href);
          if (href === "/admin/logout") {
            handleLogout();
            return;
          }
        }}
        className={cn(
          "flex items-center px-4 py-2 text-[16px] font-medium rounded-md transition-colors justify-between",
          "hover:bg-gray-50 hover:text-primary",
          isActive ? "bg-gray-50 text-primary" : "text-gray-700",
          className
        )}
      >
        <div className="flex items-center">
        <span className="mr-3">{icon}</span>
        {name}
        </div>
        {hasChild && (!isOpen ? <MdExpandCircleDown className="ml-1 mt-1" /> : <MdExpandCircleDown className="ml-1 mt-1 rotate-180" />)}
      </Link>
      {isOpen && children && (
        <div className="flex pl-14 flex-col items-start gap-2">
          {children.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
            <div>-</div>
            <Link
              href={item.href}
              className="w-full rounded-md cursor-pointer hover:bg-gray-50 hover:text-primary text-[16px] font-medium"
            >
              {item.name}
            </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


export default memo(ClientSideLink)
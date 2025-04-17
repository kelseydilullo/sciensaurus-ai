"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserAvatarDropdown() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const userEmail = user?.email || 'kelsey@sciensaurus.com';
  const initials = userEmail
    ? userEmail
        .split('@')[0]
        .split('.')
        .map(part => part[0]?.toUpperCase() || '')
        .join('')
        .substring(0, 2)
    : 'K';  // Default to K for demo

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center focus:outline-none">
          <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden bg-[#1e3a6d] text-white border-2 border-white cursor-pointer">
            <span className="text-sm font-medium">{initials}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-gray-200 rounded-md p-1 mt-1">
        <DropdownMenuLabel className="bg-white py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold">My Account</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        
        <div className="py-1">
          {/* <Link href="/dashboard/profile" className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Profile
          </Link> */}
          {/* <Link href="/dashboard/settings" className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Settings
          </Link> */}
        </div>
        
        <DropdownMenuSeparator className="bg-gray-200" />
        <button 
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


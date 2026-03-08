"use client";

import {
  BarChart3,
  Heart,
  LogOut,
  Map,
  MapPin,
  Settings,
  ShoppingBag,
  User,
  Menu,
  History,
} from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="LandRecord Logo" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold leading-tight">
              LandRecord
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Village Parcel Verification
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-semibold">LandRecord</h1>
          </div>
        </Link>

        {/* Actions Section */}
        <div className="flex items-center gap-2">
          {/* Map/Dashboard Toggle */}
          <Button
            onClick={() =>
              pathname === "/dashboard"
                ? router.push("/")
                : router.push("/dashboard")
            }
            variant="outline"
            size="sm"
            className="h-9"
          >
            {pathname === "/dashboard" ? (
              <>
                <Map className="h-4 w-4" />
                <span className="ml-2 hidden md:inline">Map View</span>
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                <span className="ml-2 hidden md:inline">Dashboard</span>
              </>
            )}
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Auth Section */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    {user.picture && <AvatarImage src={user.picture} alt={user.name} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/audit-history")}
                  className="cursor-pointer"
                >
                  <History className="mr-2 h-4 w-4" />
                  <span>Audit History</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="hidden sm:flex"
              >
                Sign in
              </Button>

              <Button
                size="sm"
                onClick={() => router.push("/signup")}
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
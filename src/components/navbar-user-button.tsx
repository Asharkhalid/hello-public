"use client"

import { useRouter } from "next/navigation";
import { ChevronDownIcon, CreditCardIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarUserButtonProps {
  onMobileMenuClose?: () => void;
}

export const NavbarUserButton = ({ onMobileMenuClose }: NavbarUserButtonProps = {}) => {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  const onLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        }
      }
    })
  }

  // Loading state
  if (isPending) {
    return (
      <Button disabled>
        Loading...
      </Button>
    );
  }

  // Not logged in - show Get Started button
  if (!data?.user) {
    return (
      <Button asChild>
        <Link href="/sign-in" onClick={onMobileMenuClose}>
          Get Started
        </Link>
      </Button>
    );
  }

  // Logged in - show user dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
          {data.user.image ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={data.user.image} />
            </Avatar>
          ) : (
            <GeneratedAvatar
              seed={data.user.name}
              variant="initials"
              className="w-8 h-8"
            />
          )}
          <span className="hidden sm:inline text-sm font-medium">
            {data.user.name?.split(' ')[0] || 'User'}
          </span>
          <ChevronDownIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium truncate">{data.user.name}</span>
            <span className="text-sm font-normal text-muted-foreground truncate">{data.user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => authClient.customer.portal()}
          className="cursor-pointer flex items-center justify-between"
        >
          Billing
          <CreditCardIcon className="w-4 h-4" />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer flex items-center justify-between"
        >
          Logout
          <LogOutIcon className="w-4 h-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 
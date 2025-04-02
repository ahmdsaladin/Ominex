import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../common/Button";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            Ominex
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/explore" className="text-gray-600 hover:text-gray-900">
              Explore
            </Link>
            <Link href="/collections" className="text-gray-600 hover:text-gray-900">
              Collections
            </Link>
            <Link href="/create" className="text-gray-600 hover:text-gray-900">
              Create
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link href="/profile">
                  <img
                    src={session.user?.image || "/default-avatar.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                </Link>
                <Button
                  variant="outline"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 
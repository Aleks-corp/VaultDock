import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 px-1 font-semibold text-foreground"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <img
          src="/logo/logo.png"
          alt="VaultDock Logo"
          className="h-full w-full"
        />
      </span>
      <span className="text-[15px] tracking-tight">VaultDock</span>
    </Link>
  );
}

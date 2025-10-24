"use client";

import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link href="/">
      <div className="flex justify-between items-center h-16">
        <Image
          src="/Logo-Light.png"
          alt="logo"
          width={150}
          height={200}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/Logo-Dark.png"
          alt="logo"
          width={150}
          height={200}
          className="hidden dark:block"
          priority
        />
      </div>
    </Link>
  );
};

export default Logo;

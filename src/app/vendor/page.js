'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vendor/produk');
  }, [router]);

  return null;
}

// halo
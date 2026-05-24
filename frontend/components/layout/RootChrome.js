'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import Navbar from '../Navbar';
import Footer from '../Footer';

const APP_ROUTE_PREFIXES = [
  '/researcher',
  '/admin-staff',
  '/institution-admin',
  '/global-admin',
  '/dashboard',
];

function isAppRoute(pathname) {
  return APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isFullHeightWizard(pathname) {
  if (pathname === '/researcher/ethics/new') return true;
  return /\/researcher\/projects\/[^/]+\/setup$/.test(pathname);
}

export default function RootChrome({ children }) {
  const pathname = usePathname();
  const appRoute = isAppRoute(pathname);
  const wizard = isFullHeightWizard(pathname);

  useEffect(() => {
    if (!wizard) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      return undefined;
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [wizard]);

  if (appRoute) {
    return (
      <Box sx={{
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

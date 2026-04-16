'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

export default function ResearcherGrants() {
  const router = useRouter();
  useEffect(() => { router.replace('/researcher/grants/discover'); }, []);
  return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;
}

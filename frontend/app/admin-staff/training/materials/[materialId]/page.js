'use client';

import { useParams, useSearchParams } from 'next/navigation';
import MaterialPreviewView from '../../../../../components/training/MaterialPreviewView';

export default function AdminMaterialPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const programId = searchParams.get('program');
  const backHref = programId
    ? `/admin-staff/training/programs/${programId}`
    : '/admin-staff/training/programs';

  return (
    <MaterialPreviewView
      materialId={params.materialId}
      backHref={backHref}
      backLabel="Back to programme content"
    />
  );
}

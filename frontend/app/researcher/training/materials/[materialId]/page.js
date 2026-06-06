'use client';

import { useParams } from 'next/navigation';
import MaterialPreviewView from '../../../../../components/training/MaterialPreviewView';

export default function ResearcherMaterialPreviewPage() {
  const params = useParams();

  return (
    <MaterialPreviewView
      materialId={params.materialId}
      backHref="/researcher/training/my-courses"
      backLabel="Back to my courses"
    />
  );
}

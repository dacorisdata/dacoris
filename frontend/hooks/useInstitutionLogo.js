'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';

let cachedInstitutionId = null;
let cachedLogoUrl = null;
let inFlight = null;

export function clearInstitutionLogoCache() {
  if (cachedLogoUrl) {
    URL.revokeObjectURL(cachedLogoUrl);
  }
  cachedInstitutionId = null;
  cachedLogoUrl = null;
  inFlight = null;
}

async function fetchLogoUrl(institutionId) {
  if (cachedInstitutionId === institutionId && cachedLogoUrl) {
    return cachedLogoUrl;
  }
  if (inFlight && cachedInstitutionId === institutionId) {
    return inFlight;
  }

  cachedInstitutionId = institutionId;
  inFlight = authAPI
    .getInstitutionLogo()
    .then((response) => {
      if (cachedLogoUrl) {
        URL.revokeObjectURL(cachedLogoUrl);
      }
      const url = URL.createObjectURL(response.data);
      cachedLogoUrl = url;
      inFlight = null;
      return url;
    })
    .catch((err) => {
      inFlight = null;
      cachedLogoUrl = null;
      throw err;
    });

  return inFlight;
}

/**
 * Loads the current user's institution logo (blob URL), shared across portals.
 */
export function useInstitutionLogo() {
  const { user } = useAuth();
  const institutionId = user?.primary_institution_id || user?.institution_id || null;
  const hasLogo = Boolean(user?.institution_has_logo);
  const name = user?.institution_name || null;
  const [logoUrl, setLogoUrl] = useState(() =>
    cachedInstitutionId === institutionId ? cachedLogoUrl : null
  );
  const [loading, setLoading] = useState(Boolean(hasLogo && institutionId && !logoUrl));

  useEffect(() => {
    let cancelled = false;

    if (!institutionId || !hasLogo) {
      setLogoUrl(null);
      setLoading(false);
      return undefined;
    }

    if (cachedInstitutionId === institutionId && cachedLogoUrl) {
      setLogoUrl(cachedLogoUrl);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetchLogoUrl(institutionId)
      .then((url) => {
        if (!cancelled) {
          setLogoUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogoUrl(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId, hasLogo]);

  return { name, logoUrl, hasLogo, loading, institutionId };
}

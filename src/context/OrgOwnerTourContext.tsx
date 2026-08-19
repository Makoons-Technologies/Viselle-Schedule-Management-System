import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';
import {
  ORG_OWNER_TOUR_STEPS,
  readOrgOwnerTourStorage,
  tourStepPathMatches,
  writeOrgOwnerTourStorage,
  type OrgOwnerTourStep,
  type OrgOwnerTourTarget,
} from '@/lib/org-owner-tour';

interface OrgOwnerTourContextValue {
  eligible: boolean;
  isActive: boolean;
  stepIndex: number;
  stepCount: number;
  step: OrgOwnerTourStep | null;
  currentTarget: OrgOwnerTourTarget | null;
  start: () => void;
  skip: () => void;
  back: () => void;
  next: () => void;
}

const OrgOwnerTourContext = createContext<OrgOwnerTourContextValue | null>(null);

export function OrgOwnerTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const mustChoosePlan = useOrgMustChoosePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStartSessionRef = useRef<string | null>(null);

  const canUseTour =
    user?.role === 'org_owner' && !!orgId && !mustChoosePlan && location.pathname.startsWith('/orgs/');

  const step = isActive ? ORG_OWNER_TOUR_STEPS[stepIndex] ?? null : null;
  const currentTarget = step?.target ?? null;

  const close = useCallback(
    (status: 'done' | 'skipped') => {
      if (user?.id && orgId) writeOrgOwnerTourStorage(user.id, orgId, status);
      setIsActive(false);
      setStepIndex(0);
    },
    [orgId, user?.id],
  );

  const start = useCallback(() => {
    if (!canUseTour || !orgId) return;
    setStepIndex(0);
    setIsActive(true);
    navigate(`/orgs/${orgId}/dashboard`, { replace: false });
  }, [canUseTour, navigate, orgId]);

  const skip = useCallback(() => close('skipped'), [close]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= ORG_OWNER_TOUR_STEPS.length - 1) {
      close('done');
      return;
    }
    setStepIndex((i) => i + 1);
  }, [close, stepIndex]);

  useEffect(() => {
    if (!canUseTour || !orgId || !user?.id || isActive || user.impersonatedBy) return;

    const sessionKey = `${user.id}:${orgId}`;
    if (autoStartSessionRef.current === sessionKey) return;

    if (readOrgOwnerTourStorage(user.id, orgId)) {
      autoStartSessionRef.current = sessionKey;
      return;
    }

    const timer = window.setTimeout(() => {
      if (readOrgOwnerTourStorage(user.id, orgId)) {
        autoStartSessionRef.current = sessionKey;
        return;
      }
      autoStartSessionRef.current = sessionKey;
      setStepIndex(0);
      setIsActive(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [canUseTour, orgId, user?.id, user?.impersonatedBy, isActive]);

  useEffect(() => {
    if (!isActive || !orgId || !step) return;
    const target = step.path(orgId);
    if (tourStepPathMatches(location.pathname, target)) return;
    navigate(target, { replace: true });
  }, [isActive, orgId, step, location.pathname, navigate]);

  const value = useMemo<OrgOwnerTourContextValue>(
    () => ({
      eligible: canUseTour,
      isActive,
      stepIndex,
      stepCount: ORG_OWNER_TOUR_STEPS.length,
      step,
      currentTarget,
      start,
      skip,
      back,
      next,
    }),
    [canUseTour, isActive, stepIndex, step, currentTarget, start, skip, back, next],
  );

  return <OrgOwnerTourContext.Provider value={value}>{children}</OrgOwnerTourContext.Provider>;
}

export function useOrgOwnerTour(): OrgOwnerTourContextValue {
  const ctx = useContext(OrgOwnerTourContext);
  if (!ctx) {
    return {
      eligible: false,
      isActive: false,
      stepIndex: 0,
      stepCount: ORG_OWNER_TOUR_STEPS.length,
      step: null,
      currentTarget: null,
      start: () => undefined,
      skip: () => undefined,
      back: () => undefined,
      next: () => undefined,
    };
  }
  return ctx;
}

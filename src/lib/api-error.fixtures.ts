import {
  ApiError,
  getApiErrorMessage,
  getFallbackRequestErrorMessage,
  isUnreachableRequestError,
  SERVER_REQUEST_FAILED_MESSAGE,
  UNREACHABLE_SERVER_MESSAGE,
} from '@/lib/api';
import { findReconciledStaffAccount } from '@/lib/staff-create';
import type { Account } from '@/types/api';

/**
 * Expected mapping for axios / fetch failures with no API `error` body.
 * Isolation Studio Add staff Create was showing raw "Network Error".
 */
function assertApiErrorFixtures(): void {
  if (getFallbackRequestErrorMessage({ message: 'Network Error', code: 'ERR_NETWORK' }) !== UNREACHABLE_SERVER_MESSAGE) {
    throw new Error('axios Network Error must map to a reachable-server message');
  }
  if (getFallbackRequestErrorMessage({ message: 'Network request failed' }) !== UNREACHABLE_SERVER_MESSAGE) {
    throw new Error('failed fetch must map to a reachable-server message');
  }
  if (getFallbackRequestErrorMessage({ response: { status: 500 }, message: 'Request failed with status code 500' }) !== SERVER_REQUEST_FAILED_MESSAGE) {
    throw new Error('5xx without an API body must map to a server-failed message');
  }
  if (getFallbackRequestErrorMessage({ response: { status: 413 } }) !== 'Image must be 2 MB or smaller') {
    throw new Error('413 must keep the image-size message');
  }

  const networkErr = new ApiError('NETWORK_ERROR', 'Network Error', 0);
  if (getApiErrorMessage(networkErr, 'fallback') !== UNREACHABLE_SERVER_MESSAGE) {
    throw new Error('ApiError Network Error must not stay as the raw axios string');
  }
  const serverErr = new ApiError('SERVER_ERROR', SERVER_REQUEST_FAILED_MESSAGE, 502);
  if (getApiErrorMessage(serverErr, 'fallback') !== SERVER_REQUEST_FAILED_MESSAGE) {
    throw new Error('ApiError 5xx must keep the server-failed message');
  }
  const apiBody = new ApiError('EMAIL_SEND_FAILED', 'Invite email could not be sent.', 502);
  if (getApiErrorMessage(apiBody, 'fallback') !== 'Invite email could not be sent.') {
    throw new Error('API error bodies must still surface their message');
  }
  if (!isUnreachableRequestError(networkErr)) {
    throw new Error('status-0 Network Error must count as unreachable');
  }
  if (isUnreachableRequestError(apiBody)) {
    throw new Error('API 502 body must not count as unreachable');
  }

  const isolationEmail = 'grokbot-finalpass-staff@viselle.test';
  const owner: Account = {
    id: 'owner-1',
    organizationId: 'aaaaaaaa-0000-4000-8000-000000000010',
    firstName: 'Owner',
    lastName: 'Isolation',
    email: 'owner@viselle.test',
    role: 'org_owner',
    status: 'active',
    isBookable: true,
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
  };
  const created: Account = {
    ...owner,
    id: 'staff-1',
    firstName: 'grokbot',
    lastName: 'FinalPass Staff',
    email: isolationEmail,
    role: 'staff',
  };
  if (findReconciledStaffAccount([owner, created], isolationEmail, ['owner-1'])?.id !== 'staff-1') {
    throw new Error('Isolation Create must reconcile a new staff email after ERR_FAILED');
  }
  if (findReconciledStaffAccount([owner], isolationEmail, ['owner-1'])) {
    throw new Error('missing staff row after ERR_FAILED must stay a failure');
  }
}

assertApiErrorFixtures();

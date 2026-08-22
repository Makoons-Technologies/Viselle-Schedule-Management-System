import {
  ApiError,
  getApiErrorMessage,
  getFallbackRequestErrorMessage,
  SERVER_REQUEST_FAILED_MESSAGE,
  UNREACHABLE_SERVER_MESSAGE,
} from '@/lib/api';

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
}

assertApiErrorFixtures();

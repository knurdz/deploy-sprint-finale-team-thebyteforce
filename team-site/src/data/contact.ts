/**
 * T10 - Web3Forms Contact Service
 *
 * Organizer starter snippet, adapted. The snippet supplied `task`, `provider`
 * and `accessKeyStoredInSecret`; the submit endpoint and route are added here so
 * the component and the build-time evidence generator agree on one source of
 * truth rather than repeating string literals.
 *
 * No access key value appears in this file. The key is supplied at build time
 * from the WEB3FORMS_ACCESS_KEY GitHub Secret.
 */
export const contactProvider = {
  task: 'T10',
  provider: 'web3forms',
  accessKeyStoredInSecret: true,
  endpoint: 'https://api.web3forms.com/submit',
  route: '/#contact',
} as const;

/**
 * Web3Forms posts directly from the browser, so the access key has to be present
 * in the client bundle for the form to work at all - it is a form identifier,
 * not an authenticator. Vite inlines it at build time from the environment; it
 * is never read from a committed file.
 */
export const contactAccessKey: string = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY ?? '';

export const isContactConfigured = (): boolean => contactAccessKey.length > 0;

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { contactAccessKey, contactProvider, isContactConfigured } from '../data/contact';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

/**
 * T10 - contact/support form backed by Web3Forms.
 *
 * Posts straight to api.web3forms.com. The access key is injected at build time
 * from the WEB3FORMS_ACCESS_KEY secret and is never committed to the repository.
 * When no key is configured the form renders in a disabled state rather than
 * silently failing on submit, so a missing secret is visible instead of looking
 * like a broken form.
 */
export function ContactForm() {
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const configured = isContactConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      return;
    }

    setState('sending');
    const form = new FormData(event.currentTarget);
    form.append('access_key', contactAccessKey);
    form.append('from_name', 'Deploy Sprint LMS contact form');

    try {
      const response = await fetch(contactProvider.endpoint, {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      setState(result.success ? 'sent' : 'error');
      setMessage(result.success ? 'Thanks - your message was sent.' : 'Submission failed. Please try again.');
    } catch {
      setState('error');
      setMessage('Could not reach the contact service.');
    }
  }

  return (
    <section className="contactPanel" id="contact" aria-label="Contact support">
      <div className="contactHeader">
        <Mail size={18} />
        <div>
          <p className="eyebrow">Support</p>
          <h2>Contact the release team</h2>
        </div>
      </div>

      <form className="contactForm" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input name="name" type="text" required autoComplete="name" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" rows={4} required />
        </label>

        <button type="submit" disabled={!configured || state === 'sending'}>
          <Send size={16} />
          {state === 'sending' ? 'Sending...' : 'Send message'}
        </button>

        {!configured && (
          <p className="contactNote" role="status">
            Contact provider: {contactProvider.provider}. Access key not configured for this build.
          </p>
        )}
        {message && (
          <p className="contactNote" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}

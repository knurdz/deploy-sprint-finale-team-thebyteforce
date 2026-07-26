# T02 - DNS verification evidence

Assigned domain: `thebyteforce.deploysprint-finals.knurdz.org`
Verified: 2026-07-26T06:39:19Z, against Google Public DNS (`8.8.8.8`) so the
answers come from public resolvers rather than a local cache.

Challenge token values are redacted below. The TXT record is confirmed to
exist and resolve; its value is held as the `DNS_TXT_VALUE` secret and is
deliberately not reproduced here, in the pull request, or in any log.

## Records created

| Purpose | Type | Name | Value |
| --- | --- | --- | --- |
| Site record | `A` | `thebyteforce` | `4.155.210.79` |
| Ownership challenge | `TXT` | `_deploy-sprint-challenge.thebyteforce` | `<redacted>` |

### Why an A record and not a CNAME

The target we were assigned is an IP address (`4.155.210.79`), and a `CNAME`
must point at another *name*, never at an address. An `A` record is the only
correct choice here. A `CNAME` would also be invalid at this label for a second
reason: the same subdomain carries other records, and a `CNAME` cannot coexist
with other record types at the same name.

## Lookup output

```text
$ nslookup thebyteforce.deploysprint-finals.knurdz.org 8.8.8.8
Name:    thebyteforce.deploysprint-finals.knurdz.org
Address:  4.155.210.79

$ nslookup -type=TXT _deploy-sprint-challenge.thebyteforce.deploysprint-finals.knurdz.org 8.8.8.8
_deploy-sprint-challenge.thebyteforce.deploysprint-finals.knurdz.org     text =

        "<redacted: DNS_TXT_VALUE>"
```

## Route compatibility

The domain must not break the paths that already worked. All three still
answer, and no HTTPS redirect was added.

```text
$ curl -I http://thebyteforce.deploysprint-finals.knurdz.org/health
HTTP/1.1 200 OK
Server: nginx/1.27.5

$ curl -I http://thebyteforce.deploysprint-finals.knurdz.org/status
HTTP/1.1 200 OK
Server: nginx/1.27.5

$ curl -I http://4.155.210.79/health
HTTP/1.1 200 OK
Server: nginx/1.27.5
```

| Route | Result |
| --- | --- |
| `http://thebyteforce.deploysprint-finals.knurdz.org/health` | 200 |
| `http://thebyteforce.deploysprint-finals.knurdz.org/status` | 200 |
| `http://4.155.210.79/health` | 200 |
| `https://thebyteforce.deploysprint-finals.knurdz.org/` | not enabled |

## TLS

HTTPS is not provisioned. Organizers confirmed this event runs HTTP-only for
team domains, so no certificate is issued for the assigned host.

We deliberately did **not** add an HTTP-to-HTTPS redirect. Forcing HTTPS while
no certificate exists would break the working HTTP domain and the raw IP route,
turning a partially complete task into a broken site. `PUBLIC_URL` is therefore
recorded as the HTTP domain — the address that actually serves the site —
rather than an HTTPS URL that does not answer.

## Credential handling

The DNS portal login and the challenge token were used only in the portal UI.
No portal password, DNS API token, or challenge value appears in this
repository, in commit history, in the pull request, or in workflow logs.
`domain.config.json` lists the withheld names under `secretsRedacted` so a
reviewer can confirm what is configured without seeing any value.

# FACT-001 · Read-only anonymous SSO challenge test for only the known Vercel LAB.
# No sessions, provider tokens, DNS changes or production resources.
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse

HOSTS = (
 "cerebro-fact001-vercel-lab-20261111.vercel.app",
 "cerebro-fact001-vercel-lab-20-carlosjmunozcabeza-2582s-projects.vercel.app",
 "cerebro-fact001-vercel-lab-20261111-4xx0w0iv5.vercel.app",
 "cerebro-fact001-vercel-lab-20261111-44gh2g8ow.vercel.app",
)
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self, req, fp, code, msg, headers, newurl):
  return None
opener = build_opener(NoRedirect())
for index, host in enumerate(HOSTS, 1):
 url="https://"+host+"/"
 try:
  resp=opener.open(Request(url, method="GET", headers={"User-Agent":"FACT001-LAB-SSO-probe/1"}),timeout=18)
  code=resp.status
  redirect=None
  resp.close()
 except HTTPError as error:
  code=error.code
  redirect=error.headers.get("Location") if code in (301,302,303,307,308) else None
 except URLError as error:
  raise RuntimeError("SSO_PROBE_TRANSPORT_ERROR_"+str(index)) from None
 print("VERCEL_LAB_ANONYMOUS_ENDPOINT_"+str(index)+"_HTTP="+str(code))
 if code in (301,302,303,307,308):
  if not redirect:
   raise RuntimeError("SSO_REDIRECT_MISSING_"+str(index))
  parsed=urlparse(redirect)
  # Reject redirects back to the same unprotected site or unexpected destinations.
  allowed=parsed.hostname and (parsed.hostname=="vercel.com" or parsed.hostname.endswith(".vercel.com"))
  if parsed.scheme!="https" or not allowed:
   raise RuntimeError("SSO_REDIRECT_TARGET_UNEXPECTED_"+str(index))
 elif code not in (401,403):
  raise RuntimeError("SSO_PUBLIC_OR_UNVERIFIED_STATUS_"+str(index))
print("VERCEL_LAB_ANONYMOUS_PROTECTION=PASS")
print("VERCEL_PROD_FENIX_DOMAINS_TESTED=NONE")

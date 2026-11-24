# SAHR Activity Parser — privacy notes

Converts a SAHR Allied Health activity report (.xls/.xlsx) into rows for the CALHN MT Master Data Sheet (columns A–AE).

**How patient data is protected**
- All processing happens in the user's browser. The page's Content-Security-Policy sets `connect-src 'none'`, `form-action 'none'` and allows only same-origin scripts, so the page cannot transmit data even if modified by a bad script. SheetJS is vendored in `vendor/` (no CDN).
- Patient names are never written to the output. Client URNs are replaced with `PT-XXXXXXX` codes: HMAC-SHA-256 of the URN keyed with a team key the user types in. The key is never stored or sent. Without the key, codes cannot be linked back to URNs.
- Nothing patient-related is saved (no localStorage, cookies or uploads). Only the user's ward-mapping choices (service name → ward) are kept in localStorage.
- Before output can be copied or downloaded, it is scanned for every URN, full name and name part (4+ letters) in the source; any match blocks the output.

**Counting rule:** OoS = SAHR row with Delivery Mode "In person" and Attendance "New" or "Review". One output row per Patient ID × month × ward × session type, No. Sessions = OoS count.

**Testing:** `test/make_fixture.js` builds a synthetic report. Never commit real reports to this repository.

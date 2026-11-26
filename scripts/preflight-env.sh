#!/usr/bin/env bash
# Pre-deploy check for .env (referenced by .env and .env.docker.example).
#
#   bash scripts/preflight-env.sh .env            # production intent (default)
#   bash scripts/preflight-env.sh .env --allow-local   # local/staging rehearsal
#
# Exit codes: 0 = no errors, 1 = at least one error, 2 = usage/file problem.
# Warnings never fail the run. Errors must be fixed before `docker compose up -d`.

set -uo pipefail

ENV_FILE="${1:-.env}"
MODE="production"
for arg in "$@"; do
  case "$arg" in
    --allow-local) MODE="local" ;;
    --production) MODE="production" ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.docker.example to .env first." >&2
  exit 2
fi

errors=0
warnings=0
err() { echo "ERROR   $1"; errors=$((errors + 1)); }
warn() { echo "WARN    $1"; warnings=$((warnings + 1)); }
ok() { echo "ok      $1"; }
# Deployment blockers: errors in production, warnings for a local rehearsal.
severe() { if [ "$MODE" = "production" ]; then err "$1"; else warn "$1"; fi }

# Read KEY=value without executing the file (values may contain spaces).
get() {
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
has() { sed -n "s/^[[:space:]]*\($1\)=.*/\1/p" "$ENV_FILE" | grep -q .; }

required="MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD JWT_SECRET REVALIDATE_SECRET SITE_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_BASE_URL"
for key in $required; do
  if [ -z "$(get "$key")" ]; then err "$key is missing or empty"; fi
done
[ "$errors" -eq 0 ] && ok "required keys present"

# Secrets: reject the stock placeholders and anything short enough to guess.
weak_pattern='change_me|changeme|password123|your-|placeholder|example_secret|secret123|^admin$|^test$|^123456'
for key in JWT_SECRET MYSQL_PASSWORD MYSQL_ROOT_PASSWORD REVALIDATE_SECRET; do
  value="$(get "$key")"
  [ -z "$value" ] && continue
  if printf '%s' "$value" | grep -Eqi "$weak_pattern"; then
    severe "$key still contains a placeholder value"
  elif [ "${#value}" -lt 24 ]; then
    severe "$key is only ${#value} chars; use at least 24 random chars (openssl rand -hex 32)"
  fi
done
if [ "$(get JWT_SECRET)" = "$(get REVALIDATE_SECRET)" ] && [ -n "$(get JWT_SECRET)" ]; then
  err "JWT_SECRET and REVALIDATE_SECRET must differ (one leak must not compromise both)"
fi

# SETTINGS_ENCRYPTION_KEY is required for AI/PayPal/SMTP secrets; the backend
# only warns today, then silently fails to save them.
if [ -z "$(get SETTINGS_ENCRYPTION_KEY)" ]; then
  severe "SETTINGS_ENCRYPTION_KEY is not set; saving AI keys, PayPal and SMTP passwords will fail"
elif ! printf '%s' "$(get SETTINGS_ENCRYPTION_KEY)" | grep -Eq '^[0-9a-fA-F]{64}$'; then
  warn "SETTINGS_ENCRYPTION_KEY should be 64 hex chars (openssl rand -hex 32)"
fi

# Canonical host: every page and sitemap URL is built from SITE_URL.
site_url="$(get SITE_URL)"; public_url="$(get NEXT_PUBLIC_SITE_URL)"
if [ -n "$site_url" ] && [ -n "$public_url" ] && [ "$site_url" != "$public_url" ]; then
  err "SITE_URL ($site_url) and NEXT_PUBLIC_SITE_URL ($public_url) differ; canonical and client URLs would disagree"
fi
canonical_host="$(printf '%s' "$site_url" | sed -e 's#^https\?://##' -e 's#/.*$##')"
case "$site_url" in
  https://*) : ;;
  http://*)
    if [ "$MODE" = "production" ]; then err "SITE_URL must be https in production ($site_url)"; else warn "SITE_URL is http ($site_url)"; fi ;;
  "") : ;;
  *) err "SITE_URL must be an absolute URL ($site_url)" ;;
esac
case "$canonical_host" in
  localhost*|127.0.0.1*|0.0.0.0*|*:3000)
    if [ "$MODE" = "production" ]; then
      err "SITE_URL points at $canonical_host; canonical/og:url/sitemap would all be unreachable"
    else
      warn "SITE_URL points at $canonical_host (fine for a local rehearsal)"
    fi ;;
  www.*)
    warn "SITE_URL uses the www host; the app is canonical on the apex (redirect www -> apex)" ;;
esac

# CORS
cors="$(get CORS_ORIGINS)"
if printf '%s' "$cors" | grep -q '\*'; then
  err "CORS_ORIGINS contains a wildcard; credentialed requests need explicit origins"
fi
if [ "$MODE" = "production" ]; then
  if printf '%s' "$cors" | grep -Eq 'localhost|127\.0\.0\.1'; then
    warn "CORS_ORIGINS still lists localhost entries ($cors)"
  fi
else
  ok "local rehearsal mode: localhost origins allowed"
fi

# Seeded admin: fine for the first boot, must be off afterwards.
seed="$(get SEED_DEFAULT_ADMIN)"
if [ "$MODE" = "production" ]; then
  case "$seed" in
    ''|0|false|False|FALSE) : ;;
    *) warn "SEED_DEFAULT_ADMIN=$seed; set it to 0 once the admin account exists so a redeploy cannot reset it" ;;
  esac
  admin_pass="$(get DEFAULT_ADMIN_PASSWORD)"
  if [ -n "$admin_pass" ] && [ "${#admin_pass}" -lt 16 ]; then
    severe "DEFAULT_ADMIN_PASSWORD is shorter than 16 chars"
  fi
fi

# Reverse proxy: the backend trusts RFC1918 by default, which is only safe when
# it is not exposed directly.
if [ -z "$(get TRUSTED_PROXIES)" ]; then
  warn "TRUSTED_PROXIES is not set; the backend trusts all RFC1918 ranges for client IPs"
fi

# Compression front door (frontend/brotli-proxy.mjs).
brotli="$(get BROTLI_PROXY)"
case "$brotli" in
  ''|on|off) : ;;
  *) err "BROTLI_PROXY must be 'on' or 'off' (got '$brotli')" ;;
esac

# Migrations on boot are convenient for staging, risky for production.
if [ "$MODE" = "production" ]; then
  case "$(get DB_AUTO_MIGRATE)" in
    ''|0|false|False|FALSE) : ;;
    *) warn "DB_AUTO_MIGRATE is enabled; run migrations deliberately in production" ;;
  esac
fi

# File permissions: the file holds DB, JWT and SMTP secrets.
if command -v stat >/dev/null 2>&1; then
  perms="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%OLp' "$ENV_FILE" 2>/dev/null || echo '')"
  case "$perms" in
    ''|600|400) : ;;
    *) warn "$ENV_FILE is mode $perms; use chmod 600" ;;
  esac
fi

echo
echo "mode=$MODE file=$ENV_FILE errors=$errors warnings=$warnings"
if [ "$errors" -gt 0 ]; then
  echo "PREFLIGHT_FAILED"
  exit 1
fi
echo "PREFLIGHT_OK"
exit 0

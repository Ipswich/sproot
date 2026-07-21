#!/bin/sh

set -eu
umask 077

CERT_DIR=${TLS_CERT_DIR:-/etc/nginx/certs}

ACTIVE_CERT="$CERT_DIR/active.crt"
ACTIVE_KEY="$CERT_DIR/active.key"

CUSTOM_CERT="$CERT_DIR/server.crt"
CUSTOM_KEY="$CERT_DIR/server.key"

GENERATED_CERT="$CERT_DIR/generated.crt"
GENERATED_KEY="$CERT_DIR/generated.key"

TLS_CERT_CN=${TLS_CERT_CN:-sproot}
TLS_CERT_DAYS=${TLS_CERT_DAYS:-825}
TLS_RENEW_BEFORE_DAYS=${TLS_RENEW_BEFORE_DAYS:-30}
TLS_KEY_TYPE=$(printf '%s' "${TLS_KEY_TYPE:-ec}" | tr '[:upper:]' '[:lower:]')
TLS_RSA_BITS=${TLS_RSA_BITS:-3072}
TLS_EC_CURVE=${TLS_EC_CURVE:-prime256v1}

mkdir -p "$CERT_DIR"

log() {
    printf '%s\n' "$*"
}

fail() {
    printf '%s\n' "$*" >&2
    exit 1
}

is_true() {
    case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|on)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

trim() {
    printf '%s' "$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

link_active_pair() {
    ln -sf "$1" "$ACTIVE_CERT"
    ln -sf "$2" "$ACTIVE_KEY"
}

certificate_matches_key() {
    cert_fingerprint=$(openssl x509 -in "$1" -pubkey -noout 2>/dev/null \
        | openssl pkey -pubin -outform DER 2>/dev/null \
        | openssl dgst -sha256 \
        | awk '{print $NF}') || return 1
    key_fingerprint=$(openssl pkey -in "$2" -pubout -outform DER 2>/dev/null \
        | openssl dgst -sha256 \
        | awk '{print $NF}') || return 1
    [ "$cert_fingerprint" = "$key_fingerprint" ]
}

find_primary_ipv4() {
    if command -v ip >/dev/null 2>&1; then
        ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (index = 1; index <= NF; index++) if ($index == "src") { print $(index + 1); exit }}'
        return
    fi

    hostname -i 2>/dev/null | awk '{print $1}'
}

SAN_LINES='DNS:localhost
IP:127.0.0.1'

add_san() {
    candidate=$(trim "$1")

    [ -n "$candidate" ] || return 0

    if printf '%s\n' "$SAN_LINES" | grep -Fx "$candidate" >/dev/null 2>&1; then
        return 0
    fi

    SAN_LINES=$(printf '%s\n%s' "$SAN_LINES" "$candidate")
}

parse_san_entry() {
    entry=$(trim "$1")

    case "$entry" in
        DNS:*|IP:*)
            printf '%s' "$entry"
            return 0
            ;;
        *[!0-9A-Fa-f:.]*)
            printf 'DNS:%s' "$entry"
            return 0
            ;;
        *.*.*.*|*:*)
            printf 'IP:%s' "$entry"
            return 0
            ;;
        *)
            printf 'DNS:%s' "$entry"
            return 0
            ;;
    esac
}

if [ -n "$TLS_CERT_CN" ] && [ "$TLS_CERT_CN" != "localhost" ]; then
    add_san "$(parse_san_entry "$TLS_CERT_CN")"
fi

if [ -f "$CUSTOM_CERT" ] || [ -f "$CUSTOM_KEY" ]; then
    [ -f "$CUSTOM_CERT" ] && [ -f "$CUSTOM_KEY" ] || fail "Custom TLS certificate requires both $CUSTOM_CERT and $CUSTOM_KEY."
    certificate_matches_key "$CUSTOM_CERT" "$CUSTOM_KEY" || fail "Custom TLS certificate and key do not match."

    log "Using user-supplied TLS certificate."
    link_active_pair "$CUSTOM_CERT" "$CUSTOM_KEY"
    exec nginx -g "daemon off;"
fi

if is_true "${TLS_AUTO_IP:-true}"; then
    detected_ip=$(find_primary_ipv4 || true)

    if [ -n "${detected_ip:-}" ]; then
        add_san "IP:$detected_ip"
    fi
fi

if [ -n "${TLS_SANS:-}" ]; then
    old_ifs=$IFS
    IFS=','

    for entry in $TLS_SANS; do
        add_san "$(parse_san_entry "$entry")"
    done

    IFS=$old_ifs
fi

cert_satisfies_requirements() {
    [ -f "$GENERATED_CERT" ] || return 1
    [ -f "$GENERATED_KEY" ] || return 1

    openssl x509 -in "$GENERATED_CERT" -noout >/dev/null 2>&1 || return 1
    openssl pkey -in "$GENERATED_KEY" -noout >/dev/null 2>&1 || return 1
    certificate_matches_key "$GENERATED_CERT" "$GENERATED_KEY" || return 1

    renew_seconds=$((TLS_RENEW_BEFORE_DAYS * 86400))
    openssl x509 -in "$GENERATED_CERT" -noout -checkend "$renew_seconds" >/dev/null 2>&1 || return 1

    existing_sans=$(openssl x509 -in "$GENERATED_CERT" -noout -ext subjectAltName 2>/dev/null \
        | sed '1d; s/, /\n/g; s/[[:space:]]//g') || return 1

    while IFS= read -r expected_san; do
        printf '%s\n' "$existing_sans" | grep -Fx "$expected_san" >/dev/null 2>&1 || {
            return 1
        }
    done <<EOF
$SAN_LINES
EOF

    subject=$(openssl x509 -in "$GENERATED_CERT" -noout -subject 2>/dev/null) || return 1
    printf '%s\n' "$subject" | grep -Eq "CN[[:space:]]*=[[:space:]]*$TLS_CERT_CN([,/]|$)" >/dev/null 2>&1
}

write_openssl_config() {
    config_path=$1
    dns_index=1
    ip_index=1

    cat >"$config_path" <<EOF
[req]
prompt = no
distinguished_name = req_distinguished_name
x509_extensions = v3_req

[req_distinguished_name]
CN = $TLS_CERT_CN

[v3_req]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
EOF

    while IFS= read -r san; do
        case "$san" in
            DNS:*)
                printf 'DNS.%s = %s\n' "$dns_index" "${san#DNS:}" >>"$config_path"
                dns_index=$((dns_index + 1))
                ;;
            IP:*)
                printf 'IP.%s = %s\n' "$ip_index" "${san#IP:}" >>"$config_path"
                ip_index=$((ip_index + 1))
                ;;
        esac
    done <<EOF
$SAN_LINES
EOF
}

generate_self_signed_certificate() {
    config_path=$(mktemp)
    trap 'rm -f "$config_path"' EXIT INT TERM

    write_openssl_config "$config_path"

    case "$TLS_KEY_TYPE" in
        ec|ecdsa)
            openssl ecparam -name "$TLS_EC_CURVE" -genkey -noout -out "$GENERATED_KEY"
            openssl req \
                -x509 \
                -new \
                -key "$GENERATED_KEY" \
                -days "$TLS_CERT_DAYS" \
                -out "$GENERATED_CERT" \
                -config "$config_path"
            ;;
        rsa)
            openssl req \
                -x509 \
                -nodes \
                -newkey "rsa:$TLS_RSA_BITS" \
                -days "$TLS_CERT_DAYS" \
                -keyout "$GENERATED_KEY" \
                -out "$GENERATED_CERT" \
                -config "$config_path"
            ;;
        *)
            fail "Unsupported TLS_KEY_TYPE: $TLS_KEY_TYPE"
            ;;
    esac

    rm -f "$config_path"
    trap - EXIT INT TERM
}

if cert_satisfies_requirements; then
    log "Reusing generated self-signed TLS certificate."
else
    log "Generating self-signed TLS certificate."
    generate_self_signed_certificate
fi

link_active_pair "$GENERATED_CERT" "$GENERATED_KEY"

exec nginx -g "daemon off;"

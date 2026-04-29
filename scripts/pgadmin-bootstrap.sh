#!/bin/sh
set -eu

cat > /tmp/pgpass <<EOF
${PGADMIN_SERVER_HOST}:${PGADMIN_SERVER_PORT}:${PGADMIN_SERVER_DB}:${PGADMIN_SERVER_USER}:${PGADMIN_SERVER_PASS}
EOF
chmod 600 /tmp/pgpass

cat > /pgadmin4/servers.json <<EOF
{
  "Servers": {
    "1": {
      "Name": "${PGADMIN_SERVER_NAME}",
      "Group": "${PGADMIN_SERVER_GROUP}",
      "Host": "${PGADMIN_SERVER_HOST}",
      "Port": ${PGADMIN_SERVER_PORT},
      "MaintenanceDB": "${PGADMIN_SERVER_DB}",
      "Username": "${PGADMIN_SERVER_USER}",
      "SSLMode": "prefer",
      "PassFile": "/tmp/pgpass",
      "Shared": true
    }
  }
}
EOF

exec /entrypoint.sh
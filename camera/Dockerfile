FROM python:3.13-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
  echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom; \
  curl -fsSL https://archive.raspberrypi.org/debian/raspberrypi.gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/raspberrypi-archive-keyring.gpg; \
  echo "deb [signed-by=/usr/share/keyrings/raspberrypi-archive-keyring.gpg] https://archive.raspberrypi.org/debian/ bookworm main" > /etc/apt/sources.list.d/raspi.list; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl gnupg python3-picamera2 udev wget; \
  rm -rf /var/lib/apt/lists/*

WORKDIR /srv/camera

COPY ./camera/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt --break-system-packages

COPY ./camera/server.py ./server.py

EXPOSE 3002

ENTRYPOINT ["python3", "/srv/camera/server.py"]
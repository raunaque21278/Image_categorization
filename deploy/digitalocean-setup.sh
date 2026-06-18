#!/bin/bash
set -e

echo "=== AI Media Processing - DigitalOcean Setup ==="

if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$USER"
  echo "Docker installed. Log out and back in, then run this script again."
  exit 0
fi

if ! docker compose version &> /dev/null; then
  echo "Docker Compose plugin not found."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.docker.example .env
  echo "Created .env from template — edit it before continuing."
  echo "Required: JWT_SECRET, HF_API_KEY, CORS_ORIGIN=http://YOUR_DROPLET_IP"
  exit 1
fi

if [ ! -f worker/config/google-vision.json ]; then
  echo "Missing worker/config/google-vision.json"
  echo "Upload your Google Cloud Vision service account key first."
  exit 1
fi

mkdir -p backend/uploads

echo "Building and starting all services..."
docker compose -f docker-compose.yml -f docker-compose.do.yml up -d --build

echo ""
echo "=== Deployment complete ==="
DROPLET_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo "Open in browser: http://${DROPLET_IP}"
echo "API health check: http://${DROPLET_IP}/api is proxied via frontend nginx"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.yml -f docker-compose.do.yml logs -f"
echo "  docker compose -f docker-compose.yml -f docker-compose.do.yml ps"

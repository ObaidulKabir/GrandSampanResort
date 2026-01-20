#!/bin/sh
set -e

 
# Apply db migrations
npm run prisma:migrate:deploy

# Start the app
exec "$@"
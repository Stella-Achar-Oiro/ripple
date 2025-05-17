cat > ripple/setup.sh << 'EOF'
#!/bin/bash

echo "Setting up Ripple project..."

# Navigate to frontend directory
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

# Start the development server
echo "Starting frontend development server..."
npm run dev
EOF

chmod +x ripple/setup.sh
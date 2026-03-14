#!/bin/bash
# Install Node dependencies
npm install
cd app-ui && npm install && npm run build && cd ..

# Setup Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install opencv-python-headless numpy

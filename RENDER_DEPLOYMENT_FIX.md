# Render Deployment Configuration Guide

## Issue
Build failing with error: `crypto.hash is not a function`

## Root Cause
Vite 7.x requires Node.js 18+ but Render may be using an older version.

## Solutions Applied

### 1. Node.js Version Files Created
- `.node-version` - Specifies Node.js 18.20.0
- `.nvmrc` - Alternative version specification file
- `package.json` - Updated with engines field

### 2. Render Dashboard Configuration

#### For Web Service:
1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Add/Update environment variable:
   - Key: `NODE_VERSION`
   - Value: `18.20.0`

#### Build Settings:
Ensure your build command is:
```bash
npm run build
```

And start command is:
```bash
npm start
```

### 3. Alternative: Create render.yaml

If you prefer infrastructure-as-code, create a `render.yaml` file in your project root with the following content:

```yaml
services:
  - type: web
    name: worklife-balancer
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 18.20.0
```

### 4. Verify Node Version Locally

Test that your build works with Node.js 18:
```bash
node --version  # Should show v18.x.x or higher
npm run build
```

### 5. Clear Render Cache

After making these changes:
1. Go to Render dashboard
2. Manual Deploy → Clear build cache & deploy

## Additional Troubleshooting

If the issue persists:

1. **Check Render Logs**: Look for the actual Node.js version being used
2. **Update Vite**: Consider downgrading to Vite 5.x if Node 18 isn't available:
   ```bash
   npm install vite@^5.0.0 --save-dev
   ```
3. **Image Import Issue**: The error mentions `/NithinK.png` - ensure the image exists in the `public` folder

## Files Modified
- ✅ `.node-version` - Created
- ✅ `.nvmrc` - Created  
- ✅ `frontend/package.json` - Added engines field
- ✅ Root `package.json` - Already had engines field

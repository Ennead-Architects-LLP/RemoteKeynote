# How to Manually Trigger Vercel Deployment

Since auto-deployments aren't triggering, here's how to manually deploy:

## Option 1: Via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Open your project**: `RemoteKeynote` or `enneadtab-remote-keynote`
3. **Go to Deployments tab**
4. **Click "Deploy" button** (usually at the top right)
5. **Select "Deploy from Git"**
6. **Choose branch**: `main`
7. **Select commit**: Choose the latest commit (`069ff7a` or `55adadd`)
8. **Click "Deploy"**

This will trigger a new deployment with the latest code and you'll see the build logs.

## Option 2: Via Vercel CLI

If you're logged into Vercel CLI:

```bash
# Make sure you're in the project directory
cd C:\Users\szhang\github\RemoteKeynote

# Set PATH (if needed)
$env:PATH = "$env:USERPROFILE;$env:PATH"

# Deploy
vercel --prod
```

## Option 3: Check "Ignored Build Step" Setting

The issue might be Vercel's "Ignored Build Step" feature:

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Git**
2. **Scroll to "Ignored Build Step"**
3. **Current setting**: Should be "Automatic"
4. **If it's set to a custom command**, it might be preventing builds
5. **Change it to "Automatic"** if it's not already

## Why This Happens

Vercel might be skipping builds because:
- It thinks the commit was already deployed (even if it failed)
- The "Ignored Build Step" logic is preventing new builds
- Webhook is creating status checks but not triggering deployments

## What to Check After Manual Deployment

Once you trigger a deployment manually:

1. **Watch the build logs** in real-time
2. **Look for**:
   - TypeScript errors (should be fixed now)
   - Missing dependencies
   - Environment variable errors
   - Build command issues

3. **If it succeeds**: Great! The fixes worked
4. **If it fails**: Share the specific error message from the logs

## Expected Result

With our fixes:
- ✅ TypeScript error fixed (`_error` parameter)
- ✅ API routes have separate TypeScript config
- ✅ Main tsconfig excludes API folder

The build should now succeed. The manual deployment will tell us for sure!


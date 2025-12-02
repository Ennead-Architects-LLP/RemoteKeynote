# How to Reconnect Git Repository in Vercel

## When to Reconnect
- Auto-deployments stopped working
- Webhooks aren't triggering deployments
- Status checks appear but deployments don't start
- After fixing build errors and manual deployment works

## Steps to Reconnect

### 1. Disconnect Current Connection

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Open your project: `RemoteKeynote` or `enneadtab-remote-keynote`
3. Go to **Settings** → **Git**
4. Scroll down to find **"Connected Git Repository"** section
5. Click **"Disconnect"** or **"Remove"** button
6. Confirm the disconnection

### 2. Reconnect Repository

1. Still in **Settings** → **Git**
2. Click **"Connect Git Repository"** or **"Add Git Repository"**
3. Select **GitHub** as your Git provider
4. Authorize Vercel if prompted
5. Find and select: `Ennead-Architects-LLP/RemoteKeynote`
6. Click **"Import"** or **"Connect"**

### 3. Configure Settings

After reconnecting, verify:

1. **Production Branch**: Set to `main`
2. **Auto-deployments**: Enabled
3. **Build Settings**:
   - Framework: `Vite` (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**: 
   - Make sure all Firebase variables are still set
   - They should persist, but verify them

### 4. Test Auto-Deployment

1. Make a small change (or use existing commit)
2. Push to `main` branch
3. Watch Vercel Dashboard → Deployments
4. A new deployment should automatically start

## What This Fixes

- Resets webhook connections
- Refreshes Git integration
- Resets deployment triggers
- Fixes stale webhook issues
- Resets "Ignored Build Step" logic

## Important Notes

⚠️ **Before Disconnecting:**
- Make sure you have all environment variables documented
- Note your current build settings
- Ensure you have access to reconnect

✅ **After Reconnecting:**
- Environment variables should persist (but verify)
- Build settings should auto-detect (but verify)
- Webhooks will be recreated automatically

## Alternative: Just Check Settings First

Before disconnecting, try:
1. **Settings** → **Git** → Check "Ignored Build Step" is "Automatic"
2. **Settings** → **Git** → Verify Production Branch is `main`
3. **Deployments** → Manually trigger one to test

If manual deployment works but auto doesn't, then reconnect.


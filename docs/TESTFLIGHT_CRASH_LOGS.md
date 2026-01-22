# How to Get Crash Logs from TestFlight (Windows)

Since you're on Windows (no Mac), here's how to get crash information:

---

## Method 1: PostHog Dashboard (RECOMMENDED - Works on Windows)

**All errors are now automatically sent to PostHog!**

1. Go to **https://us.posthog.com**
2. Login with your PostHog account
3. Go to **Events** → Search for `app_error`
4. You'll see all crashes with:
   - Error message
   - Stack trace (first 1000 chars)
   - Screen where it happened (`record`)
   - Action (`startRecording`)
   - Timestamp
   - Device info

**To find the Record button crash:**
- Filter by: `event:app_error`
- Look for: `screen: "record"` and `action: "startRecording"`
- Click on the event to see full details

**This is the easiest way** since you're on Windows!

---

## Method 2: TestFlight App (On Your iPhone)

1. Open **TestFlight** app on your iPhone
2. Tap your app **"Unbind"**
3. Scroll down to **"Crash Reports"**
4. Tap on a crash report
5. Tap **"Share"** to email it to yourself
6. Open the email on your Windows PC and read the crash log

**Note**: Crash reports only appear if the app actually crashed (not just an error).

---

## Method 3: Xcode Organizer (Requires Mac Access)

If you have access to a Mac (friend, cloud service, etc.):

1. **Open Xcode** on Mac
2. **Window** → **Organizer** (or `Cmd + Shift + 9`)
3. Click **Crashes** tab
4. Select **"Unbind"** from sidebar
5. Click on crash to see full stack trace

---

## What I Added to Help Debug

### 1. ErrorBoundary Component
- Catches React crashes
- Shows error screen to user
- Sends crash to PostHog automatically

### 2. Enhanced Error Logging
- All errors in `record.tsx` now have `[RECORD]` prefix
- Errors are sent to PostHog with full context
- Console logs show detailed error info

### 3. PostHog Error Tracking
- Event: `app_error`
- Includes: error message, stack trace, screen, action, timestamp

---

## Next Steps

1. **Reproduce the crash** in TestFlight (tap Record button)
2. **Wait 1-2 minutes** for PostHog to receive the event
3. **Go to PostHog** → Events → Search `app_error`
4. **Find the crash** with `screen: "record"`
5. **Copy the error details** and share with me

The error will show:
- Exact error message
- Where it failed (premium check, permissions, audio, etc.)
- Stack trace (which function/file)

---

## Quick Debug Checklist

After the crash, check PostHog for:

- [ ] Event `app_error` exists
- [ ] Property `screen: "record"`
- [ ] Property `action: "startRecording"`
- [ ] Error message (what failed)
- [ ] Stack trace (where it failed)

With this info, I can fix the exact issue!

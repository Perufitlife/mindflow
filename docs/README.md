# Unbind - Legal & Support Pages

This folder contains all the legal and marketing pages required for App Store submission.

## Files Included

| File | Purpose | App Store Connect Field |
|------|---------|------------------------|
| `index.html` | Landing page | Marketing URL |
| `privacy.html` | Privacy Policy | Privacy Policy URL |
| `terms.html` | Terms of Service | (linked from privacy) |
| `support.html` | Support/FAQ | Support URL |

## How to Publish (GitHub Pages)

### Option 1: Using GitHub Pages (Free & Easy)

1. **Create a new repository** on GitHub named `unbindapp.github.io` (or use existing repo)

2. **Upload the docs folder contents**:
   ```bash
   # From the mindflow directory
   cd docs
   git init
   git add .
   git commit -m "Add legal pages"
   git remote add origin https://github.com/YOUR_USERNAME/unbindapp.github.io.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repo Settings > Pages
   - Source: Deploy from branch
   - Branch: main / root
   - Save

4. **Your URLs will be**:
   - Marketing: `https://unbindapp.github.io`
   - Privacy: `https://unbindapp.github.io/privacy.html`
   - Support: `https://unbindapp.github.io/support.html`

### Option 2: Using Custom Domain

1. Buy domain (e.g., `unbindapp.com`)
2. Follow GitHub Pages custom domain instructions
3. Add CNAME file to repo
4. Update URLs in App Store Connect

### Option 3: Using Vercel/Netlify

1. Connect your repo to Vercel or Netlify
2. Deploy the `docs` folder
3. Get your custom URL

## URLs for App Store Connect

Once published, use these URLs:

```
Privacy Policy URL: https://YOUR_DOMAIN/privacy.html
Support URL: https://YOUR_DOMAIN/support.html
Marketing URL: https://YOUR_DOMAIN (optional)
```

## Updating Content

The HTML files are standalone - just edit and push to update. No build process needed.

## Checklist Before Submission

- [ ] Pages are live and accessible
- [ ] Privacy Policy URL works
- [ ] Support URL works
- [ ] Email addresses are real and monitored
- [ ] Terms link from privacy page works

## Contact Emails

Make sure these emails are set up and monitored:
- `privacy@unbindapp.com` - Privacy inquiries
- `support@unbindapp.com` - General support
- `legal@unbindapp.com` - Legal matters
- `feedback@unbindapp.com` - Feature requests

(You can use email forwarding to redirect all to one inbox)

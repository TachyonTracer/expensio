# Expensio Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Set up production environment variables in Vercel
- [ ] Configure SMTP settings for contact form
- [ ] Set up database connection string
- [ ] Add Google Analytics ID (optional)
- [ ] Add Google Site Verification code (optional)

### 2. Performance Validation
- [ ] Run `npm run performance:build-test` locally
- [ ] Ensure all Lighthouse scores meet thresholds:
  - Performance: ≥90
  - Accessibility: ≥95
  - Best Practices: ≥90
  - SEO: ≥95
  - PWA: ≥80
- [ ] Test responsive design on mobile, tablet, and desktop
- [ ] Verify animations work smoothly across devices
- [ ] Check contact form functionality

### 3. SEO Optimization
- [ ] Verify meta tags are properly set
- [ ] Test Open Graph preview on social media
- [ ] Ensure sitemap.xml is accessible
- [ ] Check robots.txt configuration
- [ ] Validate structured data markup

### 4. Security & Best Practices
- [ ] Review security headers in vercel.json
- [ ] Ensure sensitive data is not exposed
- [ ] Test CORS configuration
- [ ] Verify rate limiting on contact form

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Environment Variables**
   Set these in Vercel dashboard:
   ```
   DATABASE_URL=your_production_database_url
   JWT_SECRET=your_production_jwt_secret
   JWT_REFRESH_SECRET=your_production_refresh_secret
   # Email (optional - remove these if you don't want to send emails)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FROM_EMAIL=noreply@expensio.com
   CONTACT_EMAIL=hello@expensio.com
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   GOOGLE_SITE_VERIFICATION=your_verification_code
   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ```

3. **Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Configure DNS records
   - Enable HTTPS (automatic with Vercel)

### Post-Deployment Verification

1. **Functionality Tests**
   - [ ] Landing page loads correctly
   - [ ] Contact form sends emails
   - [ ] Animations work properly
   - [ ] Mobile navigation functions
   - [ ] All links work correctly

2. **Performance Tests**
   ```bash
   # Test production site
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app npm run performance:test
   ```

3. **SEO Validation**
   - [ ] Test with Google PageSpeed Insights
   - [ ] Verify in Google Search Console
   - [ ] Check social media previews
   - [ ] Test with SEO analysis tools

## Monitoring & Maintenance

### Performance Monitoring
- Set up Vercel Analytics
- Monitor Core Web Vitals
- Track user interactions with Google Analytics
- Regular Lighthouse audits

### Contact Form Monitoring
- Monitor email delivery rates
- Check for spam submissions
- Review contact form analytics

### Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Update content and testimonials
- Refresh performance optimizations

## Troubleshooting

### Common Issues

1. **Contact Form Not Working**
   - Ensure SMTP credentials are configured (emails are skipped when SMTP is disabled)
   - Verify environment variables
   - Check email provider settings
   - Review server logs

2. **Poor Performance Scores**
   - Optimize images
   - Review JavaScript bundles
   - Check for layout shifts
   - Minimize CSS

3. **SEO Issues**
   - Verify meta tags
   - Check robots.txt
   - Ensure proper URL structure
   - Review structured data

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)

## Performance Benchmarks

Target metrics for production:
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 200ms
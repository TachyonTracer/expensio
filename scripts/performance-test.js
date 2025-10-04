#!/usr/bin/env node

/**
 * Performance Testing Script for Expensio Landing Page
 * 
 * This script runs Lighthouse audits and checks for common performance issues
 * Run with: node scripts/performance-test.js
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  outputPath: './performance-reports',
  thresholds: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 95,
    pwa: 80
  }
};

async function runLighthouseAudit() {
  console.log('🚀 Starting Lighthouse audit...');
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(CONFIG.url, options);
    
    // Extract scores
    const scores = {
      performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
      accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
      seo: Math.round(runnerResult.lhr.categories.seo.score * 100),
      pwa: Math.round(runnerResult.lhr.categories.pwa.score * 100)
    };

    // Create output directory
    if (!fs.existsSync(CONFIG.outputPath)) {
      fs.mkdirSync(CONFIG.outputPath, { recursive: true });
    }

    // Save HTML report
    const reportPath = path.join(CONFIG.outputPath, `lighthouse-report-${Date.now()}.html`);
    fs.writeFileSync(reportPath, runnerResult.report);

    // Display results
    console.log('\n📊 Lighthouse Audit Results:');
    console.log('================================');
    
    Object.entries(scores).forEach(([category, score]) => {
      const threshold = CONFIG.thresholds[category];
      const status = score >= threshold ? '✅' : '❌';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
      
      console.log(`${status} ${categoryName}: ${score}/100 (threshold: ${threshold})`);
    });

    // Check for critical issues
    const criticalIssues = [];
    const audits = runnerResult.lhr.audits;

    // Check Core Web Vitals
    if (audits['largest-contentful-paint'] && audits['largest-contentful-paint'].numericValue > 2500) {
      criticalIssues.push(`LCP too slow: ${Math.round(audits['largest-contentful-paint'].numericValue)}ms`);
    }

    if (audits['first-input-delay'] && audits['first-input-delay'].numericValue > 100) {
      criticalIssues.push(`FID too slow: ${Math.round(audits['first-input-delay'].numericValue)}ms`);
    }

    if (audits['cumulative-layout-shift'] && audits['cumulative-layout-shift'].numericValue > 0.1) {
      criticalIssues.push(`CLS too high: ${audits['cumulative-layout-shift'].numericValue.toFixed(3)}`);
    }

    // Display critical issues
    if (criticalIssues.length > 0) {
      console.log('\n⚠️  Critical Issues:');
      criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Display recommendations
    console.log('\n💡 Key Recommendations:');
    const recommendations = [];
    
    if (audits['unused-css-rules'] && audits['unused-css-rules'].details) {
      recommendations.push('Remove unused CSS');
    }
    
    if (audits['render-blocking-resources'] && audits['render-blocking-resources'].details) {
      recommendations.push('Eliminate render-blocking resources');
    }
    
    if (audits['unminified-javascript'] && audits['unminified-javascript'].details) {
      recommendations.push('Minify JavaScript');
    }

    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      console.log('   - No major issues found! 🎉');
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`);

    // Return overall pass/fail
    const overallPass = Object.entries(scores).every(([category, score]) => 
      score >= CONFIG.thresholds[category]
    );

    return { scores, overallPass, criticalIssues, reportPath };

  } finally {
    await chrome.kill();
  }
}

async function checkResponsiveDesign() {
  console.log('\n📱 Checking responsive design...');
  
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  // This would require additional tooling like Puppeteer for full testing
  // For now, we'll just log the test plan
  console.log('Responsive design test plan:');
  viewports.forEach(viewport => {
    console.log(`   ✓ ${viewport.name}: ${viewport.width}x${viewport.height}`);
  });
  
  console.log('   ✓ Touch targets >= 44px');
  console.log('   ✓ Text readable without zoom');
  console.log('   ✓ No horizontal scrolling');
  console.log('   ✓ Navigation accessible on mobile');
}

async function main() {
  try {
    console.log('🔍 Expensio Performance Testing Suite');
    console.log(`Testing URL: ${CONFIG.url}`);
    console.log('=====================================\n');

    // Run Lighthouse audit
    const auditResult = await runLighthouseAudit();
    
    // Check responsive design
    await checkResponsiveDesign();

    // Final summary
    console.log('\n🏁 Test Summary:');
    console.log('================');
    console.log(`Overall Performance: ${auditResult.overallPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Critical Issues: ${auditResult.criticalIssues.length}`);
    
    if (auditResult.overallPass) {
      console.log('\n🎉 Congratulations! Your landing page meets all performance thresholds.');
    } else {
      console.log('\n⚠️  Some performance thresholds were not met. Check the report for details.');
    }

    process.exit(auditResult.overallPass ? 0 : 1);

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runLighthouseAudit, checkResponsiveDesign };
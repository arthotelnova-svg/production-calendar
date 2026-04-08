#!/usr/bin/env node
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

async function runLighthouse(url) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      emulatedFormFactor: 'mobile',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    };

    const runnerResult = await lighthouse(url, options);

    const scores = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100,
      'best-practices': runnerResult.lhr.categories['best-practices'].score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100,
    };

    console.log('\n📊 Lighthouse Scores:');
    console.log(`Performance: ${scores.performance.toFixed(0)}/100`);
    console.log(`Accessibility: ${scores.accessibility.toFixed(0)}/100`);
    console.log(`Best Practices: ${scores['best-practices'].toFixed(0)}/100`);
    console.log(`SEO: ${scores.seo.toFixed(0)}/100`);

    // Save report
    const reportPath = path.join(__dirname, '../lighthouse-report.json');
    fs.writeFileSync(reportPath, runnerResult.report);
    console.log(`\n✅ Report saved to ${reportPath}`);

    // Check if all scores are >= 90
    const allPass = Object.values(scores).every((score) => score >= 90);
    if (allPass) {
      console.log('✅ All scores >= 90!');
      process.exit(0);
    } else {
      console.log('⚠️ Some scores below 90');
      process.exit(1);
    }
  } catch (err) {
    console.error('Lighthouse error:', err);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

const url = process.argv[2] || 'http://localhost:3000';
console.log(`🚀 Running Lighthouse on ${url}...`);
runLighthouse(url);

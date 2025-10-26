const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Performance audit configuration
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-meaningful-paint',
      'speed-index',
      'interactive',
      'cumulative-layout-shift',
      'total-blocking-time',
      'server-response-time',
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'uses-optimized-images',
      'uses-text-compression',
      'uses-responsive-images',
      'efficient-animated-content',
      'preload-lcp-image',
      'uses-rel-preconnect',
      'uses-rel-preload'
    ]
  }
};

// URLs to test
const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/shop',
  'http://localhost:3000/product/test-product',
  'http://localhost:3000/category/electronics'
];

// Performance thresholds
const thresholds = {
  'first-contentful-paint': 2000,
  'largest-contentful-paint': 2500,
  'first-meaningful-paint': 2000,
  'speed-index': 3000,
  'interactive': 3800,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,
  'server-response-time': 600
};

async function runPerformanceAudit() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
    ...config
  };

  const results = [];

  for (const url of urls) {
    console.log(`\nAuditing ${url}...`);
    
    try {
      const runnerResult = await lighthouse(url, options);
      const { lhr } = runnerResult;
      
      const auditResults = {
        url,
        score: lhr.categories.performance.score * 100,
        audits: {}
      };

      // Extract key metrics
      Object.keys(thresholds).forEach(auditKey => {
        if (lhr.audits[auditKey]) {
          const audit = lhr.audits[auditKey];
          auditResults.audits[auditKey] = {
            value: audit.numericValue || audit.score,
            displayValue: audit.displayValue,
            passed: audit.score >= 0.9,
            threshold: thresholds[auditKey]
          };
        }
      });

      results.push(auditResults);
      
      // Log results
      console.log(`Performance Score: ${auditResults.score.toFixed(1)}/100`);
      
      Object.entries(auditResults.audits).forEach(([key, audit]) => {
        const status = audit.passed ? '✅' : '❌';
        console.log(`${status} ${key}: ${audit.displayValue}`);
      });

    } catch (error) {
      console.error(`Error auditing ${url}:`, error.message);
    }
  }

  await chrome.kill();

  // Generate report
  generateReport(results);
  
  // Check if all audits passed
  const allPassed = results.every(result => 
    Object.values(result.audits).every(audit => audit.passed)
  );

  if (!allPassed) {
    console.log('\n❌ Some performance audits failed. Check the report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All performance audits passed!');
  }
}

function generateReport(results) {
  const reportPath = path.join(__dirname, '../reports/performance-report.json');
  const reportDir = path.dirname(reportPath);

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalUrls: results.length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      passedAudits: results.reduce((sum, r) => 
        sum + Object.values(r.audits).filter(a => a.passed).length, 0
      ),
      totalAudits: results.reduce((sum, r) => sum + Object.keys(r.audits).length, 0)
    },
    results,
    thresholds
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nPerformance report saved to: ${reportPath}`);

  // Generate HTML report
  generateHTMLReport(report);
}

function generateHTMLReport(report) {
  const htmlPath = path.join(__dirname, '../reports/performance-report.html');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .url-result { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .score { font-size: 24px; font-weight: bold; }
        .score.good { color: #0f9d58; }
        .score.average { color: #ff9800; }
        .score.poor { color: #f44336; }
        .audit { display: flex; justify-content: space-between; padding: 5px 0; }
        .audit.passed { color: #0f9d58; }
        .audit.failed { color: #f44336; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Performance Audit Report</h1>
    <div class="timestamp">Generated: ${report.timestamp}</div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Average Score: <strong>${report.summary.averageScore.toFixed(1)}/100</strong></p>
        <p>Passed Audits: <strong>${report.summary.passedAudits}/${report.summary.totalAudits}</strong></p>
        <p>URLs Tested: <strong>${report.summary.totalUrls}</strong></p>
    </div>

    ${report.results.map(result => `
        <div class="url-result">
            <h3>${result.url}</h3>
            <div class="score ${getScoreClass(result.score)}">${result.score.toFixed(1)}/100</div>
            
            <h4>Audit Results:</h4>
            ${Object.entries(result.audits).map(([key, audit]) => `
                <div class="audit ${audit.passed ? 'passed' : 'failed'}">
                    <span>${key}</span>
                    <span>${audit.displayValue} ${audit.passed ? '✅' : '❌'}</span>
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
  `;

  fs.writeFileSync(htmlPath, html);
  console.log(`HTML report saved to: ${htmlPath}`);
}

function getScoreClass(score) {
  if (score >= 90) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

// Run the audit
if (require.main === module) {
  runPerformanceAudit().catch(console.error);
}

module.exports = { runPerformanceAudit };
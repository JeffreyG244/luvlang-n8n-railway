/**
 * LUVLANG TEST RUNNER
 * Lightweight browser-based testing framework
 * Runs all test suites and reports results
 */

class TestRunner {
    constructor() {
        this.suites = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };
        this.currentSuite = null;
        this.output = [];
    }

    /**
     * Register a test suite
     */
    describe(name, fn) {
        const suite = {
            name,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };

        this.currentSuite = suite;
        fn();
        this.currentSuite = null;
        this.suites.push(suite);
    }

    /**
     * Register a test case
     */
    it(description, fn, options = {}) {
        if (!this.currentSuite) {
            throw new Error('it() must be called inside describe()');
        }

        this.currentSuite.tests.push({
            description,
            fn,
            skip: options.skip || false,
            timeout: options.timeout || 5000
        });
    }

    /**
     * Skip a test
     */
    skip(description, fn) {
        this.it(description, fn, { skip: true });
    }

    /**
     * Set beforeEach hook
     */
    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    /**
     * Set afterEach hook
     */
    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    /**
     * Set beforeAll hook
     */
    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = fn;
        }
    }

    /**
     * Set afterAll hook
     */
    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = fn;
        }
    }

    /**
     * Run all test suites
     */
    async run() {
        const startTime = performance.now();
        this.log('\n🧪 LUVLANG TEST RUNNER\n' + '='.repeat(50));

        for (const suite of this.suites) {
            await this.runSuite(suite);
        }

        this.results.duration = performance.now() - startTime;
        this.printSummary();

        return this.results;
    }

    /**
     * Run a single test suite
     */
    async runSuite(suite) {
        this.log(`\n📦 ${suite.name}`);

        // Run beforeAll
        if (suite.beforeAll) {
            try {
                await suite.beforeAll();
            } catch (error) {
                this.log(`  ⚠️  beforeAll failed: ${error.message}`, 'warn');
            }
        }

        for (const test of suite.tests) {
            this.results.total++;

            if (test.skip) {
                this.results.skipped++;
                this.log(`  ⏭️  SKIP: ${test.description}`, 'skip');
                continue;
            }

            // Run beforeEach
            if (suite.beforeEach) {
                try {
                    await suite.beforeEach();
                } catch (error) {
                    this.log(`  ⚠️  beforeEach failed: ${error.message}`, 'warn');
                }
            }

            // Run test with timeout
            try {
                await this.runWithTimeout(test.fn, test.timeout);
                this.results.passed++;
                this.log(`  ✅ ${test.description}`, 'pass');
            } catch (error) {
                this.results.failed++;
                this.log(`  ❌ ${test.description}`, 'fail');
                this.log(`     Error: ${error.message}`, 'error');
                if (error.stack) {
                    this.log(`     ${error.stack.split('\n')[1]?.trim()}`, 'error');
                }
            }

            // Run afterEach
            if (suite.afterEach) {
                try {
                    await suite.afterEach();
                } catch (error) {
                    this.log(`  ⚠️  afterEach failed: ${error.message}`, 'warn');
                }
            }
        }

        // Run afterAll
        if (suite.afterAll) {
            try {
                await suite.afterAll();
            } catch (error) {
                this.log(`  ⚠️  afterAll failed: ${error.message}`, 'warn');
            }
        }
    }

    /**
     * Run a function with timeout
     */
    runWithTimeout(fn, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
            }, timeout);

            Promise.resolve(fn())
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }

    /**
     * Log output
     */
    log(message, type = 'info') {
        const colors = {
            pass: '\x1b[32m',
            fail: '\x1b[31m',
            skip: '\x1b[33m',
            warn: '\x1b[33m',
            error: '\x1b[31m',
            info: '\x1b[0m',
            reset: '\x1b[0m'
        };

        const color = colors[type] || colors.info;
        console.log(`${color}${message}${colors.reset}`);
        this.output.push({ message, type });
    }

    /**
     * Print test summary
     */
    printSummary() {
        this.log('\n' + '='.repeat(50));
        this.log('📊 TEST SUMMARY\n');
        this.log(`   Total:   ${this.results.total}`);
        this.log(`   ✅ Passed:  ${this.results.passed}`, 'pass');
        this.log(`   ❌ Failed:  ${this.results.failed}`, this.results.failed > 0 ? 'fail' : 'info');
        this.log(`   ⏭️  Skipped: ${this.results.skipped}`, 'skip');
        this.log(`   ⏱️  Duration: ${this.results.duration.toFixed(2)}ms`);
        this.log('\n' + '='.repeat(50));

        if (this.results.failed === 0) {
            this.log('\n🎉 ALL TESTS PASSED!\n', 'pass');
        } else {
            this.log(`\n💥 ${this.results.failed} TEST(S) FAILED\n`, 'fail');
        }
    }

    /**
     * Get HTML report
     */
    getHTMLReport() {
        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

        return `
<!DOCTYPE html>
<html>
<head>
    <title>LuvLang Test Results</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'JetBrains Mono', monospace;
            background: #0a0a0f;
            color: #e0e0e0;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2rem;
            background: linear-gradient(135deg, #00d4ff, #b84fff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .summary {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-bottom: 40px;
        }
        .stat {
            text-align: center;
            padding: 20px 40px;
            background: #1a1a24;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-top: 5px;
        }
        .passed .stat-value { color: #00ff88; }
        .failed .stat-value { color: #ff3c3c; }
        .skipped .stat-value { color: #ffaa00; }
        .duration .stat-value { color: #00d4ff; }
        .output {
            background: #1a1a24;
            border-radius: 12px;
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .output-line {
            padding: 4px 0;
            font-size: 0.9rem;
        }
        .output-line.pass { color: #00ff88; }
        .output-line.fail { color: #ff3c3c; }
        .output-line.skip { color: #ffaa00; }
        .output-line.error { color: #ff3c3c; opacity: 0.8; }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #1a1a24;
            border-radius: 4px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 LuvLang Test Results</h1>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
        <p>${passRate}% Pass Rate</p>
    </div>
    <div class="summary">
        <div class="stat">
            <div class="stat-value">${this.results.total}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat passed">
            <div class="stat-value">${this.results.passed}</div>
            <div class="stat-label">Passed</div>
        </div>
        <div class="stat failed">
            <div class="stat-value">${this.results.failed}</div>
            <div class="stat-label">Failed</div>
        </div>
        <div class="stat skipped">
            <div class="stat-value">${this.results.skipped}</div>
            <div class="stat-label">Skipped</div>
        </div>
        <div class="stat duration">
            <div class="stat-value">${this.results.duration.toFixed(0)}</div>
            <div class="stat-label">Duration (ms)</div>
        </div>
    </div>
    <div class="output">
        ${this.output.map(o => `<div class="output-line ${o.type}">${this.escapeHTML(o.message)}</div>`).join('')}
    </div>
</body>
</html>`;
    }

    escapeHTML(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }
}

// Assertion helpers
const expect = (actual) => ({
    toBe: (expected) => {
        if (actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },
    toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },
    toBeTruthy: () => {
        if (!actual) {
            throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
        }
    },
    toBeFalsy: () => {
        if (actual) {
            throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
        }
    },
    toBeNull: () => {
        if (actual !== null) {
            throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
        }
    },
    toBeUndefined: () => {
        if (actual !== undefined) {
            throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
        }
    },
    toBeDefined: () => {
        if (actual === undefined) {
            throw new Error(`Expected defined value, got undefined`);
        }
    },
    toBeGreaterThan: (expected) => {
        if (actual <= expected) {
            throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
    },
    toBeLessThan: (expected) => {
        if (actual >= expected) {
            throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
    },
    toContain: (expected) => {
        if (!actual.includes(expected)) {
            throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        }
    },
    toHaveLength: (expected) => {
        if (actual.length !== expected) {
            throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
    },
    toThrow: (expectedMessage) => {
        try {
            actual();
            throw new Error(`Expected function to throw`);
        } catch (e) {
            if (expectedMessage && !e.message.includes(expectedMessage)) {
                throw new Error(`Expected error message to include "${expectedMessage}", got "${e.message}"`);
            }
        }
    },
    toBeInstanceOf: (expected) => {
        if (!(actual instanceof expected)) {
            throw new Error(`Expected instance of ${expected.name}`);
        }
    },
    toHaveProperty: (key, value) => {
        if (!(key in actual)) {
            throw new Error(`Expected object to have property "${key}"`);
        }
        if (value !== undefined && actual[key] !== value) {
            throw new Error(`Expected property "${key}" to be ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`);
        }
    }
});

// Create singleton instance
const testRunner = new TestRunner();

// Export test DSL
const describe = testRunner.describe.bind(testRunner);
const it = testRunner.it.bind(testRunner);
const test = it;
const beforeEach = testRunner.beforeEach.bind(testRunner);
const afterEach = testRunner.afterEach.bind(testRunner);
const beforeAll = testRunner.beforeAll.bind(testRunner);
const afterAll = testRunner.afterAll.bind(testRunner);

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestRunner,
        testRunner,
        describe,
        it,
        test,
        expect,
        beforeEach,
        afterEach,
        beforeAll,
        afterAll
    };
}

if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
    window.testRunner = testRunner;
    window.describe = describe;
    window.it = it;
    window.test = test;
    window.expect = expect;
    window.beforeEach = beforeEach;
    window.afterEach = afterEach;
    window.beforeAll = beforeAll;
    window.afterAll = afterAll;
}

export {
    TestRunner,
    testRunner,
    describe,
    it,
    test,
    expect,
    beforeEach,
    afterEach,
    beforeAll,
    afterAll
};

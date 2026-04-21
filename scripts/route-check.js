const fs = require('fs');
const path = require('path');

const APP_TSX_PATH = path.join(__dirname, '../frontend/src/App.tsx');
const ROUTE_DOC_PATH = path.join(__dirname, '../ROUTE_DOC.md');
const REPORT_PATH = path.join(__dirname, '../ROUTE_REPORT.md');

// 1. Read App.tsx
if (!fs.existsSync(APP_TSX_PATH)) {
    console.error(`Error: ${APP_TSX_PATH} not found.`);
    process.exit(1);
}

const content = fs.readFileSync(APP_TSX_PATH, 'utf-8');

// 2. Extract Routes
// Match any <Route ... /> tag
const tagRegex = /<Route\s+([^>]+?)\/>/g;
const routes = [];
let match;

while ((match = tagRegex.exec(content)) !== null) {
    const attributes = match[1];
    const line = content.substring(0, match.index).split('\n').length;
    
    // Extract path
    const pathMatch = attributes.match(/path="([^"]+)"/);
    const pathValue = pathMatch ? pathMatch[1] : (attributes.includes('index') ? '/' : null); // Treat index as / (root) or separate?

    // Extract element component name
    // element={<Login />} or element={<Navigate ... />}
    const elementMatch = attributes.match(/element=\{<([A-Za-z0-9_]+)/);
    const component = elementMatch ? elementMatch[1] : 'Unknown';

    if (pathValue) {
        routes.push({
            path: pathValue,
            component: component,
            line: line
        });
    }
}

console.log(`Found ${routes.length} routes.`);

// 3. Validate Conflicts
const pathMap = new Map();
const duplicates = [];

routes.forEach(route => {
    // Ignore dynamic routes for conflict check if needed, or check exact match
    if (pathMap.has(route.path)) {
        duplicates.push({
            path: route.path,
            existing: pathMap.get(route.path),
            current: route
        });
    } else {
        pathMap.set(route.path, route);
    }
});

if (duplicates.length > 0) {
    console.error('❌ Route Conflict Detected:');
    duplicates.forEach(d => {
        console.error(`   Path "${d.path}" is defined in ${d.existing.component} (Line ${d.existing.line}) and ${d.current.component} (Line ${d.current.line})`);
    });
    // Generate Failure Report
    const failureReport = `# 🚨 Route Update Failure Report
**Time:** ${new Date().toISOString()}
**Status:** FAILED
**Reason:** Duplicate Routes Detected

## Conflicts
${duplicates.map(d => `- **${d.path}**: Conflict between ${d.existing.component} and ${d.current.component}`).join('\n')}
`;
    fs.writeFileSync(REPORT_PATH, failureReport);
    process.exit(1);
}

console.log('✅ Route Validation Passed: No duplicates found.');

// 4. Generate Documentation
let docContent = `# Application Route Documentation
*Auto-generated on ${new Date().toISOString()}*

| Path | Component | Description |
|------|-----------|-------------|
`;

routes.sort((a, b) => a.path.localeCompare(b.path)).forEach(route => {
    docContent += `| \`${route.path}\` | ${route.component} | - |\n`;
});

fs.writeFileSync(ROUTE_DOC_PATH, docContent);
console.log(`✅ Documentation updated at ${ROUTE_DOC_PATH}`);

// 5. Generate Success Report
const successReport = `# ✅ Route Update Success Report
**Time:** ${new Date().toISOString()}
**Status:** VALIDATED & DOCUMENTED
**Total Routes:** ${routes.length}

## Changes
- Documentation updated.
- Validation passed.

## Route List
${routes.map(r => `- ${r.path} -> ${r.component}`).join('\n')}
`;

fs.writeFileSync(REPORT_PATH, successReport);

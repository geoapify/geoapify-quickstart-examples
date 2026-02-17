const { inlineSource } = require('inline-source');
const fs = require('fs').promises;
const path = require('path');

const CATEGORIES = [
    'maps',
    'routing',
    'isolines',
    'geocoder-autocomplete',
    'other'
];

async function findExamples() {
    const examples = [];

    for (const category of CATEGORIES) {
        const categoryPath = path.join(__dirname, category);

        try {
            const entries = await fs.readdir(categoryPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const examplePath = path.join(categoryPath, entry.name);
                    const srcPath = path.join(examplePath, 'src');
                    const indexPath = path.join(srcPath, 'index.html');

                    try {
                        await fs.access(indexPath);
                        examples.push({
                            name: entry.name,
                            category,
                            path: examplePath,
                            srcPath,
                            indexPath
                        });
                    } catch {
                        // No src/index.html, skip
                    }
                }
            }
        } catch {
            // Category folder doesn't exist, skip
        }
    }

    return examples;
}

async function combineExample(example) {
    const outputPath = path.join(example.path, 'index.html');

    try {
        const html = await inlineSource(example.indexPath, {
            compress: false,
            rootpath: example.srcPath
        });

        await fs.writeFile(outputPath, html, 'utf-8');
        return { success: true, example };
    } catch (err) {
        return { success: false, example, error: err.message };
    }
}

async function main() {
    console.log('🔍 Finding examples...\n');
    const examples = await findExamples();

    console.log(`📦 Found ${examples.length} examples\n`);

    let successCount = 0;
    let failCount = 0;

    for (const example of examples) {
        const result = await combineExample(example);

        if (result.success) {
            console.log(`✅ ${example.category}/${example.name}`);
            successCount++;
        } else {
            console.log(`❌ ${example.category}/${example.name}: ${result.error}`);
            failCount++;
        }
    }

    console.log(`\n📊 Results: ${successCount} success, ${failCount} failed`);
}

main().catch(console.error);


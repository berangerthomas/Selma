import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const taxonomiesDir = path.join(__dirname, '../public/data/taxonomies');
const outputFile = path.join(__dirname, '../public/data/taxonomies.json');

try {
  if (!fs.existsSync(taxonomiesDir)) {
    console.warn(`Directory ${taxonomiesDir} does not exist. Creating empty registry.`);
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    process.exit(0);
  }

  const files = fs.readdirSync(taxonomiesDir);
  const taxonomies = files
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const id = path.basename(file, '.json');
      return {
        id,
        // The name will be translated in the UI, but we can provide a default
        label: id.charAt(0).toUpperCase() + id.slice(1)
      };
    });

  fs.writeFileSync(outputFile, JSON.stringify(taxonomies, null, 2));
  console.log(`Generated ${outputFile} with ${taxonomies.length} taxonomies.`);
} catch (error) {
  console.error('Error generating taxonomies registry:', error);
  process.exit(1);
}

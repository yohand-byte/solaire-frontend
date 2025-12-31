import path from 'path';
import { generateDpPack } from './generator';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const address = args.join(' ').trim();

  if (!address) {
    console.error('Usage: node src/dp/cli.ts "14 Rue Emile Nicol, 14430 Dozule"');
    process.exit(1);
  }

  const pdfPath = await generateDpPack(address);
  console.log(`PDF generated: ${pdfPath}`);
  console.log(`Output directory: ${path.dirname(pdfPath)}`);
}

main().catch((error) => {
  console.error('Generation failed:', error.message || error);
  process.exit(1);
});

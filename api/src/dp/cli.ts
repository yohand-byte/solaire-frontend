import path from 'path';
import { generateDpPack } from './generator';

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const address = getFlag(args, '--address') || getFlag(args, '--site') || args.filter(a => !a.startsWith('--')).join(' ').trim();
  if (!address) {
    console.error('Usage: npx -y tsx src/dp/cli.ts --address "..." --issuer "..." --owner "..." --title "..."');
    process.exit(1);
  }

  const meta = {
    issuerName: getFlag(args, '--issuer'),
    issuerTagline: getFlag(args, '--tagline'),
    ownerName: getFlag(args, '--owner'),
    projectTitle: getFlag(args, '--title'),
    parcelRef: getFlag(args, '--parcel'),
    powerKw: getFlag(args, '--power'),
    surfaceM2: getFlag(args, '--surface'),
    panelType: getFlag(args, '--panel'),
    roofType: getFlag(args, '--roof'),
    orientation: getFlag(args, '--orientation'),
    slope: getFlag(args, '--slope'),
  };

  const pdfPath = await generateDpPack(address, { meta });
  console.log(`PDF generated: ${pdfPath}`);
  console.log(`Output directory: ${path.dirname(pdfPath)}`);
}

main().catch((error) => {
  console.error('Generation failed:', error.message || error);
  process.exit(1);
});

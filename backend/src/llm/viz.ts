// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { buildGeneralAnalysisFlow, buildSignalHunterFlow } from './flows';
import { execSync } from 'child_process';

const outDir = path.resolve(process.cwd(), '../docs/graphs');
fs.mkdirSync(outDir, { recursive: true });

function exportFlow(name: string, graph: any) {
  const dot = graph.toDot();
  const dotFile = path.join(outDir, `${name}.dot`);
  const svgFile = path.join(outDir, `${name}.svg`);
  fs.writeFileSync(dotFile, dot);
  try {
    execSync(`dot -Tsvg ${dotFile} -o ${svgFile}`);
    console.log(`[viz] exported ${svgFile}`);
  } catch (err) {
    console.warn('[viz] graphviz dot not found, SVG not generated');
  }
}

exportFlow('general_analysis', buildGeneralAnalysisFlow());
exportFlow('signal_hunter', buildSignalHunterFlow()); 
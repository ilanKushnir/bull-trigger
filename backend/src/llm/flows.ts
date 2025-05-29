// @ts-nocheck
import { Graph } from '@langchain/langgraph';
import { getLLM } from './router';

export function buildGeneralAnalysisFlow() {
  const graph = new Graph();
  const llm = getLLM('deep');
  graph.addNode('analysis', llm);
  graph.setEntry('analysis');
  graph.setExit('analysis');
  return graph;
}

export function buildSignalHunterFlow() {
  const graph = new Graph();
  const llm = getLLM('cheap');
  graph.addNode('hunter', llm);
  graph.setEntry('hunter');
  graph.setExit('hunter');
  return graph;
} 
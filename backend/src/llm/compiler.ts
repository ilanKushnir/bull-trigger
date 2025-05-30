// @ts-nocheck
import { Graph } from '@langchain/langgraph';
import fs from 'fs';
import path from 'path';
import { strategyFlowRepo } from '../repo/strategyFlowRepo';
import { getLLM } from './router';
import { execSync } from 'child_process';

export function buildLangGraphFromDb(strategyId:number){
  const {calls,edges}=strategyFlowRepo.listFlow(strategyId);
  const graph=new Graph();
  const nodeMap:Record<number,string>={};
  // create nodes
  for(const call of calls){
    const nodeName=`call_${call.id}`;
    nodeMap[call.id]=nodeName;
    const cfg=JSON.parse(call.config_json);
    if(call.type==='model'){
      const llm=getLLM(cfg.modelTier==='deep'?'deep':'cheap');
      graph.addNode(nodeName,llm);
    }else{
      // api call node – treat as passthrough that returns cfg
      graph.addNode(nodeName,async()=>cfg);
    }
  }
  // link sequentially by order
  for(let i=0;i<calls.length-1;i++){
    graph.addEdge(nodeMap[calls[i].id],nodeMap[calls[i+1].id]);
  }
  // trigger edges
  for(const e of edges){
    if(nodeMap[e.src_call_id]){
      graph.addEdge(nodeMap[e.src_call_id],`strategy_${e.dst_strategy_id}`);
    }
  }
  graph.setEntry(nodeMap[calls[0]?.id]);
  graph.setExit(nodeMap[calls[calls.length-1]?.id]);
  return graph;
}

export function exportGraphDot(strategyId:number){
  const graph=buildLangGraphFromDb(strategyId);
  const dot=graph.toDot();
  const file=`/tmp/strategy_${strategyId}.dot`;
  fs.writeFileSync(file,dot);
  const svg=`/tmp/strategy_${strategyId}.svg`;
  try{execSync(`dot -Tsvg ${file} -o ${svg}`);}catch{}
  return {dotPath:file, svgPath:svg, dot};
} 
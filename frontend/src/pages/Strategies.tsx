import React, { useEffect, useState } from 'react';
import ReactFlow, { Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/strategies').then((r) => setStrategies(r.data));
  }, []);

  useEffect(() => {
    if (selected) {
      axios.get(`/api/strategies/${selected.id}/flow`).then((r) => {
        const { calls, edges } = r.data;
        setNodes(
          calls.map((c: any) => ({ id: String(c.id), position: { x: c.order_idx * 150, y: 50 }, data: { label: c.type } }))
        );
        setEdges(edges.map((e: any) => ({ id: String(e.id), source: String(e.src_call_id), target: 'S' + e.dst_strategy_id })));
      });
    }
  }, [selected]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 200, borderRight: '1px solid #ddd', padding: 8 }}>
        <h3>Strategies</h3>
        {strategies.map((s) => (
          <div key={s.id} style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => setSelected(s)}>
            {s.name}
          </div>
        ))}
      </aside>
      <div style={{ flex: 1 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
} 
import React, { useEffect, useState } from 'react';
import ReactFlow, { Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import Editor from '@monaco-editor/react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/strategies').then((r) => setStrategies(r.data));
  }, []);

  useEffect(() => {
    if (selected) {
      axios.get(`/api/strategies/${selected.id}/flow`).then((r) => {
        const { calls, edges } = r.data;
        setNodes(
          calls.map((c: any) => ({ id: String(c.id), position: { x: c.order_idx * 150, y: 50 }, data: { label: c.type, onClick: () => setSelectedCall(c) } }))
        );
        setEdges(edges.map((e: any) => ({ id: String(e.id), source: String(e.src_call_id), target: 'S' + e.dst_strategy_id })));
      });
    }
  }, [selected]);

  function saveCall(updated: any) {
    axios.patch(`/api/calls/${updated.id}`, updated).then(() => loadFlow());
  }

  function loadFlow() {
    axios.get(`/api/strategies/${selected.id}/flow`).then((r) => {
      const { calls, edges } = r.data;
      setNodes(calls.map((c: any) => ({ id: String(c.id), position: { x: c.order_idx * 150, y: 50 }, data: { label: c.type, onClick: () => setSelectedCall(c) } })));
      setEdges(edges.map((e: any) => ({ id: String(e.id), source: String(e.src_call_id), target: 'S' + e.dst_strategy_id })));
    });
  }

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
      <div style={{ width: 300, borderLeft: '1px solid #ddd', padding: 8 }}>
        {selectedCall && (
          <div>
            <h4>Node {selectedCall.id}</h4>
            <label>Type<select value={selectedCall.type} onChange={e => setSelectedCall({ ...selectedCall, type: e.target.value })}>
              <option value="api">API</option>
              <option value="model">Model</option>
            </select></label>
            <Editor height="200px" language="yaml" value={selectedCall.config_json} onChange={(v) => setSelectedCall({ ...selectedCall, config_json: v })} />
            <button onClick={() => saveCall(selectedCall)}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
} 
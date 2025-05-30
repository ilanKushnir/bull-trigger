// @ts-nocheck
import React, { useEffect, useState } from 'react';
import ReactFlow, { Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function refreshList(){axios.get('/api/strategies').then(r=>setStrategies(r.data));}

  useEffect(() => {
    refreshList();
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

  const onConnect = (params: any) => {
    axios.post(`/api/strategies/${selected.id}/edges`, { src_call_id: params.source, dst_strategy_id: selected.id }).then(() => loadFlow());
  };

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
        <ReactFlow nodes={nodes} edges={edges} fitView onConnect={onConnect} connectionLineStyle={{ stroke: '#888' }}>
          <Background />
        </ReactFlow>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 200, right: 300, height: 40, background: '#fafafa', borderBottom: '1px solid #ddd', display: 'flex', gap: 8, padding: 4 }}>
        <button onClick={() => {
          axios.post(`/api/strategies/${selected.id}/calls`, { order_idx: nodes.length, type: 'api', config: { url: 'https://', method: 'GET' } }).then(() => loadFlow());
        }}>+API</button>
        <button onClick={() => {
          axios.post(`/api/strategies/${selected.id}/calls`, { order_idx: nodes.length, type: 'model', config: { modelTier: 'cheap', prompt_id: null } }).then(() => loadFlow());
        }}>+Model</button>
        <button onClick={() => setLinkMode(!linkMode)}>{linkMode ? 'Cancel Link' : 'Link Mode'}</button>
        <button onClick={() => axios.post(`/api/strategies/${selected.id}/compile`).then(() => setPreview(`/api/strategies/${selected.id}/preview?${Date.now()}`))}>Compile</button>
        <button onClick={() => axios.post(`/api/strategies/${selected.id}/run`)}>Run Now</button>
        <button onClick={() => {
          axios.put(`/api/strategies/${selected.id}`, { enabled: !selected.enabled }).then(() => refreshList());
        }}>{selected?.enabled ? 'Disable' : 'Enable'}</button>
      </div>
      {preview && <img src={preview} style={{ position: 'absolute', bottom: 0, right: 0, width: 300, border: '1px solid #ccc' }} />}
      <div style={{ width: 300, borderLeft: '1px solid #ddd', padding: 8 }}>
        {selectedCall && (
          <div>
            <h4>Node {selectedCall.id}</h4>
            <label>Type<select value={selectedCall.type} onChange={e => setSelectedCall({ ...selectedCall, type: e.target.value })}>
              <option value="api">API</option>
              <option value="model">Model</option>
            </select></label>
            <Editor height="200px" language="yaml" value={yaml.dump(JSON.parse(selectedCall.config_json))} onChange={(v) => setSelectedCall({ ...selectedCall, config_json: JSON.stringify(yaml.load(v || '{}')) })} />
            <button onClick={() => saveCall(selectedCall)}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
} 
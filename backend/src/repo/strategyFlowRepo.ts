// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';

const DB = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(DB);

export type Call = { id:number; order_idx:number; type:string; config_json:string };
export type Edge = { id:number; src_call_id:number; dst_strategy_id:number };

export const strategyFlowRepo = {
  addCall(strategyId:number, orderIdx:number, type:string, config:any) {
    const res:any = db.prepare('INSERT INTO strategy_calls (strategy_id, order_idx, type, config_json) VALUES (?,?,?,?)').run(strategyId, orderIdx, type, JSON.stringify(config));
    return res.lastInsertRowid;
  },
  updateCall(id:number, patch:any) {
    const row = db.prepare('SELECT * FROM strategy_calls WHERE id=?').get(id);
    if(!row) throw new Error('call not found');
    const cfg = patch.config ? JSON.stringify(patch.config) : row.config_json;
    db.prepare('UPDATE strategy_calls SET order_idx=?, type=?, config_json=? WHERE id=?').run(patch.order_idx??row.order_idx, patch.type??row.type, cfg, id);
  },
  deleteCall(id:number){db.prepare('DELETE FROM strategy_calls WHERE id=?').run(id);},
  addEdge(srcCall:number,dstStrategy:number){return db.prepare('INSERT INTO strategy_edges (src_call_id,dst_strategy_id) VALUES (?,?)').run(srcCall,dstStrategy).lastInsertRowid;},
  listFlow(strategyId:number){
    const calls = db.prepare('SELECT * FROM strategy_calls WHERE strategy_id=? ORDER BY order_idx').all(strategyId);
    const edges = db.prepare('SELECT * FROM strategy_edges WHERE src_call_id IN (SELECT id FROM strategy_calls WHERE strategy_id=?)').all(strategyId);
    return {calls,edges};
  }
}; 
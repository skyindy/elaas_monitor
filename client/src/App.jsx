import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  CheckSquare, Square, Play, BarChart2, Database, List, CheckCircle, XCircle, Loader2,
  TrendingUp, Activity, PieChart as PieChartIcon, RefreshCcw
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// --- Sub-components ---

const PreviewTable = ({ results, onExport }) => {
  const [selectedDb, setSelectedDb] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // If there's an API error returned directly as an object
  const isErrorObject = results && typeof results === 'object' && !Array.isArray(results) && results.error;

  useEffect(() => {
    if (Array.isArray(results) && results.length > 0) {
      const stillExists = results.some(r => r.id === selectedDb);
      if (!selectedDb || !stillExists) {
        const firstSuccess = results.find(r => r.status === 'SUCCESS');
        if (firstSuccess) setSelectedDb(firstSuccess.id);
      }
    }
  }, [results, selectedDb]);

  if (isErrorObject) {
    return <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}><strong>Server Error:</strong> {results.error}</div>;
  }

  if (!results || !Array.isArray(results) || results.every(r => r.status !== 'SUCCESS' && r.status !== 'ERROR')) {
    return <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>No data returned from any database.</p>;
  }

  const currentData = results.find(r => r.id === selectedDb)?.data || [];
  const keys = currentData.length > 0 ? Object.keys(currentData[0]) : [];
  const errors = results.filter(r => r.status === 'ERROR');

  const sortedData = [...currentData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {results.map(r => (
          <button 
            key={r.id} 
            className={selectedDb === r.id ? '' : 'secondary'}
            style={{ 
              fontSize: '0.8rem', 
              whiteSpace: 'nowrap',
              border: r.status === 'ERROR' ? '1px solid #ef4444' : 'none' 
            }}
            disabled={r.status !== 'SUCCESS' && r.status !== 'ERROR'}
            onClick={() => setSelectedDb(r.id)}
          >
            {r.name} {r.status === 'ERROR' ? '❌' : `(${r.data?.length || 0})`}
          </button>
        ))}
        {selectedDb && results.find(r => r.id === selectedDb)?.status === 'SUCCESS' && (
          <button 
            onClick={() => onExport(`${results.find(r => r.id === selectedDb).name}_Result`, [results.find(r => r.id === selectedDb)], false)}
            style={{ background: '#10b981', marginLeft: '1rem', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            📥 Export {results.find(r => r.id === selectedDb).name}
          </button>
        )}
      </div>

      {errors.length > 0 && selectedDb && results.find(r => r.id === selectedDb)?.status === 'ERROR' && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '4px', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.85rem' }}>
          <strong>Error:</strong> {results.find(r => r.id === selectedDb).message}
        </div>
      )}

      <div className="table-container" style={{ maxHeight: '500px', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
        {currentData.length > 0 ? (
          <table className="result-table">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 1 }}>
              <tr>
                {keys.map(k => (
                  <th 
                    key={k} 
                    style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                      let direction = 'asc';
                      if (sortConfig.key === k && sortConfig.direction === 'asc') direction = 'desc';
                      setSortConfig({ key: k, direction });
                    }}
                  >
                    {k} {sortConfig.key === k ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, i) => (
                <tr key={i}>
                  {keys.map(k => (
                    <td key={k} style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      {typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : String(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '2rem', textAlign: 'center' }}>{selectedDb && results.find(r => r.id === selectedDb)?.status === 'ERROR' ? 'Database Error' : 'No results for selected database.'}</p>
        )}
      </div>
    </div>
  );
};

const Pagination = ({ totalItems, pageSize, currentPage, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Show:</span>
        <input 
          type="number" 
          value={pageSize} 
          onChange={(e) => onPageSizeChange(Math.max(1, parseInt(e.target.value) || 1))} 
          style={{ width: '60px', padding: '2px 5px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px' }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>items per page</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>Prev</button>
        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Page <strong>{currentPage}</strong> of {totalPages}</span>
        <button className="secondary" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>Next</button>
      </div>
    </div>
  );
};

const GenericReportCard = ({ report, index, onSave, onRun, onStop, onDelete, params, setParams, isRunning, runningId, detectParams, result, handleExport, accentColor = '#f59e0b', titleLabel = 'REPORT TITLE', categories = [], connections = [] }) => {
  const [localSql, setLocalSql] = useState(report.sql || '');
  const [localTitle, setLocalTitle] = useState(report.title || '');
  const [localHost, setLocalHost] = useState(report.host || '');
  const [localCategory, setLocalCategory] = useState(report.category || '');
  const [localTargetType, setLocalTargetType] = useState(report.targetType || 'specific');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalSql(report.sql || '');
    setLocalTitle(report.title || '');
    setLocalHost(report.host || '');
    setLocalCategory(report.category || '');
    setLocalTargetType(report.targetType || 'specific');
  }, [report.id]);

  const handleSync = (override = {}) => {
    const nextSql = override.sql !== undefined ? override.sql : localSql;
    const nextTitle = override.title !== undefined ? override.title : localTitle;
    const nextHost = override.host !== undefined ? override.host : localHost;
    const nextCategory = override.category !== undefined ? override.category : localCategory;
    const nextTargetType = override.targetType !== undefined ? override.targetType : localTargetType;

    if (nextSql !== report.sql || nextTitle !== report.title || nextHost !== report.host || nextCategory !== report.category || nextTargetType !== report.targetType) {
      onSave({ ...report, sql: nextSql, title: nextTitle, host: nextHost, category: nextCategory, targetType: nextTargetType });
    }
  };

  const currentParams = detectParams(localSql);

  return (
    <div className="glass-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0', overflow: 'hidden' }}>
      <div 
        style={{ background: `${accentColor}11`, padding: '0.75rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: isExpanded ? '1px solid var(--border)' : 'none', cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: accentColor, minWidth: '40px' }}>
          {isExpanded ? '▼' : '▶'} #{index + 1}
        </div>
        <div style={{ flex: '0 0 170px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2px' }} onClick={e => e.stopPropagation()}>
            <label style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px', color: accentColor, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="radio" name={`targetType-${report.id}`} value="specific" checked={localTargetType === 'specific'} onChange={() => { setLocalTargetType('specific'); handleSync({ targetType: 'specific' }); }} style={{ margin: 0, transform: 'scale(0.8)' }} />
              FIX IP
            </label>
            <label style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px', color: accentColor, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="radio" name={`targetType-${report.id}`} value="all" checked={localTargetType === 'all'} onChange={() => { setLocalTargetType('all'); handleSync({ targetType: 'all' }); }} style={{ margin: 0, transform: 'scale(0.8)' }} />
              All DBs
            </label>
          </div>
          {localTargetType === 'specific' ? (
            <select 
              style={{ background: 'transparent', border: 'none', borderBottom: !localHost ? '1px solid #ef4444' : `1px solid ${accentColor}`, padding: '2px 0', fontSize: '0.85rem', color: '#fff', width: '100%', cursor: 'pointer' }}
              value={localHost} 
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { 
                const val = e.target.value;
                setLocalHost(val); 
                handleSync({ host: val }); 
              }}
            >
              <option value="" style={{ background: '#1e293b' }}>-- Select IP --</option>
              {connections.map((c, idx) => (
                <option key={idx} value={c.host} style={{ background: '#1e293b' }}>
                  {c.name} ({c.host || 'N/A'})
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', padding: '2px 0' }}>All Active DBs</div>
          )}
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <label style={{ fontSize: '0.65rem', display: 'block', color: accentColor }}>CATEGORY</label>
          <select 
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '2px 0', fontSize: '0.85rem', color: '#fff', width: '100%', cursor: 'pointer' }}
            value={localCategory}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { setLocalCategory(e.target.value); handleSync({ category: e.target.value }); }}
          >
            <option value="" style={{ background: '#1e293b' }}>-- Select --</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat} style={{ background: '#1e293b' }}>{cat}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '0 0 200px' }}>
          <label style={{ fontSize: '0.65rem', display: 'block', color: 'var(--primary)' }}>{titleLabel}</label>
          <input 
            placeholder="Name" 
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--primary)', padding: '2px 0', fontSize: '0.9rem', color: '#fff', width: '100%' }}
            value={localTitle} 
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleSync}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {currentParams.map(p => (
            <div key={p} style={{ minWidth: '100px' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--secondary)', display: 'block' }}>{p}</label>
              <input 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '2px 5px', fontSize: '0.8rem', borderRadius: '4px', color: '#fff' }}
                placeholder={p}
                value={params?.[p] || ''} 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setParams({ ...params, [p]: e.target.value })} 
              />
            </div>
          ))}
          <button 
            style={{ 
              background: runningId === report.id ? '#ef4444' : accentColor, 
              padding: '0.4rem 1.2rem', 
              fontSize: '0.85rem', 
              fontWeight: 'bold', 
              marginLeft: '0.5rem', 
              color: runningId === report.id ? '#fff' : '#000' 
            }} 
            onClick={(e) => { 
              e.stopPropagation(); 
              try {
                if (runningId === report.id) onStop();
                else {
                  if (!localSql || localSql.trim() === '') {
                    alert('กรุณากรอกคำสั่ง SQL ก่อนรันคิวรี่ค่ะ');
                    return;
                  }
                  if (localTargetType === 'specific' && !localHost) {
                    alert('กรุณาเลือก Target IP ก่อนรันคิวรี่ค่ะ');
                    return;
                  }
                  onRun({ ...report, sql: localSql, title: localTitle }, params, localTargetType === 'all' ? null : localHost); 
                }
              } catch (err) {
                alert('UI Error: ' + err.message);
              }
            }}
            disabled={(isRunning && runningId !== report.id)}
          >

            {runningId === report.id ? '⛔ STOP' : (isExpanded ? '🚀 RUN QUERY' : '🚀 RUN')}
          </button>
          <button 
            className="danger" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', marginLeft: '0.5rem' }} 
            onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
          >
            DEL
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.5rem', color: 'var(--secondary)' }}>SQL QUERY EDITOR</label>
            <textarea 
              rows="6" 
              style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', width: '100%', color: '#fff' }} 
              value={localSql} 
              onChange={(e) => setLocalSql(e.target.value)}
              onBlur={handleSync}
            />
          </div>
          {runningId === report.id && (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px dashed var(--primary)', marginTop: '1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>⌛ กำลังประมวลผลคิวรี่ กรุณารอซักครู่...</p>
            </div>
          )}

          {result && runningId !== report.id && (
            <div style={{ borderTop: '1px dotted var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Results</h4>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✅ คิวรี่เสร็จแล้ว ({result.timestamp})</span>
                </div>
                <button onClick={() => handleExport(result.query.title, result.data, result.ipOverrides === null)} style={{ background: '#10b981', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>📥 Excel</button>
              </div>
              <PreviewTable results={result.data} onExport={handleExport} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MonitorCard = ({ q, i, currentPage, pageSize, result, handleRun, handleStop, setShowModal, setEditingQuery, queries, saveQueries, handleExport, isRunning, runningId, isSelected, onToggleSelect, batchStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSql = q.sql && q.sql.trim().length > 0;

  return (
    <div className={`glass-card monitor-card ${isSelected ? 'selected' : ''} ${!hasSql ? 'disabled' : ''}`} 
         style={{ 
           padding: 0, 
           overflow: 'hidden', 
           border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
           opacity: hasSql ? 1 : 0.6,
           cursor: hasSql ? 'default' : 'not-allowed'
         }}>
      <div 
        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)' }}
        onClick={() => hasSql && setIsExpanded(!isExpanded)}
      >
        <div 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (hasSql) onToggleSelect(); 
          }}
          style={{ 
            cursor: hasSql ? 'pointer' : 'not-allowed', 
            color: !hasSql ? 'var(--border)' : (isSelected ? 'var(--primary)' : 'var(--secondary)') 
          }}
        >
          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--secondary)', minWidth: '30px' }}>
          {i + 1}
        </div>
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', minWidth: '120px' }}>
          {q.menu || '-'}
        </div>
        <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: hasSql ? '#fff' : 'var(--secondary)' }}>{q.title}</span>
          {!hasSql && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              No SQL Query
            </span>
          )}
          {batchStatus?.status === 'loading' && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />}
          {batchStatus?.status === 'success' && <CheckCircle size={14} style={{ color: '#10b981' }} />}
          {batchStatus?.status === 'error' && <XCircle size={14} style={{ color: '#ef4444' }} />}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => {
              if (runningId === q.id) handleStop();
              else handleRun(q);
            }} 
            disabled={(isRunning && runningId !== q.id) || !hasSql}
            style={{ 
              background: runningId === q.id ? '#ef4444' : '', 
              color: runningId === q.id ? '#fff' : '', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              opacity: hasSql ? 1 : 0.5
            }}
          >
            {runningId === q.id ? <><XCircle size={14} /> STOP</> : <><Play size={14} /> Run</>}
          </button>
          <button className="secondary" onClick={() => { setEditingQuery(q); setShowModal(true); }}>Edit</button>
          <button className="danger" onClick={() => { if (confirm('Delete?')) saveQueries(queries.filter(x => x.id !== q.id)); }}>Delete</button>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{isExpanded ? '▲' : '▼'}</div>
      </div>
      
      {isExpanded && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.5rem' }}>SQL QUERY</label>
            <code style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>{q.sql}</code>
          </div>
          {runningId === q.id && (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px dashed var(--primary)', marginTop: '1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>⌛ กำลังประมวลผลคิวรี่ กรุณารอซักครู่...</p>
            </div>
          )}

          {result && runningId !== q.id && (
            <div style={{ borderTop: '1px dotted var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Results</h4>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✅ คิวรี่เสร็จแล้ว ({result.timestamp})</span>
                </div>
                <button onClick={() => handleExport(result.query.title, result.data, false)} style={{ background: '#10b981', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>📥 Excel</button>
              </div>
              <PreviewTable results={result.data} onExport={handleExport} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Dashboard Components ---

const DashboardView = ({ results, queries, connections, onExport, onExportBatch }) => {
  const [isExporting, setIsExporting] = useState(false);

  const chartData = useMemo(() => {
    const data = Object.entries(results)
      .filter(([_, res]) => res && res.data)
      .map(([id, res]) => {
        const query = queries.find(q => q.id.toString() === id.toString());
        const entry = {
          name: query ? query.title : `Query ${id}`,
          id: id,
          total: 0
        };
        
        if (Array.isArray(res.data)) {
          res.data.forEach(dbRes => {
            if (dbRes.status === 'SUCCESS') {
              const val = dbRes.data?.length || 0;
              entry[dbRes.name] = val;
              entry.total += val;
            }
          });
        }
        return entry;
      });

    return data.sort((a, b) => b.total - a.total);
  }, [results, queries]);

  const activeDbs = useMemo(() => {
    return connections.filter(c => c.enabled).map(c => c.name);
  }, [connections]);

  const topDatabasesData = useMemo(() => {
    const counts = {};
    activeDbs.forEach(name => counts[name] = 0);
    Object.values(results).forEach(res => {
      if (res && Array.isArray(res.data)) {
        res.data.forEach(db => {
          if (db.status === 'SUCCESS') {
            counts[db.name] = (counts[db.name] || 0) + (db.data?.length || 0);
          }
        });
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [results, activeDbs]);

  const stats = useMemo(() => {
    const allResults = Object.values(results).filter(Boolean);
    const totalQueries = allResults.length;
    const totalRows = allResults.reduce((sum, res) => {
      return sum + (Array.isArray(res.data) ? res.data.reduce((s, db) => s + (db.data?.length || 0), 0) : 0);
    }, 0);
    const errors = allResults.filter(res => res.data.some(d => d.status === 'ERROR')).length;
    
    return { totalQueries, totalRows, errors, success: totalQueries - errors };
  }, [results]);

  const COLORS = ['#38bdf8', '#818cf8', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#2dd4bf'];

  const handleBatchExportClick = async () => {
    setIsExporting(true);
    await onExportBatch();
    setIsExporting(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', border: 'none' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={24} style={{ color: 'var(--primary)' }} /> Monitor Summary
        </h2>
        <button 
          onClick={handleBatchExportClick} 
          disabled={isExporting}
          style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {isExporting ? <Loader2 size={20} className="animate-spin" /> : <TrendingUp size={20} />}
          Export Selected Results (.xlsx)
        </button>
      </div>

      {/* Summary Tiles */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><List size={20} /></div>
          <div className="stat-info">
            <label>Tasks Run</label>
            <div className="stat-value">{stats.totalQueries}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}><Database size={20} /></div>
          <div className="stat-info">
            <label>Total Data</label>
            <div className="stat-value">{stats.totalRows.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8' }}><CheckCircle size={20} /></div>
          <div className="stat-info">
            <label>Success</label>
            <div className="stat-value">{stats.success}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 113, 133, 0.1)', color: '#fb7185' }}><XCircle size={20} /></div>
          <div className="stat-info">
            <label>Failures</label>
            <div className="stat-value">{stats.errors}</div>
          </div>
        </div>
      </div>

      {/* Topic Management Table with Full DB Breakdown */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <List size={22} style={{ color: 'var(--primary)' }} /> Database Execution Details
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Full breakdown of data across all databases</span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="summary-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Topic</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '100px' }}>Total Rows</th>
                <th>Database Breakdown (All DBs)</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Export</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((topic) => {
                const res = results[topic.id];
                const hasError = res.data.some(d => d.status === 'ERROR');
                return (
                  <tr key={topic.id}>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{topic.name}</td>
                    <td>
                      <span className={`status-tag ${hasError ? 'ERROR' : 'SUCCESS'}`} style={{ borderRadius: '12px' }}>
                        {hasError ? 'Mixed' : 'Success'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
                      {topic.total.toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeDbs.map((dbName, idx) => {
                          const dbResult = res.data.find(d => d.name === dbName);
                          const count = dbResult?.status === 'SUCCESS' ? (dbResult.data?.length || 0) : 0;
                          const isErr = dbResult?.status === 'ERROR';
                          
                          return (
                            <div 
                              key={dbName} 
                              style={{ 
                                background: count > 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.03)', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem',
                                border: count > 0 ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: count > 0 || isErr ? 1 : 0.5
                              }}
                            >
                              <span style={{ color: count > 0 ? 'var(--primary)' : 'var(--secondary)', fontWeight: '600' }}>{dbName}:</span>
                              <span style={{ color: isErr ? '#ef4444' : (count > 0 ? '#fff' : 'var(--secondary)'), fontWeight: 'bold' }}>
                                {isErr ? '⚠️' : count.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => onExport(topic.name, res.data, false)} 
                        className="secondary" 
                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 15px' }}
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// --- Main App Component ---

function App() {
  const [connections, setConnections] = useState([]);
  const [queries, setQueries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fixIpCategories, setFixIpCategories] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState('monitor'); // 'monitor' or 'fixip'
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fixIpReports, setFixIpReports] = useState([]);
  const [checkSiteConfig, setCheckSiteConfig] = useState({ id: 'checksite-fixed', title: 'CheckSite', sql: '', host: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState(null);
  const [activeTab, setActiveTab] = useState('monitor');
  const [resultsMonitor, setResultsMonitor] = useState({});
  const [resultsFixIp, setResultsFixIp] = useState({});
  const [resultsCheckSite, setResultsCheckSite] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [reportParams, setReportParams] = useState({});
  const [sortConfigQueries, setSortConfigQueries] = useState({ key: 'menu', direction: 'asc' });
  const [searchQueries, setSearchQueries] = useState('');
  const [searchFixIp, setSearchFixIp] = useState('');

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [testStatuses, setTestStatuses] = useState({});

  // Selection & Batch States
  const [selectedQueryIds, setSelectedQueryIds] = useState(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({}); // { id: { status: 'loading'|'success'|'error', current: number, total: number } }
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestConnection = async (conn) => {
    setTestStatuses(prev => ({ ...prev, [conn.id]: { loading: true, message: 'Testing...' } }));
    try {
      const res = await fetch(`${API_BASE}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn),
      });
      const data = await res.json();
      setTestStatuses(prev => ({ 
        ...prev, 
        [conn.id]: { 
          loading: false, 
          success: data.success, 
          message: data.message, 
          detail: data.detail 
        } 
      }));
    } catch (err) {
      setTestStatuses(prev => ({ 
        ...prev, 
        [conn.id]: { 
          loading: false, 
          success: false, 
          message: 'Failed to reach server: ' + err.message 
        } 
      }));
    }
  };

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const detectParams = (sql) => {
    if (!sql) return [];
    const regex = /{{(.*?)}}/g;
    const matches = [...sql.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      const data = await res.json();
      setConnections(data.connections || []);
      const loadedQueries = data.queries || [];
      setQueries(loadedQueries);
      
      // Self-heal: Recover any categories that exist in queries but are missing from the categories list
      const savedCats = data.categories || [];
      const queryCats = loadedQueries.map(q => q.category).filter(Boolean);
      const missingCats = [...new Set(queryCats)].filter(c => !savedCats.includes(c));
      const finalCats = missingCats.length > 0 ? [...savedCats, ...missingCats] : savedCats;
      setCategories(finalCats);
      
      const savedFixIpCats = data.fixIpCategories || [];
      const fixIpReportCats = (data.fixIpReports || []).map(r => r.category).filter(Boolean);
      const missingFixIpCats = [...new Set(fixIpReportCats)].filter(c => !savedFixIpCats.includes(c));
      setFixIpCategories(missingFixIpCats.length > 0 ? [...savedFixIpCats, ...missingFixIpCats] : savedFixIpCats);

      // Initialize category collapse state (expand first, collapse rest)
      if (loadedQueries.length > 0) {
        const uniqueCats = Array.from(new Set(loadedQueries.map(q => q.category || 'General'))).sort();
        const initialCollapse = {};
        uniqueCats.forEach((cat, idx) => {
          if (idx > 0) initialCollapse[cat] = true;
        });
        setCollapsedCategories(initialCollapse);
      }

      setFixIpReports(data.fixIpReports || []);
      if (data.checkSiteReports && !Array.isArray(data.checkSiteReports)) {
        setCheckSiteConfig(data.checkSiteReports);
      } else if (Array.isArray(data.checkSiteReports) && data.checkSiteReports.length > 0) {
        setCheckSiteConfig(data.checkSiteReports[0]);
      }
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  };

  const saveConnections = async (updatedConns) => {
    try {
      await fetch(`${API_BASE}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConns),
      });
      setConnections(updatedConns);
    } catch (err) {
      console.error('Failed to save connections', err);
    }
  };

  const saveQueries = async (updatedQueries) => {
    try {
      await fetch(`${API_BASE}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQueries),
      });
      setQueries(updatedQueries);
    } catch (err) {
      console.error('Failed to save queries', err);
    }
  };

  const saveCategories = async (updatedCategories) => {
    try {
      await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCategories),
      });
      setCategories(updatedCategories);
    } catch (err) {
      console.error('Failed to save categories', err);
    }
  };

  const saveFixIpCategories = async (updatedCategories) => {
    try {
      await fetch(`${API_BASE}/fixipcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCategories),
      });
      setFixIpCategories(updatedCategories);
    } catch (err) {
      console.error('Failed to save Fix IP categories', err);
    }
  };

  const saveFixIpReports = async (updated) => {
    try {
      await fetch(`${API_BASE}/fixipreports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setFixIpReports(updated);
    } catch (err) {
      console.error('Failed to save Fix Ip reports', err);
    }
  };

  const saveCheckSiteConfig = async (updated) => {
    try {
      await fetch(`${API_BASE}/checksite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setCheckSiteConfig(updated);
    } catch (err) {
      console.error('Failed to save CheckSite config', err);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsRunning(false);
      setRunningId(null);
    }
  };

  const handleRun = async (query, ipOverrides = null, isPartOfBatch = false) => {
    const controller = new AbortController();
    if (!isPartOfBatch) {
      setAbortController(controller);
      setRunningId(query.id);
      setIsRunning(true);
    }
    
    setResultsMonitor(prev => ({ ...prev, [query.id]: null }));
    
    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query.sql, ipOverrides }),
        signal: controller.signal,
      });
      const data = await res.json();
      const resultObj = { query, data, ipOverrides, timestamp: new Date().toLocaleTimeString() };
      setResultsMonitor(prev => ({ ...prev, [query.id]: resultObj }));
      return resultObj;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error('Execution failed:', err);
      if (!isPartOfBatch) alert('Execution failed: ' + err.message);
      return { query, data: [{ status: 'ERROR', message: err.message, name: 'System' }], error: true };
    } finally {
      if (!isPartOfBatch) {
        setIsRunning(false);
        setRunningId(null);
        setAbortController(null);
      }
    }
  };

  const handleRunBatch = async () => {
    if (selectedQueryIds.size === 0) return;
    
    const selectedList = queries.filter(q => selectedQueryIds.has(q.id));
    setIsBatchRunning(true);
    setShowDashboard(false);
    setBatchProgress({});
    
    const results = {};
    
    for (let i = 0; i < selectedList.length; i++) {
      const query = selectedList[i];
      setBatchProgress(prev => ({ 
        ...prev, 
        [query.id]: { status: 'loading', current: i + 1, total: selectedList.length } 
      }));
      
      const res = await handleRun(query, null, true);
      results[query.id] = res;
      
      setBatchProgress(prev => ({ 
        ...prev, 
        [query.id]: { 
          ...prev[query.id], 
          status: (res && !res.error) ? 'success' : 'error' 
        } 
      }));
    }
    
    setIsBatchRunning(false);
    setShowDashboard(true);
  };

  const toggleSelectAll = (categoryItems, forceValue) => {
    const newSelected = new Set(selectedQueryIds);
    const selectableItems = categoryItems.filter(q => q.sql && q.sql.trim().length > 0);
    const allSelected = selectableItems.length > 0 && selectableItems.every(q => selectedQueryIds.has(q.id));
    const target = forceValue !== undefined ? forceValue : !allSelected;
    
    selectableItems.forEach(q => {
      if (target) newSelected.add(q.id);
      else newSelected.delete(q.id);
    });
    setSelectedQueryIds(newSelected);
  };

  const handleClearSelected = () => {
    if (selectedQueryIds.size === 0) return;
    if (confirm('Are you sure to clear all selected items?')) {
      setSelectedQueryIds(new Set());
    }
  };

  const handleRunReport = async (query, paramsObj, ipOverrides = null) => {
    if (!query || !query.sql) {
      alert('คำสั่ง SQL ไม่สมบูรณ์ค่ะ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    let finalSql = query.sql;
    const params = detectParams(query.sql);
    params.forEach(p => {
      const val = paramsObj?.[p] || '';
      finalSql = finalSql.replace(new RegExp(`{{${p}}}`, 'g'), `'${val}'`);
    });

    const controller = new AbortController();
    setAbortController(controller);
    setIsRunning(true);
    setRunningId(query.id);
    if (activeTab === 'checksite') setResultsCheckSite(null);
    else setResultsFixIp(prev => ({ ...prev, [query.id]: null }));

    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: finalSql, ipOverrides }),
        signal: controller.signal,
      });
      const data = await res.json();
      const resultObj = { query: { ...query, sql: finalSql }, data, ipOverrides, timestamp: new Date().toLocaleTimeString() };
      if (activeTab === 'checksite') {
        setResultsCheckSite(resultObj);
      } else {
        setResultsFixIp(prev => ({ ...prev, [query.id]: resultObj }));
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      alert('Execution failed: ' + err.message);
    } finally {
      setIsRunning(false);
      setRunningId(null);
      setAbortController(null);
    }
  };

  const handleExport = async (title, results, isAllDb = false) => {
    try {
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, title, isAllDb }),
      });
      
      if (!res.ok) {
        let errMsg = `Export failed (Status: ${res.status})`;
        try {
          const errData = await res.json();
          errMsg += ': ' + (errData.error || errData.message || '');
        } catch (e) {
          const textErr = await res.text().catch(() => '');
          if (textErr) errMsg += ': ' + textErr.substring(0, 100);
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = Date.now();
      a.download = `${title || 'export'}_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Error:', err);
      alert('Export failed: ' + err.message);
    }
  };

  const handleExportBatch = async () => {
    try {
      const selectedIds = Array.from(selectedQueryIds);
      const batchData = selectedIds.map(id => {
        const query = queries.find(q => q.id.toString() === id.toString());
        const result = resultsMonitor[id];
        if (!query || !result) return null;
        return { title: query.title, results: result.data };
      }).filter(Boolean);

      if (batchData.length === 0) return;

      const res = await fetch(`${API_BASE}/export-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchData, filename: 'Monitor_Batch_Export' }),
      });

      if (!res.ok) throw new Error('Batch export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monitor_Batch_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Batch Export Error:', err);
      alert('Batch export failed: ' + err.message);
    }
  };

  const getPaginatedData = (data) => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  return (
    <div className="app-container">
      <header>
        <h1>PostgreSQL Multi-DB Tool</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <button className={activeTab === 'monitor' ? '' : 'secondary'} onClick={() => setActiveTab('monitor')}>Monitor</button>
          <button className={activeTab === 'checksite' ? '' : 'secondary'} onClick={() => setActiveTab('checksite')}>CheckSite</button>
          <button className={activeTab === 'fixip' ? '' : 'secondary'} onClick={() => setActiveTab('fixip')}>Fix Ip Query</button>
          <button className={activeTab === 'connections' ? '' : 'secondary'} onClick={() => setActiveTab('connections')}>Connections</button>
        </nav>
      </header>

      {activeTab === 'connections' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Database Connections (8 Slots)</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" onClick={() => saveConnections(connections.map(c => ({ ...c, enabled: true })))}>Enable All</button>
              <button className="secondary" onClick={() => saveConnections(connections.map(c => ({ ...c, enabled: false })))}>Disable All</button>
            </div>
          </div>
          <div className="db-grid">
            {connections.map((conn, idx) => (
              <div key={conn.id || idx} className={`db-card ${conn.enabled ? 'enabled' : ''}`} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <input type="checkbox" style={{ transform: 'scale(0.8)' }} checked={conn.enabled} onChange={(e) => {
                    const updated = [...connections];
                    updated[idx].enabled = e.target.checked;
                    saveConnections(updated);
                  }} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{conn.name}</strong>
                </div>
                <input placeholder="Host" value={conn.host} onChange={(e) => {
                  const updated = [...connections];
                  updated[idx].host = e.target.value;
                  saveConnections(updated);
                }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input placeholder="Port" type="number" value={conn.port} onChange={(e) => {
                    const updated = [...connections];
                    updated[idx].port = parseInt(e.target.value) || 5432;
                    saveConnections(updated);
                  }} />
                  <input placeholder="DB Name" value={conn.database} onChange={(e) => {
                    const updated = [...connections];
                    updated[idx].database = e.target.value;
                    saveConnections(updated);
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input placeholder="User" value={conn.user} onChange={(e) => {
                    const updated = [...connections];
                    updated[idx].user = e.target.value;
                    saveConnections(updated);
                  }} />
                  <input placeholder="Pass" type="password" value={conn.password} onChange={(e) => {
                    const updated = [...connections];
                    updated[idx].password = e.target.value;
                    saveConnections(updated);
                  }} />
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input placeholder="SSL CA Path" style={{ fontSize: '0.75rem', padding: '0.4rem' }} value={conn.sslCa || ''} onChange={(e) => {
                    const updated = [...connections]; 
                    updated[idx].sslCa = e.target.value; 
                    updated[idx].ssl = !!(e.target.value || updated[idx].sslCert || updated[idx].sslKey);
                    saveConnections(updated);
                  }} />
                  <input placeholder="SSL Cert Path" style={{ fontSize: '0.75rem', padding: '0.4rem' }} value={conn.sslCert || ''} onChange={(e) => {
                    const updated = [...connections]; 
                    updated[idx].sslCert = e.target.value; 
                    updated[idx].ssl = !!(updated[idx].sslCa || e.target.value || updated[idx].sslKey);
                    saveConnections(updated);
                  }} />
                  <input placeholder="SSL Key Path" style={{ fontSize: '0.75rem', padding: '0.4rem' }} value={conn.sslKey || ''} onChange={(e) => {
                    const updated = [...connections]; 
                    updated[idx].sslKey = e.target.value; 
                    updated[idx].ssl = !!(updated[idx].sslCa || updated[idx].sslCert || e.target.value);
                    saveConnections(updated);
                  }} />
                </div>
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                  <button 
                    onClick={() => handleTestConnection(conn)}
                    disabled={testStatuses[conn.id]?.loading}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', background: 'var(--primary)', color: '#000', fontWeight: 'bold' }}
                  >
                    {testStatuses[conn.id]?.loading ? '⌛ Testing...' : '⚡ Test Connection'}
                  </button>
                  {testStatuses[conn.id] && !testStatuses[conn.id].loading && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.7rem', 
                      padding: '0.4rem', 
                      borderRadius: '4px',
                      background: testStatuses[conn.id].success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: testStatuses[conn.id].success ? '#10b981' : '#fca5a5',
                      border: testStatuses[conn.id].success ? '1px solid #10b981' : '1px solid #ef4444'
                    }}>
                      <strong>{testStatuses[conn.id].success ? '✅ Success' : '❌ Error'}:</strong> {testStatuses[conn.id].message}
                      {testStatuses[conn.id].detail && <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '2px' }}>{testStatuses[conn.id].detail}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'monitor' && (
        <div className="monitor-tab-content">
          {showDashboard && (
            <div className="glass-card dashboard-wrapper" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 /> Execution Dashboard</h2>
                <button className="secondary" onClick={() => setShowDashboard(false)}>Close Dashboard</button>
              </div>
              <DashboardView 
                results={resultsMonitor} 
                queries={queries} 
                connections={connections} 
                onExport={handleExport}
                onExportBatch={handleExportBatch}
              />
            </div>
          )}

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>Monitor Templates</h2>
                {selectedQueryIds.size > 0 && (
                  <div className="batch-controls fade-in" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                      onClick={handleRunBatch} 
                      disabled={isBatchRunning}
                      style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {isBatchRunning ? <><Loader2 className="animate-spin" size={16} /> Running ({Object.keys(batchProgress).length}/{selectedQueryIds.size})</> : <><Play size={16} /> Run Selected ({selectedQueryIds.size})</>}
                    </button>
                    <button 
                      onClick={handleClearSelected}
                      className="secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                    >
                      <XCircle size={16} /> Clear
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  placeholder="🔍 Search Menu or Title..." 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', width: '220px' }}
                  value={searchQueries}
                  onChange={(e) => setSearchQueries(e.target.value)}
                />
                <button 
                  className="secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                  onClick={() => {
                    const nextDir = sortConfigQueries.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfigQueries({ key: 'menu', direction: nextDir });
                  }}
                >
                  <RefreshCcw size={14} /> {sortConfigQueries.direction === 'asc' ? '↑' : '↓'}
                </button>
                <button className="secondary" onClick={() => { setCategoryModalType('monitor'); setShowCategoryModal(true); }}>⚙️ Categories</button>
                <button onClick={() => { setEditingQuery({ id: Date.now(), category: '', menu: '', title: '', sql: '' }); setShowModal(true); }}>+ Add</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {(() => {
                const filtered = [...queries]
                  .filter(q => 
                    (q.category || '').toLowerCase().includes(searchQueries.toLowerCase()) ||
                    (q.menu || '').toLowerCase().includes(searchQueries.toLowerCase()) || 
                    (q.title || '').toLowerCase().includes(searchQueries.toLowerCase())
                  )
                  .sort((a, b) => {
                    const catA = (a.category || '').toLowerCase();
                    const catB = (b.category || '').toLowerCase();
                    if (catA < catB) return -1;
                    if (catA > catB) return 1;
                    
                    const menuA = (a.menu || '').toLowerCase();
                    const menuB = (b.menu || '').toLowerCase();
                    if (menuA < menuB) return sortConfigQueries.direction === 'asc' ? -1 : 1;
                    if (menuA > menuB) return sortConfigQueries.direction === 'asc' ? 1 : -1;

                    const titleA = (a.title || '').toLowerCase();
                    const titleB = (b.title || '').toLowerCase();
                    if (titleA < titleB) return -1;
                    if (titleA > titleB) return 1;
                    return 0;
                  });

                // Group by category
                const groups = filtered.reduce((acc, q) => {
                  const cat = q.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(q);
                  return acc;
                }, {});

                // Sort categories explicitly
                const sortedCategories = Object.keys(groups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

                return sortedCategories.map(cat => {
                  const items = groups[cat];
                  const selectableItems = items.filter(q => q.sql && q.sql.trim().length > 0);
                  const allInCatSelected = selectableItems.length > 0 && selectableItems.every(q => selectedQueryIds.has(q.id));
                  return (
                  <div key={cat} className="category-section">
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        marginBottom: collapsedCategories[cat] ? '0' : '1rem', 
                        paddingBottom: '0.5rem', 
                        borderBottom: '2px solid var(--primary)',
                        opacity: 0.9,
                        userSelect: 'none'
                      }}>
                      <div 
                        onClick={() => selectableItems.length > 0 && toggleSelectAll(items)}
                        style={{ 
                          cursor: selectableItems.length > 0 ? 'pointer' : 'not-allowed', 
                          color: selectableItems.length > 0 ? (allInCatSelected ? 'var(--primary)' : 'var(--secondary)') : 'var(--border)',
                          opacity: selectableItems.length > 0 ? 1 : 0.5
                        }}
                      >
                        {allInCatSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                      <div 
                        onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                      >
                        <div style={{ background: 'var(--primary)', width: '4px', height: '1.5rem', borderRadius: '2px' }}></div>
                        <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.1rem', color: '#fff' }}>{cat}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 'normal' }}>({items.length} items)</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--secondary)' }}>{collapsedCategories[cat] ? '▶' : '▼'}</span>
                      </div>
                    </div>
                    {!collapsedCategories[cat] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map((q, i) => (
                          <MonitorCard 
                            key={q.id}
                            q={q} i={i}
                            currentPage={1}
                            pageSize={999}
                            result={resultsMonitor[q.id]}
                            handleRun={handleRun}
                            setShowModal={setShowModal}
                            setEditingQuery={setEditingQuery}
                            queries={queries}
                            saveQueries={saveQueries}
                            handleExport={handleExport}
                            isRunning={isRunning}
                            runningId={runningId}
                            handleStop={handleStop}
                            isSelected={selectedQueryIds.has(q.id)}
                            onToggleSelect={() => {
                              const next = new Set(selectedQueryIds);
                              if (next.has(q.id)) next.delete(q.id);
                              else next.add(q.id);
                              setSelectedQueryIds(next);
                            }}
                            batchStatus={batchProgress[q.id]}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fixip' && (
        <>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Fix Ip Query List</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  placeholder="🔍 Search Title, Host or Category..." 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', width: '250px' }}
                  value={searchFixIp}
                  onChange={(e) => setSearchFixIp(e.target.value)}
                />
                <button className="secondary" onClick={() => { setCategoryModalType('fixip'); setShowCategoryModal(true); }}>⚙️ Manage Categories</button>
                <button onClick={() => saveFixIpReports([{ id: Date.now(), title: 'New Report', sql: '', host: '', category: '' }, ...fixIpReports])}>+ Add New Entry</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {(() => {
                const filtered = [...fixIpReports]
                  .filter(r => 
                    (r.title || '').toLowerCase().includes(searchFixIp.toLowerCase()) ||
                    (r.host || '').toLowerCase().includes(searchFixIp.toLowerCase()) ||
                    (r.category || '').toLowerCase().includes(searchFixIp.toLowerCase())
                  )
                  .sort((a, b) => {
                    const catA = (a.category || '').toLowerCase();
                    const catB = (b.category || '').toLowerCase();
                    if (catA < catB) return -1;
                    if (catA > catB) return 1;
                    
                    const titleA = (a.title || '').toLowerCase();
                    const titleB = (b.title || '').toLowerCase();
                    if (titleA < titleB) return -1;
                    if (titleA > titleB) return 1;
                    return 0;
                  });

                // Group by category
                const groups = filtered.reduce((acc, r) => {
                  const cat = r.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(r);
                  return acc;
                }, {});

                // Sort categories explicitly
                const sortedCategories = Object.keys(groups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

                return sortedCategories.map(cat => {
                  const items = groups[cat];
                  return (
                  <div key={cat} className="category-section">
                    <div 
                      onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        marginBottom: collapsedCategories[cat] ? '0' : '1rem', 
                        paddingBottom: '0.5rem', 
                        borderBottom: '2px solid #f59e0b',
                        opacity: 0.9,
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}>
                      <div style={{ background: '#f59e0b', width: '4px', height: '1.5rem', borderRadius: '2px' }}></div>
                      <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.1rem', color: '#fff' }}>{cat}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 'normal' }}>({items.length} items)</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--secondary)' }}>{collapsedCategories[cat] ? '▶' : '▼'}</span>
                    </div>
                    {!collapsedCategories[cat] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {items.map((r, i) => (
                          <GenericReportCard 
                            key={r.id}
                            report={r}
                            index={i}
                            categories={fixIpCategories}
                            onSave={(updated) => {
                              const u = [...fixIpReports];
                              const idx = fixIpReports.findIndex(item => item.id === r.id);
                              if (idx !== -1) {
                                u[idx] = updated;
                                saveFixIpReports(u);
                              }
                            }}
                            onRun={handleRunReport}
                            onDelete={(id) => { if (confirm('Delete?')) saveFixIpReports(fixIpReports.filter(x => x.id !== id)); }}
                            params={reportParams[r.id] || {}}
                            setParams={(p) => setReportParams({ ...reportParams, [r.id]: p })}
                            isRunning={isRunning}
                            detectParams={detectParams}
                            result={resultsFixIp[r.id]}
                            handleExport={handleExport}
                            accentColor="#f59e0b"
                            titleLabel="REPORT TITLE"
                            connections={connections}
                            onStop={handleStop}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
              {fixIpReports.length === 0 && <p style={{ textAlign: 'center', color: 'var(--secondary)', padding: '3rem' }}>No entries found.</p>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'checksite' && (
        <>
          <div className="glass-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#8b5cf6' }}>CheckSite Tool</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Single Instance Mode</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 3fr 1.2fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
              {/* Left Column: Connection Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 'bold' }}>TARGET IP</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        borderBottom: !checkSiteConfig.host ? '2px solid #ef4444' : '2px solid #8b5cf6', 
                        padding: '2px 0', 
                        fontSize: '0.9rem', 
                        color: '#fff', 
                        width: '100%', 
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                      value={checkSiteConfig.host} 
                      onChange={(e) => {
                        const updated = { ...checkSiteConfig, host: e.target.value };
                        setCheckSiteConfig(updated);
                        saveCheckSiteConfig(updated);
                      }}
                    >
                      <option value="" style={{ background: '#1e293b' }}>-- Select IP --</option>
                      {connections.map((c, idx) => (
                        <option key={idx} value={c.host} style={{ background: '#1e293b' }}>
                          {c.name} ({c.host || 'N/A'})
                        </option>
                      ))}
                    </select>
                    {connections.find(c => c.host === checkSiteConfig.host) && (
                      <div style={{ position: 'absolute', top: '-12px', right: '0', fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>
                        📡 {connections.find(c => c.host === checkSiteConfig.host).name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>DESCRIPTION</label>
                  <input 
                    placeholder="Site details" 
                    value={checkSiteConfig.title} 
                    onChange={(e) => {
                      const updated = { ...checkSiteConfig, title: e.target.value };
                      setCheckSiteConfig(updated);
                      saveCheckSiteConfig(updated);
                    }}
                  />
                </div>
              </div>

              {/* Middle Column: SQL Editor */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>SQL QUERY</label>
                <textarea 
                  rows="18" 
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  value={checkSiteConfig.sql} 
                  onChange={(e) => {
                    const updated = { ...checkSiteConfig, sql: e.target.value };
                    setCheckSiteConfig(updated);
                    saveCheckSiteConfig(updated);
                  }}
                />
              </div>

              {/* Right Column: Parameters & Run */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#8b5cf6', display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>PARAMETERS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px dashed #8b5cf6', minHeight: '150px' }}>
                    {detectParams(checkSiteConfig.sql).length > 0 ? (
                      detectParams(checkSiteConfig.sql).map(p => (
                        <div key={p}>
                          <label style={{ fontSize: '0.65rem', color: 'var(--secondary)' }}>{p}</label>
                          <input 
                            placeholder={`Value for ${p}`}
                            style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem' }}
                            value={reportParams['checksite-fixed']?.[p] || ''} 
                            onChange={(e) => setReportParams({ 
                              ...reportParams, 
                              ['checksite-fixed']: { ...(reportParams['checksite-fixed'] || {}), [p]: e.target.value } 
                            })} 
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', textAlign: 'center', marginTop: '2rem' }}>No parameters.</div>
                    )}
                  </div>
                </div>

                <button 
                  style={{ 
                    background: runningId === checkSiteConfig.id ? '#ef4444' : '#8b5cf6', 
                    width: '100%', 
                    padding: '0.8rem', 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    color: runningId === checkSiteConfig.id ? '#fff' : '#000' 
                  }}
                  onClick={() => {
                    if (runningId === checkSiteConfig.id) handleStop();
                    else {
                      if (!checkSiteConfig.sql || checkSiteConfig.sql.trim() === '') {
                        alert('กรุณากรอกคำสั่ง SQL ก่อนรัน CheckSite ค่ะ');
                        return;
                      }
                      if (!checkSiteConfig.host) {
                        alert('กรุณาเลือก Target IP ก่อนรัน CheckSite ค่ะ');
                        return;
                      }
                      handleRunReport(checkSiteConfig, reportParams['checksite-fixed'] || {}, checkSiteConfig.host);
                    }
                  }}
                  disabled={(isRunning && runningId !== checkSiteConfig.id)}
                >
                  {runningId === checkSiteConfig.id ? '⛔ STOP' : '🚀 RUN CHECK'}
                </button>
              </div>
            </div>

            {runningId === checkSiteConfig.id && (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', border: '1px dashed #8b5cf6', marginTop: '1.5rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem', borderTopColor: '#8b5cf6' }}></div>
                <p style={{ color: '#8b5cf6', fontWeight: 'bold' }}>⌛ กำลังประมวลผล CheckSite... กรุณารอซักครู่</p>
              </div>
            )}

            {resultsCheckSite && runningId !== checkSiteConfig.id && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h4 style={{ color: '#8b5cf6' }}>Check Results</h4>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>✅ คิวรี่เสร็จแล้ว ({resultsCheckSite.timestamp})</span>
                  </div>
                  <button onClick={() => handleExport(resultsCheckSite.query.title, resultsCheckSite.data)} style={{ background: '#10b981', padding: '0.4rem 1rem' }}>📥 Download Excel</button>
                </div>
                <PreviewTable results={resultsCheckSite.data} onExport={handleExport} />
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2>{editingQuery?.id ? 'Edit Query' : 'Add Query'}</h2>
            <div className="form-group">
              <label>Category (Large Group)</label>
              <select 
                value={editingQuery?.category || ''} 
                onChange={(e) => setEditingQuery({ ...editingQuery, category: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff' }}
              >
                <option value="" style={{ background: '#1e293b', color: '#fff' }}>-- Select Category --</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat} style={{ background: '#1e293b', color: '#fff' }}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Menu (Sub Group)</label>
              <input value={editingQuery?.menu || ''} onChange={(e) => setEditingQuery({ ...editingQuery, menu: e.target.value })} placeholder="e.g. Daily Check, Monthly Report" />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input value={editingQuery?.title || ''} onChange={(e) => setEditingQuery({ ...editingQuery, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>SQL</label>
              <textarea rows="10" value={editingQuery?.sql || ''} onChange={(e) => setEditingQuery({...editingQuery, sql: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                const exists = queries.find(q => q.id === editingQuery.id);
                saveQueries(exists ? queries.map(q => q.id === editingQuery.id ? editingQuery : q) : [...queries, editingQuery]);
                setShowModal(false);
              }}>Save</button>
              <button className="secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
            <h2>Manage Categories ({categoryModalType === 'monitor' ? 'Monitor' : 'Fix IP'})</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                placeholder="New Category Name..." 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                style={{ flex: 1 }}
              />
              <button onClick={() => {
                const name = newCategoryName.trim();
                if (!name) return;
                const currentCats = categoryModalType === 'monitor' ? categories : fixIpCategories;
                if (currentCats.includes(name)) {
                  alert('Category already exists!');
                  return;
                }
                if (categoryModalType === 'monitor') {
                  saveCategories([...categories, name]);
                } else {
                  saveFixIpCategories([...fixIpCategories, name]);
                }
                setNewCategoryName('');
              }}>Add</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {(categoryModalType === 'monitor' ? categories : fixIpCategories).length === 0 ? (
                <p style={{ color: 'var(--secondary)', textAlign: 'center' }}>No categories created yet.</p>
              ) : (
                (categoryModalType === 'monitor' ? categories : fixIpCategories).map((cat, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>{cat}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={async () => {
                          const newName = prompt('Enter new category name:', cat);
                          if (!newName || newName.trim() === '' || newName.trim() === cat) return;
                          
                          const trimmedName = newName.trim();
                          const currentCats = categoryModalType === 'monitor' ? categories : fixIpCategories;
                          if (currentCats.includes(trimmedName)) {
                            alert('Category name already exists!');
                            return;
                          }

                          if (categoryModalType === 'monitor') {
                            // 1. Update categories array
                            const updatedCats = categories.map(c => c === cat ? trimmedName : c);
                            await saveCategories(updatedCats);

                            // 2. Update queries that used the old category
                            const updatedQueries = queries.map(q => 
                              q.category === cat ? { ...q, category: trimmedName } : q
                            );
                            await saveQueries(updatedQueries);
                          } else {
                            // 1. Update fixIpCategories array
                            const updatedCats = fixIpCategories.map(c => c === cat ? trimmedName : c);
                            await saveFixIpCategories(updatedCats);

                            // 2. Update fixIpReports that used the old category
                            const updatedFixIp = fixIpReports.map(r => 
                              r.category === cat ? { ...r, category: trimmedName } : r
                            );
                            await saveFixIpReports(updatedFixIp);
                          }
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="danger" 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          const inUse = categoryModalType === 'monitor' 
                            ? queries.some(q => q.category === cat)
                            : fixIpReports.some(r => r.category === cat);
                          
                          if (inUse) {
                            alert(`Cannot delete '${cat}' because it is currently assigned to one or more items. Please reassign them first.`);
                            return;
                          }
                          if (confirm(`Delete category '${cat}'?`)) {
                            if (categoryModalType === 'monitor') {
                              saveCategories(categories.filter(c => c !== cat));
                            } else {
                              saveFixIpCategories(fixIpCategories.filter(c => c !== cat));
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="secondary" onClick={() => setShowCategoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

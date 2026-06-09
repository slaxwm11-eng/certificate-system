import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const API = 'http://localhost:8787';

// ── 7个工作表配置 ─────────────────────────────────────────
const TABS = [
  {
    key: 'inspection-reports',
    label: '检测报告',
    hasExpiry: true,
    columns: [
      { field: 'id',              headerName: '序号',     editable: false, width: 70,  pinned: 'left' },
      { field: 'product_name',    headerName: '产品名称', width: 160 },
      { field: 'model',           headerName: '型号',     width: 130 },
      { field: 'inspection_type', headerName: '送检类型', width: 110 },
      { field: 'report_name',     headerName: '报告名称', width: 200 },
      { field: 'testing_agency',  headerName: '检测机构', width: 220 },
      { field: 'report_date',     headerName: '报告时间', width: 120 },
      { field: 'expiry_date',     headerName: '有效期',   width: 130 },
      { field: 'report_no',       headerName: '报告编号', width: 180 },
      { field: 'remarks',         headerName: '备注',     width: 180 },
    ],
  },
  {
    key: 'system-certs',
    label: '体系认证',
    hasExpiry: true,
    columns: [
      { field: 'id',           headerName: '序号',     editable: false, width: 70, pinned: 'left' },
      { field: 'cert_type',    headerName: '认证类别', width: 200 },
      { field: 'issuing_body', headerName: '认证机构', width: 220 },
      { field: 'scope',        headerName: '认证范围', width: 280 },
      { field: 'issue_date',   headerName: '发证日期', width: 120 },
      { field: 'expiry_date',  headerName: '有效期',   width: 120 },
      { field: 'cert_no',      headerName: '证书编号', width: 180 },
      { field: 'remarks',      headerName: '备注',     width: 180 },
    ],
  },
  {
    key: 'honors',
    label: '荣誉奖项',
    hasExpiry: false,
    columns: [
      { field: 'id',           headerName: '序号',     editable: false, width: 70, pinned: 'left' },
      { field: 'award_name',   headerName: '荣誉名称', width: 300 },
      { field: 'award_date',   headerName: '颁发时间', width: 120 },
      { field: 'issuing_body', headerName: '颁发机构', width: 250 },
      { field: 'expiry_date',  headerName: '有效期',   width: 120 },
    ],
  },
  {
    key: 'software-copyrights',
    label: '软著',
    hasExpiry: false,
    columns: [
      { field: 'id',              headerName: '序号',     editable: false, width: 70, pinned: 'left' },
      { field: 'software_name',   headerName: '软件名称', width: 280 },
      { field: 'cert_no',         headerName: '证书号',   width: 180 },
      { field: 'issue_date',      headerName: '登记日期', width: 120 },
      { field: 'issuing_body',    headerName: '颁发机构', width: 200 },
      { field: 'applied_product', headerName: '应用产品', width: 180 },
    ],
  },
  {
    key: 'utility-patents',
    label: '实用新型专利',
    hasExpiry: false,
    columns: [
      { field: 'id',              headerName: '序号',   editable: false, width: 70, pinned: 'left' },
      { field: 'patent_name',     headerName: '专利名称', width: 280 },
      { field: 'cert_no',         headerName: '证书号',   width: 150 },
      { field: 'inventor',        headerName: '发明人',   width: 120 },
      { field: 'issue_date',      headerName: '授权日期', width: 120 },
      { field: 'applied_product', headerName: '应用产品', width: 180 },
    ],
  },
  {
    key: 'invention-patents',
    label: '发明专利',
    hasExpiry: false,
    columns: [
      { field: 'id',              headerName: '序号',     editable: false, width: 70, pinned: 'left' },
      { field: 'patent_name',     headerName: '专利名称', width: 280 },
      { field: 'cert_no',         headerName: '证书号',   width: 150 },
      { field: 'inventor',        headerName: '发明人',   width: 120 },
      { field: 'issue_date',      headerName: '授权日期', width: 120 },
      { field: 'pub_no',          headerName: '公告号',   width: 160 },
      { field: 'applied_product', headerName: '应用产品', width: 180 },
    ],
  },
  {
    key: 'personnel-certs',
    label: '人员证书',
    hasExpiry: true,
    columns: [
      { field: 'id',           headerName: '序号',     editable: false, width: 70, pinned: 'left' },
      { field: 'name',         headerName: '姓名',     width: 100 },
      { field: 'cert_name',    headerName: '证书名称', width: 220 },
      { field: 'specialty',    headerName: '专业',     width: 140 },
      { field: 'issuing_body', headerName: '发证机关', width: 220 },
      { field: 'level',        headerName: '级别',     width: 100 },
      { field: 'issue_date',   headerName: '发证日期', width: 120 },
      { field: 'expiry_date',  headerName: '有效期',   width: 120 },
      { field: 'remarks',      headerName: '备注',     width: 150 },
    ],
  },
];

// ── 过期状态判断 ──────────────────────────────────────────
function getExpiryStatus(dateStr) {
  if (!dateStr || dateStr === '长期' || dateStr.includes('长期')) return 'normal';
  // 尝试解析各种日期格式
  const clean = dateStr.replace(/[年月]/g, '-').replace(/日/g, '').trim();
  const d = new Date(clean);
  if (isNaN(d.getTime())) return 'normal';
  const now = new Date();
  const days = (d - now) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 90) return 'warning';
  return 'normal';
}

// ── 修改记录 Tab（审计日志，可手动纠错）─────────────────
const AuditTab = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');

  const load = (cat = '') => {
    setLoading(true);
    const url = cat
      ? `${API}/api/audit-log?limit=500&category=${encodeURIComponent(cat)}`
      : `${API}/api/audit-log?limit=500`;
    fetch(url)
      .then(r => r.json())
      .then(res => { if (res.success) setRowData(res.data); })
      .catch(() => alert('无法连接后端'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const columnDefs = useMemo(() => [
    { field: 'id',        headerName: '序号',     editable: false, width: 70,  pinned: 'left' },
    { field: 'timestamp', headerName: '操作时间', editable: false, width: 160 },
    { field: 'operator',  headerName: '操作人',   editable: true,  width: 100 },
    { field: 'category',  headerName: '所属分类', editable: true,  width: 130 },
    { field: 'item_id',   headerName: '条目ID',   editable: true,  width: 90  },
    { field: 'field',     headerName: '字段名',   editable: true,  width: 130 },
    { field: 'old_value', headerName: '修改前',   editable: true,  width: 180 },
    { field: 'new_value', headerName: '修改后',   editable: true,  width: 180 },
  ], []);

  const [dirtyRecords, setDirtyRecords] = useState({});
  const onCellValueChanged = useCallback((params) => {
    const key = `${params.data.id}-${params.colDef.field}`;
    setDirtyRecords(prev => ({
      ...prev,
      [key]: { row_id: params.data.id, column_name: params.colDef.field, old_value: params.oldValue, new_value: params.newValue },
    }));
  }, []);

  const handleSave = async () => {
    const changes = Object.values(dirtyRecords);
    if (!changes.length) return alert('没有需要保存的修改');
    try {
      const res = await fetch(`${API}/api/audit-log/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const result = await res.json();
      if (result.success) { alert(result.message); setDirtyRecords({}); }
    } catch { alert('保存失败'); }
  };

  const CATS = ['', 'inspection-reports', 'system-certs', 'honors', 'software-copyrights', 'utility-patents', 'invention-patents', 'personnel-certs'];
  const CAT_LABELS = { '': '全部', 'inspection-reports': '检测报告', 'system-certs': '体系认证', 'honors': '荣誉奖项', 'software-copyrights': '软著', 'utility-patents': '实用新型专利', 'invention-patents': '发明专利', 'personnel-certs': '人员证书' };

  const dirtyCount = Object.keys(dirtyRecords).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#595959' }}>筛选分类：</span>
          <select
            value={filterCat}
            onChange={e => { setFilterCat(e.target.value); load(e.target.value); }}
            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 13 }}
          >
            {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#999' }}>审计记录不可删除，仅支持纠错修改</span>
        </div>
        <button
          onClick={handleSave}
          disabled={dirtyCount === 0}
          style={{
            padding: '7px 18px',
            backgroundColor: dirtyCount > 0 ? '#1677ff' : '#d9d9d9',
            color: '#fff', border: 'none', borderRadius: 4,
            cursor: dirtyCount > 0 ? 'pointer' : 'not-allowed', fontSize: 13,
          }}
        >
          保存纠错 ({dirtyCount})
        </button>
      </div>
      <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 400 }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>加载中...</div>
          : <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              onCellValueChanged={onCellValueChanged}
              stopEditingWhenCellsLoseFocus={true}
              defaultColDef={{ resizable: true, sortable: true, filter: true }}
              pagination={true}
              paginationPageSize={50}
            />
        }
      </div>
    </div>
  );
};

// ── 单个工作表组件 ────────────────────────────────────────
const SheetTable = ({ tab }) => {
  const [rowData, setRowData] = useState([]);
  const [dirtyRecords, setDirtyRecords] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 从后端加载数据
  useEffect(() => {
    setLoading(true);
    setRowData([]);
    fetch(`${API}/api/${tab.key}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setRowData(res.data);
        else alert('加载失败: ' + res.error);
      })
      .catch(() => alert('无法连接后端，请确认 wrangler dev 已启动'))
      .finally(() => setLoading(false));
  }, [tab.key]);

  // 脏数据监听
  const onCellValueChanged = useCallback((params) => {
    const { data, colDef, oldValue, newValue } = params;
    const key = `${data.id}-${colDef.field}`;
    setDirtyRecords(prev => ({
      ...prev,
      [key]: { row_id: data.id, column_name: colDef.field, old_value: oldValue, new_value: newValue },
    }));
  }, []);

  // 列定义 + 脏数据高亮 + 过期行样式
  const columnDefs = useMemo(() => {
    const dirtyCellRule = {
      'cell-dirty': (p) => !!dirtyRecords[`${p.data.id}-${p.colDef.field}`],
    };
    return tab.columns.map(col => ({
      ...col,
      editable: col.editable !== false,
      cellClassRules: col.editable !== false ? dirtyCellRule : {},
      filter: true,
    }));
  }, [tab.columns, dirtyRecords]);

  // 行样式（过期红色，临期黄色）
  const getRowStyle = useCallback((params) => {
    if (!tab.hasExpiry) return null;
    const status = getExpiryStatus(params.data?.expiry_date);
    if (status === 'expired') return { background: '#fff1f0', borderLeft: '3px solid #ff4d4f' };
    if (status === 'warning') return { background: '#fffbe6', borderLeft: '3px solid #faad14' };
    return null;
  }, [tab.hasExpiry]);

  // 保存
  const handleSave = async () => {
    const changes = Object.values(dirtyRecords);
    if (!changes.length) return alert('没有需要保存的修改');
    try {
      const res = await fetch(`${API}/api/${tab.key}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setDirtyRecords({});
      }
    } catch {
      alert('保存失败，请检查后端连接');
    }
  };

  // AI 上传提取（仅检测报告 Tab 显示）
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/extract`, { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        const newData = result.data;
        setRowData(prev => [...prev, newData]);
        const dirtyFields = Object.keys(newData).filter(k => k !== 'id');
        const newDirty = {};
        dirtyFields.forEach(f => {
          newDirty[`${newData.id}-${f}`] = { row_id: newData.id, column_name: f, old_value: null, new_value: newData[f] };
        });
        setDirtyRecords(prev => ({ ...prev, ...newDirty }));
      } else {
        alert('解析失败: ' + result.error);
      }
    } catch {
      alert('无法连接到后端');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 新增空行
  const handleAddRow = async () => {
    const tempId = `new-${Date.now()}`;
    const emptyRow = { id: tempId };
    tab.columns.forEach(col => { if (col.field !== 'id') emptyRow[col.field] = ''; });
    setRowData(prev => [...prev, emptyRow]);
    // 把所有字段标记为脏数据，保存时写入后端
    const newDirty = {};
    tab.columns.forEach(col => {
      if (col.field !== 'id') {
        newDirty[`${tempId}-${col.field}`] = { row_id: tempId, column_name: col.field, old_value: null, new_value: '' };
      }
    });
    setDirtyRecords(prev => ({ ...prev, ...newDirty }));
  };

  const dirtyCount = Object.keys(dirtyRecords).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tab.hasExpiry && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ padding: '2px 8px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 4, color: '#cf1322' }}>■ 已过期</span>
              <span style={{ padding: '2px 8px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, color: '#d48806' }}>■ 90天内到期</span>
            </div>
          )}
          {tab.key === 'inspection-reports' && (
            <label style={{
              padding: '6px 14px', backgroundColor: isUploading ? '#95de64' : '#52c41a',
              color: '#fff', borderRadius: 4, cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: 13,
            }}>
              {isUploading ? '智能解析中...' : '上传文件智能提取'}
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
            </label>
          )}
          {/* 手动新增按钮，所有 Tab 都显示 */}
          <button
            onClick={handleAddRow}
            style={{
              padding: '6px 14px', backgroundColor: '#fff',
              color: '#1677ff', border: '1px solid #1677ff',
              borderRadius: 4, cursor: 'pointer', fontSize: 13,
            }}
          >
            + 新增一行
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={dirtyCount === 0}
          style={{
            padding: '7px 18px',
            backgroundColor: dirtyCount > 0 ? '#1677ff' : '#d9d9d9',
            color: '#fff', border: 'none', borderRadius: 4, cursor: dirtyCount > 0 ? 'pointer' : 'not-allowed', fontSize: 13,
          }}
        >
          保存修改 ({dirtyCount})
        </button>
      </div>

      {/* 表格 */}
      <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 400 }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>加载中...</div>
          : <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              onCellValueChanged={onCellValueChanged}
              getRowStyle={getRowStyle}
              stopEditingWhenCellsLoseFocus={true}
              defaultColDef={{ resizable: true, sortable: true }}
              pagination={true}
              paginationPageSize={50}
            />
        }
      </div>
    </div>
  );
};

// ── 主组件（Tab 切换）────────────────────────────────────
const CertificateTable = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const currentTab = TABS.find(t => t.key === activeTab);

  return (
    <div style={{ padding: 20, height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 16px 0' }}>宽域资质证书台账管理系统</h2>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', marginBottom: 16, overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? '#1677ff' : '#595959',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: -2,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('audit-log')}
          style={{
            padding: '8px 18px',
            border: 'none',
            borderBottom: activeTab === 'audit-log' ? '2px solid #722ed1' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'audit-log' ? '#722ed1' : '#595959',
            fontWeight: activeTab === 'audit-log' ? 600 : 400,
            cursor: 'pointer',
            fontSize: 14,
            marginBottom: -2,
            transition: 'all 0.2s',
          }}
        >
          修改记录
        </button>
      </div>

      {/* 当前 Tab 内容 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'audit-log'
          ? <AuditTab key="audit-log" />
          : <SheetTable key={activeTab} tab={currentTab} />
        }
      </div>

      <style>{`
        .cell-dirty { background-color: #fffbe6 !important; border-left: 3px solid #faad14 !important; }
      `}</style>
    </div>
  );
};

export default CertificateTable;

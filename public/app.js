// API 基础 URL
const API_BASE = '/api';

// 工具函数
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showMessage(elementId, message, type = 'success') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `result-message ${type}`;
  setTimeout(() => {
    element.className = 'result-message';
  }, 5000);
}

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// 加载集合信息
async function loadCollectionInfo() {
  try {
    const response = await fetch(`${API_BASE}/collection/info`);
    const result = await response.json();
    
    if (result.success) {
      document.getElementById('collection-name').textContent = result.data.name;
      document.getElementById('document-count').textContent = result.data.count;
    }
  } catch (error) {
    console.error('加载集合信息失败:', error);
  }
}

// 查询功能
document.getElementById('query-btn').addEventListener('click', async () => {
  const queryText = document.getElementById('query-text').value.trim();
  const nResults = parseInt(document.getElementById('n-results').value, 10);
  
  if (!queryText) {
    alert('请输入查询文本');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: queryText,
        nResults
      })
    });
    
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      displayQueryResults(result.data);
    } else {
      alert(`查询失败: ${result.error}`);
    }
  } catch (error) {
    hideLoading();
    alert(`查询失败: ${error.message}`);
  }
});

// 显示查询结果
function displayQueryResults(data) {
  const container = document.getElementById('query-results');
  
  if (!data.ids || data.ids.length === 0 || !data.ids[0] || data.ids[0].length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>没有找到相关文档</p></div>';
    return;
  }
  
  const ids = data.ids[0];
  const documents = data.documents[0];
  const metadatas = data.metadatas[0];
  const distances = data.distances[0];
  
  container.innerHTML = ids.map((id, index) => {
    const distance = distances[index];
    const similarity = (1 - distance).toFixed(4);
    const document = documents[index] || '';
    const metadata = metadatas[index] || {};
    
    return `
      <div class="result-item">
        <div class="result-item-header">
          <span class="result-item-title">结果 #${index + 1}</span>
          <span class="result-item-score">相似度: ${similarity}</span>
        </div>
        <div class="result-item-content">${escapeHtml(document)}</div>
        <div class="result-item-meta">
          ID: ${id} | 距离: ${distance.toFixed(4)}
        </div>
      </div>
    `;
  }).join('');
}

// 加载文档列表
async function loadDocuments() {
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/documents`);
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      displayDocuments(result.data);
    } else {
      alert(`加载文档失败: ${result.error}`);
    }
  } catch (error) {
    hideLoading();
    alert(`加载文档失败: ${error.message}`);
  }
}

// 显示文档列表
function displayDocuments(data) {
  const container = document.getElementById('documents-list');
  
  if (!data.ids || data.ids.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><p>暂无文档</p></div>';
    return;
  }
  
  container.innerHTML = data.ids.map((id, index) => {
    const document = data.documents[index] || '';
    const metadata = data.metadatas[index] || {};
    const createdAt = metadata.createdAt ? new Date(metadata.createdAt).toLocaleString('zh-CN') : '-';
    
    return `
      <div class="document-item">
        <div class="document-content">
          <div class="document-id">ID: ${id}</div>
          <div class="document-text">${escapeHtml(document)}</div>
          <div class="document-meta">创建时间: ${createdAt}</div>
        </div>
        <div class="document-actions">
          <button class="btn btn-danger btn-small" onclick="deleteDocument('${id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

// 删除文档
async function deleteDocument(id) {
  if (!confirm('确定要删除这个文档吗？')) {
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: [id] })
    });
    
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      loadDocuments();
      loadCollectionInfo();
    } else {
      alert(`删除失败: ${result.error}`);
    }
  } catch (error) {
    hideLoading();
    alert(`删除失败: ${error.message}`);
  }
}

// 添加文档
document.getElementById('add-btn').addEventListener('click', async () => {
  const textsInput = document.getElementById('add-texts').value.trim();
  
  if (!textsInput) {
    alert('请输入文档内容');
    return;
  }
  
  const texts = textsInput.split('\n').filter(text => text.trim().length > 0);
  
  if (texts.length === 0) {
    alert('请输入至少一个文档');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texts })
    });
    
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      showMessage('add-result', `成功添加 ${texts.length} 个文档`, 'success');
      document.getElementById('add-texts').value = '';
      loadDocuments();
      loadCollectionInfo();
    } else {
      showMessage('add-result', `添加失败: ${result.error}`, 'error');
    }
  } catch (error) {
    hideLoading();
    showMessage('add-result', `添加失败: ${error.message}`, 'error');
  }
});

// 清空集合
document.getElementById('clear-all-btn').addEventListener('click', async () => {
  if (!confirm('确定要清空所有文档吗？此操作不可恢复！')) {
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/collection/clear`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      loadDocuments();
      loadCollectionInfo();
      alert('集合已清空');
    } else {
      alert(`清空失败: ${result.error}`);
    }
  } catch (error) {
    hideLoading();
    alert(`清空失败: ${error.message}`);
  }
});

// 刷新按钮
document.getElementById('refresh-btn').addEventListener('click', () => {
  loadCollectionInfo();
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  if (activeTab === 'documents') {
    loadDocuments();
  }
});

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 当切换到文档管理标签页时自动加载
document.querySelector('[data-tab="documents"]').addEventListener('click', () => {
  setTimeout(loadDocuments, 100);
});

// 初始化
loadCollectionInfo();


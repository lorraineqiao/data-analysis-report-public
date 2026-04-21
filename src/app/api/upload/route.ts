import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    let buffer: ArrayBuffer;
    let fileName = 'unknown';
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.fileData) {
        return NextResponse.json({ error: '没有文件数据' }, { status: 400 });
      }
      const binary = atob(body.fileData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      buffer = bytes.buffer;
      fileName = body.fileName || 'file.xlsx';
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: '没有文件' }, { status: 400 });
      }
      buffer = await file.arrayBuffer();
      fileName = file.name;
    }
    
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log('Excel rows:', rawData.length);
    
    // 目标渠道列表
    const targetChannels = [
      '商家官方直播', '达人直播', '职人直播', '直播小计',
      '官方账号主页视频', '达人视频', '职人视频', '短视频小计',
      '抖音搜索', '团购搜索', '搜索小计'
    ];
    
    // 找到所有渠道及其行号
    const channelRowsSet = new Set<string>();
    const channelRows: { name: string; row: number }[] = [];
    
    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row) continue;
      
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '');
        
        for (const ch of targetChannels) {
          if (cell === ch) {
            const key = `${ch}|${r}`;
            if (!channelRowsSet.has(key)) {
              channelRowsSet.add(key);
              channelRows.push({ name: ch, row: r });
            }
          }
        }
      }
    }
    
    console.log('Found channels:', channelRows.length);
    
    // 找到表头行
    let headerRow = -1;
    if (channelRows.length > 0) {
      headerRow = channelRows[0].row - 1;
    }
    
    const headers = headerRow >= 0 ? (rawData[headerRow] || []) : [];
    console.log('Headers:', JSON.stringify(headers));
    
    // 精确匹配表头找到列索引（使用模糊匹配处理换行符）
    const colMap: Record<string, number> = {};
    
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').replace(/\r\n/g, '').replace(/\n/g, '').trim();
      
      if (h.includes('渠道') || h.includes('名称')) colMap.name = i;
      else if (h.includes('流量效率') || h === '效率') colMap.flowEfficiency = i;
      else if (h.includes('CPM') || h.includes('cpm')) colMap.cpm = i;
      else if (h.includes('费用占比') || h.includes('占比')) colMap.costRatio = i;
      else if (h.includes('效率排名')) colMap.flowRank = i;
      else if (h.includes('CPM排名')) colMap.cpmRank = i;
    }
    
    console.log('Column map from header:', colMap);
    
    // 如果表头没找到流量效率和CPM列，返回错误
    if (colMap.flowEfficiency === undefined || colMap.cpm === undefined) {
      console.error('Cannot find flowEfficiency or CPM columns in header');
      return NextResponse.json({ 
        error: '无法识别表格列结构，请确保表头包含"流量效率"和"CPM"列' 
      }, { status: 400 });
    }
    
    // 构建数据行 - 直接按列索引读取
    const dataMap = new Map<string, any>();
    
    for (const { name, row } of channelRows) {
      if (dataMap.has(name)) continue;
      
      const rowData = rawData[row];
      if (!rowData) continue;
      
      // 直接按列索引读取原始值
      let flowEfficiency = parseFloat(rowData[colMap.flowEfficiency]) || 0;
      let cpm = parseFloat(rowData[colMap.cpm]) || 0;
      let costRatio = parseFloat(rowData[colMap.costRatio]) || 0;
      
      // 费用占比如果是小数格式（0-1），转为百分比显示（如0.71 -> 71）
      if (costRatio > 0 && costRatio <= 1) {
        costRatio = Math.round(costRatio * 100);
      }
      
      dataMap.set(name, {
        name,
        flowEfficiency,
        cpm,
        costRatio,
        isSubtotal: name.includes('小计'),
      });
    }
    
    const dataRows = Array.from(dataMap.values());
    
    // 按目标渠道顺序排序
    dataRows.sort((a, b) => {
      const idxA = targetChannels.indexOf(a.name);
      const idxB = targetChannels.indexOf(b.name);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    
    // 计算排名
    const flowData = dataRows.filter(x => x.flowEfficiency > 0).sort((a, b) => b.flowEfficiency - a.flowEfficiency);
    flowData.forEach((item, i) => {
      item.flowRank = i + 1;
    });
    
    const cpmData = dataRows.filter(x => x.cpm > 0).sort((a, b) => a.cpm - b.cpm);
    cpmData.forEach((item, i) => {
      item.cpmRank = i + 1;
    });
    
    console.log('Parsed rows:', dataRows.length);
    console.log('Sample data:', JSON.stringify(dataRows.slice(0, 3)));
    
    const totalCostRatio = dataRows.reduce((s, r) => s + r.costRatio, 0);
    
    return NextResponse.json({
      success: true,
      data: dataRows,
      dataPreview: dataRows.slice(0, 15),
      totalCostRatio,
      metrics: { 
        totalCost: totalCostRatio,
        avgFlowEfficiency: dataRows.reduce((s, r) => s + r.flowEfficiency, 0) / (dataRows.length || 1),
        avgCpm: cpmData.reduce((s, r) => s + r.cpm, 0) / (cpmData.length || 1)
      },
      analysis: {
        primaryChannel: dataRows[0]?.name || '',
        primaryChannelRatio: dataRows[0]?.costRatio || 0,
        totalChannels: dataRows.length,
      },
      fileName,
    });
    
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: '处理失败: ' + String(err) }, { status: 500 });
  }
}

'use client';

import { ChatInterface } from '@/components/ChatInterface';
import { ExcelUploader } from '@/components/ExcelUploader';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ImageModal } from '@/components/ImageModal';
import UserInfoModal from '@/components/UserInfoModal';
import html2canvas from 'html2canvas';
import { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// 默认示例数据
const defaultData: ChartData[] = [
  { name: '抖音搜索', flowEfficiency: 1.6, cpm: 80, cost: 0, costRatio: 0, category: '搜索' },
  { name: '搜索小计', flowEfficiency: 1.59, cpm: 79.52, cost: 0, costRatio: 0, category: '' },
  { name: '达人视频', flowEfficiency: 1.0, cpm: 300, cost: 0, costRatio: 0, category: '短视频' },
  { name: '商家官方直播', flowEfficiency: 0.94, cpm: 175, cost: 0, costRatio: 0, category: '直播' },
  { name: '直播小计', flowEfficiency: 0.85, cpm: 166.49, cost: 0, costRatio: 0, category: '' },
  { name: '职人视频', flowEfficiency: 0.5, cpm: 100, cost: 0, costRatio: 0, category: '短视频' },
  { name: '达人直播', flowEfficiency: 0.4, cpm: 140, cost: 0, costRatio: 0, category: '直播' },
  { name: '团购搜索', flowEfficiency: 0.33, cpm: 0, cost: 0, costRatio: 0, category: '搜索' },
  { name: '总计', flowEfficiency: 0.14, cpm: 25.98, cost: 0, costRatio: 0, category: '' },
  { name: '职人直播', flowEfficiency: 0.125, cpm: 62.5, cost: 0, costRatio: 0, category: '直播' },
  { name: '短视频小计', flowEfficiency: 0.0054, cpm: 4.74, cost: 0, costRatio: 0, category: '' },
  { name: '官方账号主页视频', flowEfficiency: 0.0008, cpm: 3.46, cost: 0, costRatio: 0, category: '短视频' },
];

interface ChartData {
  name: string;
  flowEfficiency: number;
  cpm: number;
  cost?: number;
  costRatio?: number;
  category: string;
  flowRank?: number | null;
  cpmRank?: number | null;
  evaluation?: string | null;
  isSubtotal?: boolean;
}

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'flow' | 'cpm'>('flow');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [hasCustomData, setHasCustomData] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [tableSortField, setTableSortField] = useState<'flowEfficiency' | 'cpm' | null>('flowEfficiency');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dataSource, setDataSource] = useState<'none' | 'template' | 'upload'>('none');
  const [hasData, setHasData] = useState(false);
  
  // 点赞功能
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  
  // 用户信息弹窗 - 默认显示
  const [showUserInfoModal, setShowUserInfoModal] = useState(true);
  const [userInfo, setUserInfo] = useState<{ agentName: string; channelManager: string } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // 图表容器ref
  const chartRef = useRef<HTMLDivElement>(null);
  
  // 截图并上传函数
  const captureAndUpload = async (data: ChartData[], name: string) => {
    if (!chartRef.current) return;
    
    setIsCapturing(true);
    try {
      // 延迟一下确保图表渲染完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 静默html2canvas的lab颜色警告
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // 忽略lab颜色警告
        }
        originalError.apply(console, args);
      };
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 1, // 降低scale减少问题
        useCORS: true,
        logging: false,
      });
      
      console.error = originalError; // 恢复console.error
      
      const imageData = canvas.toDataURL('image/png');
      
      // 上传截图
      const uploadRes = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          filename: `chart_${Date.now()}.png`,
        }),
      });
      
      const uploadData = await uploadRes.json();
      
      // 发送使用记录到对象存储
      if (userInfo?.agentName) {
        fetch('/api/usage-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: userInfo.agentName,
            channelManager: userInfo.channelManager,
            summary: `上传Excel文件 ${name}，生成 ${data.length} 条数据`,
            screenshotUrl: uploadData.url || '',
          }),
        }).catch(() => {});
      }
      
      console.log('Screenshot captured and uploaded');
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };
  
  // 记录页面访问
  useEffect(() => {
    // 从localStorage获取已保存的信息（用于记录）
    const savedUserInfo = localStorage.getItem('userInfo');
    const parsedUserInfo = savedUserInfo ? JSON.parse(savedUserInfo) : null;
    
    // 始终显示弹窗让用户填写
    setShowUserInfoModal(true);
    setUserInfo(parsedUserInfo);
    
    // 页面访问记录已移除，改为在提交数据时记录
  }, []);

  // 获取点赞数
  useEffect(() => {
    fetch('/api/likes?page_key=homepage')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLikeCount(data.like_count);
        }
      })
      .catch(console.error);
  }, []);
  
  // 处理点赞
  const handleLike = async () => {
    if (isLiked) return;
    
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_key: 'homepage' }),
      });
      const data = await res.json();
      if (data.success) {
        setLikeCount(data.like_count);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };
  
  // Step1 数据
  const [step1Data, setStep1Data] = useState({
    historyAmount: 0,
    historyFlow: 0,
    targetAmount: 0,
    budget: 0,
    experienceRatio: null as number | null,
  });
  
  // GMV系数（自动计算）
  const gmvRatio = step1Data.historyAmount > 0 
    ? step1Data.targetAmount / step1Data.historyAmount 
    : 0;
  
  // 预估所需流量（自动计算）：历史流量 × GMV系数 × 历史经验系数
  const calculatedFlow = step1Data.historyFlow > 0 && gmvRatio > 0 && step1Data.experienceRatio
    ? Math.ceil(step1Data.historyFlow * gmvRatio * step1Data.experienceRatio)
    : 0;
  
  const handleStep1Change = (field: string, value: number | null) => {
    setStep1Data(prev => ({ ...prev, [field]: value }));
  };
  
  // 渠道数据结构
  interface ChannelData {
    name: string;
    amount: number;
    flow: number;
    adCost: number;
    opCost: number;
  }
  
  // Step2 各渠道数据
  const [liveChannels, setLiveChannels] = useState<ChannelData[]>([
    { name: '商家官方直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
    { name: '达人直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
    { name: '职人直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
  ]);
  
  const [videoChannels, setVideoChannels] = useState<ChannelData[]>([
    { name: '达人视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
    { name: '职人视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
    { name: '官方账号主页视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
  ]);
  
  const [searchChannels, setSearchChannels] = useState<ChannelData[]>([
    { name: '抖音搜索', amount: 0, flow: 0, adCost: 0, opCost: 0 },
    { name: '团购搜索', amount: 0, flow: 0, adCost: 0, opCost: 0 },
  ]);
  
  // 更新渠道数据
  const handleChannelChange = (type: 'live' | 'video' | 'search', index: number, field: keyof ChannelData, value: number) => {
    const setters = {
      live: setLiveChannels,
      video: setVideoChannels,
      search: setSearchChannels,
    };
    setters[type](prev => {
      const newData = [...prev];
      (newData[index] as any)[field] = value;
      return newData;
    });
  };
  
  // 计算小计
  const calcSubtotal = (channels: ChannelData[]) => ({
    amount: channels.reduce((sum, ch) => sum + ch.amount, 0),
    flow: channels.reduce((sum, ch) => sum + ch.flow, 0),
    totalCost: channels.reduce((sum, ch) => sum + ch.adCost + ch.opCost, 0),
    flowEfficiency: channels.reduce((sum, ch) => sum + ch.flow, 0) > 0 
      ? channels.reduce((sum, ch) => sum + ch.amount, 0) / channels.reduce((sum, ch) => sum + ch.flow, 0) 
      : 0,
    cpm: channels.reduce((sum, ch) => sum + ch.flow, 0) > 0 
      ? channels.reduce((sum, ch) => sum + ch.adCost + ch.opCost, 0) / channels.reduce((sum, ch) => sum + ch.flow, 0) * 1000 
      : 0,
  });
  
  const liveData = calcSubtotal(liveChannels);
  const videoData = calcSubtotal(videoChannels);
  const searchData = calcSubtotal(searchChannels);
  
  const totalAmount = liveData.amount + videoData.amount + searchData.amount;
  const totalFlow = liveData.flow + videoData.flow + searchData.flow;
  const totalCost2 = liveData.totalCost + videoData.totalCost + searchData.totalCost;
  
  // 将填写数据同步到chartData
  useEffect(() => {
    // 只在选择模板表单时才同步数据
    if (dataSource !== 'template') return;
    
    const allChannels = [
      ...liveChannels.map(ch => ({ ...ch, category: '直播' })),
      ...videoChannels.map(ch => ({ ...ch, category: '短视频' })),
      ...searchChannels.map(ch => ({ ...ch, category: '搜索' })),
    ].filter(ch => ch.amount > 0 || ch.flow > 0 || (ch.adCost + ch.opCost) > 0);
    
    if (allChannels.length > 0) {
      const newChartData: ChartData[] = allChannels.map(ch => ({
        name: ch.name,
        flowEfficiency: ch.flow > 0 ? ch.amount / ch.flow : 0,
        cpm: ch.flow > 0 ? (ch.adCost + ch.opCost) / ch.flow * 1000 : 0,
        cost: ch.adCost + ch.opCost,
        costRatio: totalCost2 > 0 ? ((ch.adCost + ch.opCost) / totalCost2) * 100 : 0,
        category: ch.category,
      }));
      
      // 添加小计行
      if (liveData.amount > 0 || liveData.flow > 0 || liveData.totalCost > 0) {
        newChartData.push({
          name: '直播小计',
          flowEfficiency: liveData.flow > 0 ? liveData.amount / liveData.flow : 0,
          cpm: liveData.cpm,
          cost: liveData.totalCost,
          costRatio: totalCost2 > 0 ? (liveData.totalCost / totalCost2) * 100 : 0,
          category: '',
        });
      }
      if (videoData.amount > 0 || videoData.flow > 0 || videoData.totalCost > 0) {
        newChartData.push({
          name: '短视频小计',
          flowEfficiency: videoData.flow > 0 ? videoData.amount / videoData.flow : 0,
          cpm: videoData.cpm,
          cost: videoData.totalCost,
          costRatio: totalCost2 > 0 ? (videoData.totalCost / totalCost2) * 100 : 0,
          category: '',
        });
      }
      if (searchData.amount > 0 || searchData.flow > 0 || searchData.totalCost > 0) {
        newChartData.push({
          name: '搜索小计',
          flowEfficiency: searchData.flow > 0 ? searchData.amount / searchData.flow : 0,
          cpm: searchData.cpm,
          cost: searchData.totalCost,
          costRatio: totalCost2 > 0 ? (searchData.totalCost / totalCost2) * 100 : 0,
          category: '',
        });
      }
      
      setChartData(newChartData);
      setHasCustomData(true);
      setFileName('手动填写');
      setHasData(true);
      
      // 手动填写数据后也触发记录
      setTimeout(() => {
        captureAndUpload(newChartData, '手动填写');
      }, 100);
    }
  }, [liveChannels, videoChannels, searchChannels, dataSource]);

  const getFlowEfficiencyColor = (value: number) => {
    if (value > 1) return '#22c55e';
    if (value > 0.3) return '#3b82f6';
    if (value > 0.01) return '#eab308';
    return '#ef4444';
  };

  const getCpmColor = (value: number) => {
    if (value > 200) return '#ef4444';
    if (value > 100) return '#f97316';
    if (value > 50) return '#eab308';
    return '#22c55e';
  };

  const sortedByFlow = [...chartData].sort((a, b) => b.flowEfficiency - a.flowEfficiency);
  const sortedByCpm = [...chartData].sort((a, b) => b.cpm - a.cpm).filter(d => d.cpm > 0);

  // 计算统计值
  const maxFlowItem = sortedByFlow[0];
  const minFlowItem = sortedByFlow[sortedByFlow.length - 1];
  const maxCpmItem = sortedByCpm[0];
  const minCpmItem = sortedByCpm[sortedByCpm.length - 1];

  // 表格排序逻辑
  const getTableSortIcon = (field: 'flowEfficiency' | 'cpm') => {
    if (tableSortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return tableSortDirection === 'desc' ? (
      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  const handleTableSort = (field: 'flowEfficiency' | 'cpm') => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setTableSortField(field);
      setTableSortDirection('desc');
    }
  };

  const getSortedTableData = () => {
    const sorted = [...chartData];
    if (tableSortField === 'flowEfficiency') {
      sorted.sort((a, b) => tableSortDirection === 'desc' ? b.flowEfficiency - a.flowEfficiency : a.flowEfficiency - b.flowEfficiency);
    } else if (tableSortField === 'cpm') {
      sorted.sort((a, b) => tableSortDirection === 'desc' ? b.cpm - a.cpm : a.cpm - b.cpm);
    }
    return sorted;
  };

  const sortedTableData = getSortedTableData();

  return (
    <div ref={chartRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                客户生意经【全案度量】分析报告
              </h1>
              <p className="mt-2 text-violet-100">
                流量效率 & CPM 多维度分析
              </p>
              {fileName && (
                <p className="mt-1 text-sm text-violet-200">
                  当前文件: {fileName} {hasCustomData && <span className="ml-2">(已上传数据)</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // 先清除API状态
                  fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'clear' }),
                  }).catch(console.error);
                  
                  // 重置所有状态
                  setDataSource('none');
                  setHasCustomData(false);
                  setFileName(null);
                  setHasData(false);
                  setChartData([]);
                  setStep1Data({ historyAmount: 0, historyFlow: 0, targetAmount: 0, budget: 0, experienceRatio: null });
                  setLiveChannels([
                    { name: '商家官方直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                    { name: '达人直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                    { name: '职人直播', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                  ]);
                  setVideoChannels([
                    { name: '达人视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                    { name: '职人视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                    { name: '官方账号主页视频', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                  ]);
                  setSearchChannels([
                    { name: '抖音搜索', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                    { name: '团购搜索', amount: 0, flow: 0, adCost: 0, opCost: 0 },
                  ]);
                }}
                className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清除所有数据
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Data Source Selection Section */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              填写数据
            </h2>
            
            {/* 选择界面 */}
            {dataSource === 'none' && (
              <div className="flex flex-col md:flex-row gap-4 justify-center py-8">
                <button
                  onClick={() => {
                    setChartData([]); // 清空旧数据
                    setDataSource('template');
                    setHasData(true);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl shadow-sm hover:shadow-md hover:border-violet-300 border-2 border-transparent transition-all min-w-[200px]"
                >
                  <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700">未有数据</span>
                  <span className="text-xs text-gray-500">基于生意经填写数据</span>
                </button>
                
                <button
                  onClick={() => setDataSource('upload')}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 border-2 border-transparent transition-all min-w-[200px]"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700">已有数据</span>
                  <span className="text-xs text-gray-500">上传表格</span>
                </button>
              </div>
            )}
            
            {/* 生意经数据表单 */}
            {dataSource === 'template' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      setDataSource('none');
                      setHasData(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    重新选择
                  </button>
                </div>
                
                {/* STEP 1: 计算本期流量目标 */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm">Step1</span>
                    计算本期流量目标
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">历史成交金额</label>
                      <input
                        type="number"
                        value={step1Data.historyAmount || ''}
                        onChange={(e) => handleStep1Change('historyAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">历史流量</label>
                      <input
                        type="number"
                        value={step1Data.historyFlow || ''}
                        onChange={(e) => handleStep1Change('historyFlow', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-gray-600">GMV系数</label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-medium">
                        {gmvRatio > 0 ? gmvRatio.toFixed(2) : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">本次成交金额目标</label>
                      <input
                        type="number"
                        value={step1Data.targetAmount || ''}
                        onChange={(e) => handleStep1Change('targetAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">本次活动费用</label>
                      <input
                        type="number"
                        value={step1Data.budget || ''}
                        onChange={(e) => handleStep1Change('budget', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">历史经验系数（默认值为1）</label>
                      <input
                        type="number"
                        value={step1Data.experienceRatio ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = val === '' ? null : (parseFloat(val) || null);
                          // 限制范围在0-10之间
                          if (numVal !== null && (numVal < 0 || numVal > 10)) {
                            return;
                          }
                          handleStep1Change('experienceRatio', numVal);
                        }}
                        min="0"
                        max="10"
                        step="0.01"
                        placeholder=""
                        className="w-full px-3 py-2 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-green-600">预估所需流量</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-green-600 font-bold">
                        {calculatedFlow.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* STEP 2: 历史数据分析 */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="bg-violet-500 text-white px-2 py-0.5 rounded text-sm">Step2</span>
                    历史数据分析（自动计算）
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-40">数据情况</th>
                          <th className="px-3 py-2 text-right font-semibold text-blue-600">成交金额(生意经取数)</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">成交金额占比</th>
                          <th className="px-3 py-2 text-right font-semibold text-blue-600">流量(生意经取数)</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">流量占比</th>
                          <th className="px-3 py-2 text-right font-semibold text-blue-600">费用1-广告费（本地推、达人、品牌投放费等）</th>
                          <th className="px-3 py-2 text-right font-semibold text-blue-600">费用2-运营制作费（素材制作、直播场地费等）</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">费用汇总</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">费用占比</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">流量效率</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">总CPM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 直播小计 */}
                        <tr className="bg-violet-50 font-medium">
                          <td className="px-3 py-2 text-violet-700">直播小计</td>
                          <td className="px-3 py-2 text-right text-blue-600">{liveData.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((liveData.amount / totalAmount) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">{liveData.flow.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((liveData.flow / totalFlow) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right">{liveData.totalCost.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((liveData.totalCost / totalCost2) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right">{liveData.flowEfficiency.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{liveData.cpm.toFixed(2)}</td>
                        </tr>
                        {liveChannels.map((ch, idx) => (
                          <tr key={`live-${idx}`} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{ch.name}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.amount || ''}
                                onChange={(e) => handleChannelChange('live', idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.amount / totalAmount * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.flow || ''}
                                onChange={(e) => handleChannelChange('live', idx, 'flow', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.flow / totalFlow * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.adCost || ''}
                                onChange={(e) => handleChannelChange('live', idx, 'adCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.opCost || ''}
                                onChange={(e) => handleChannelChange('live', idx, 'opCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">{(ch.adCost + ch.opCost).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{((ch.adCost + ch.opCost) / totalCost2 * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? (ch.amount / ch.flow).toFixed(2) : '0.00'}</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? ((ch.adCost + ch.opCost) / ch.flow * 1000).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                        
                        {/* 短视频小计 */}
                        <tr className="bg-blue-50 font-medium">
                          <td className="px-3 py-2 text-blue-700">短视频小计</td>
                          <td className="px-3 py-2 text-right text-blue-600">{videoData.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((videoData.amount / totalAmount) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">{videoData.flow.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((videoData.flow / totalFlow) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right">{videoData.totalCost.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((videoData.totalCost / totalCost2) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right">{videoData.flowEfficiency.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{videoData.cpm.toFixed(2)}</td>
                        </tr>
                        {videoChannels.map((ch, idx) => (
                          <tr key={`video-${idx}`} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{ch.name}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.amount || ''}
                                onChange={(e) => handleChannelChange('video', idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.amount / totalAmount * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.flow || ''}
                                onChange={(e) => handleChannelChange('video', idx, 'flow', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.flow / totalFlow * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.adCost || ''}
                                onChange={(e) => handleChannelChange('video', idx, 'adCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.opCost || ''}
                                onChange={(e) => handleChannelChange('video', idx, 'opCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">{(ch.adCost + ch.opCost).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{((ch.adCost + ch.opCost) / totalCost2 * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? (ch.amount / ch.flow).toFixed(2) : '0.00'}</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? ((ch.adCost + ch.opCost) / ch.flow * 1000).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                        
                        {/* 搜索小计 */}
                        <tr className="bg-green-50 font-medium">
                          <td className="px-3 py-2 text-green-700">搜索小计</td>
                          <td className="px-3 py-2 text-right text-blue-600">{searchData.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((searchData.amount / totalAmount) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">{searchData.flow.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((searchData.flow / totalFlow) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right text-blue-600">-</td>
                          <td className="px-3 py-2 text-right">{searchData.totalCost.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{((searchData.totalCost / totalCost2) * 100 || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right">{searchData.flowEfficiency.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{searchData.cpm.toFixed(2)}</td>
                        </tr>
                        {searchChannels.map((ch, idx) => (
                          <tr key={`search-${idx}`} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{ch.name}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.amount || ''}
                                onChange={(e) => handleChannelChange('search', idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.amount / totalAmount * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.flow || ''}
                                onChange={(e) => handleChannelChange('search', idx, 'flow', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">{(ch.flow / totalFlow * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.adCost || ''}
                                onChange={(e) => handleChannelChange('search', idx, 'adCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={ch.opCost || ''}
                                onChange={(e) => handleChannelChange('search', idx, 'opCost', parseFloat(e.target.value) || 0)}
                                className="w-full text-right px-2 py-1 border border-blue-300 rounded text-blue-600 font-medium focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">{(ch.adCost + ch.opCost).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{((ch.adCost + ch.opCost) / totalCost2 * 100 || 0).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? (ch.amount / ch.flow).toFixed(2) : '0.00'}</td>
                            <td className="px-3 py-2 text-right">{ch.flow > 0 ? ((ch.adCost + ch.opCost) / ch.flow * 1000).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                        
                        {/* 总计 */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-3 py-2 text-gray-800">总计</td>
                          <td className="px-3 py-2 text-right text-blue-600">{totalAmount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                          <td className="px-3 py-2 text-right text-blue-600">{totalFlow.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                          <td className="px-3 py-2 text-right">-</td>
                          <td className="px-3 py-2 text-right">-</td>
                          <td className="px-3 py-2 text-right">{totalCost2.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                          <td className="px-3 py-2 text-right">{totalFlow > 0 ? (totalAmount / totalFlow).toFixed(2) : '0.00'}</td>
                          <td className="px-3 py-2 text-right">{totalFlow > 0 ? (totalCost2 / totalFlow * 1000).toFixed(2) : '0.00'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* 上传数据表单 */}
            {dataSource === 'upload' && (
              <div>
                {/* 模板下载提示 */}
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>⚠️ 请先下载模板，按模板格式填写：</strong>
                  </p>
                  <a
                    href="https://bytedance.larkoffice.com/sheets/LPbSsWeWkhywQUtkcD1cxQhfnae?from=from_parent_docx&sheet=GCT5wD&table=tblWcuUwy0tAwkqb&view=vew4Q8DJLx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    📥 点击下载数据模板
                  </a>
                  <p className="text-xs text-amber-700 mt-2">
                    必须按模板格式填写，否则可能出现数据识别问题！
                  </p>
                </div>
                
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      setDataSource('none');
                      setHasData(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    重新选择
                  </button>
                </div>
                <ExcelUploader onDataLoaded={(data, name) => {
                  if (data && data.length > 0) {
                    setChartData(data);
                    setHasCustomData(true);
                    setFileName(name);
                    setHasData(true);
                    // 截图并记录数据生成
                    captureAndUpload(data, name);
                  }
                }} />
              </div>
            )}
          </div>
        </section>

        {hasData && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">流量效率 - 最高</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {maxFlowItem?.flowEfficiency.toFixed(4) || '0.0000'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{maxFlowItem?.name || '-'}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">流量效率 - 最低</p>
                <p className="text-3xl font-bold text-red-500 mt-1">
                  {minFlowItem?.flowEfficiency.toFixed(4) || '0.0000'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{minFlowItem?.name || '-'}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CPM - 最高</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {maxCpmItem?.cpm.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{maxCpmItem?.name || '-'}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CPM - 最低</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {minCpmItem && minCpmItem.cpm > 0 ? minCpmItem.cpm.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {minCpmItem && minCpmItem.cpm > 0 ? minCpmItem.name : '-'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'flow'
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              流量效率分析
            </button>
            <button
              onClick={() => setActiveTab('cpm')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'cpm'
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              CPM分析
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'flow' ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">流量效率排名</h3>
                  <p className="text-sm text-gray-500">成交金额 / 流量（越高越好）</p>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedByFlow} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => v.toFixed(4)} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => value.toFixed(4)} />
                      <Bar dataKey="flowEfficiency" radius={[0, 4, 4, 0]}>
                        {sortedByFlow.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getFlowEfficiencyColor(entry.flowEfficiency)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>高效 (&gt;1.0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span>
                    <span>良好 (0.3-1.0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                    <span>一般 (0.01-0.3)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>低效 (&lt;0.01)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">CPM 排名</h3>
                  <p className="text-sm text-gray-500">总费用 / 流量 × 1000（越低越好）</p>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedByCpm} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                      <Bar dataKey="cpm" radius={[0, 4, 4, 0]}>
                        {sortedByCpm.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCpmColor(entry.cpm)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>低成本 (&lt;50)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                    <span>中等 (50-100)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded"></span>
                    <span>较高 (100-200)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>成本高 (&gt;200)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Insights - 基于文档的优化建议 - 左右两列布局 */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* 三步诊断优化建议 */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-6 border border-violet-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-800">📋 三步诊断优化建议</h3>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">基于景区营销效率方案</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* STEP 1 - 流量效率结果 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h4 className="font-semibold text-gray-800">流量效率结果</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">当前上传表格各渠道效率分析</p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-gray-500 mb-1">流量效率</p>
                    <p className="font-semibold text-blue-700">
                      最高: {maxFlowItem?.name || '-'} ({maxFlowItem?.flowEfficiency?.toFixed(4) || '-'})
                    </p>
                    <p className="font-semibold text-red-700">
                      最低: {minFlowItem?.name || '-'} ({minFlowItem?.flowEfficiency?.toFixed(4) || '-'})
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-gray-500 mb-1">CPM (千次曝光成本)</p>
                    <p className="font-semibold text-green-700">
                      最低: {chartData.length > 0 ? chartData.reduce((min, d) => d.cpm < min.cpm ? d : min, chartData[0]).name : '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {chartData.length > 0 ? `CPM: ${chartData.reduce((min, d) => d.cpm < min.cpm ? d : min, chartData[0]).cpm.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-gray-500 mb-1">费用占比</p>
                    <p className="font-semibold text-purple-700">
                      {chartData.length > 0 ? chartData.reduce((max, d) => (d.costRatio || 0) > (max.costRatio || 0) ? d : max, chartData[0]).name : '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {chartData.length > 0 ? `${chartData.reduce((max, d) => (d.costRatio || 0) > (max.costRatio || 0) ? d : max, chartData[0]).costRatio?.toFixed(1) || 0}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 2 - 分析建议 */}
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-violet-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="font-semibold text-gray-800">分析建议</h4>
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">核心步骤</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">对比行业标杆值与当前值</p>
                <div className="space-y-2 text-xs">
                  {/* 流量效率分析 */}
                  <div className="p-2 bg-violet-50 rounded">
                    <p className="text-violet-700 font-medium mb-1">📊 流量效率分析</p>
                    <p className="text-gray-600">
                      {chartData.length === 0 ? '暂无数据，请先填写数据' : (() => {
                        const maxFlowItem = chartData.reduce((max, d) => d.flowEfficiency > max.flowEfficiency ? d : max, chartData[0]);
                        return maxFlowItem && maxFlowItem.flowEfficiency > 0
                          ? `${maxFlowItem.name}流量效率最高(${maxFlowItem.flowEfficiency.toFixed(2)})，获取流量能力最强`
                          : `各渠道流量效率差异较大`;
                      })()}
                    </p>
                  </div>
                  {/* CPM成本分析 */}
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-blue-700 font-medium mb-1">⚡ CPM成本分析</p>
                    <p className="text-gray-600">
                      {chartData.length === 0 ? '' : (() => {
                        const avgCpm = chartData.reduce((sum, d) => sum + d.cpm, 0) / chartData.length;
                        const minCpmItem = chartData.reduce((min, d) => d.cpm < min.cpm && d.cpm > 0 ? d : min, chartData[0]);
                        return minCpmItem && minCpmItem.cpm > 0 && minCpmItem.cpm < avgCpm * 0.7
                          ? `${minCpmItem.name}CPM最低(${Math.round(minCpmItem.cpm)})，成本效益好`
                          : `各渠道CPM差异较大，需关注成本优化`;
                      })()}
                    </p>
                  </div>
                  {/* 费用结构分析 */}
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-purple-700 font-medium mb-1">💰 费用结构分析</p>
                    <p className="text-gray-600">
                      {chartData.length === 0 ? '暂无数据' : (() => {
                        const totalCost = chartData.reduce((sum, d) => sum + (d.cost || 0), 0);
                        const highCostItems = chartData.filter(d => (d.costRatio || 0) > 0.1);
                        if (highCostItems.length > 0) {
                          return `主要费用集中在${highCostItems[0].name}（${highCostItems[0].costRatio}%）`;
                        }
                        return `总费用${totalCost.toFixed(2)}万，分布较均衡`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 3 - 优化策略 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h4 className="font-semibold text-gray-800">优化策略</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">根据分析结果制定优化方案</p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-emerald-50 rounded">
                    <p className="text-emerald-700 font-medium mb-1">✅ 优化策略：</p>
                    <p className="text-gray-700">• 降低低效渠道预算</p>
                    <p className="text-gray-700">• 加大高效渠道投放</p>
                    <p className="text-gray-700">• 优化投放时间段</p>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <p className="text-yellow-700 font-medium mb-1">📌 关键指标监控：</p>
                    <p className="text-gray-700">• 流量效率 ≥ 0.5</p>
                    <p className="text-gray-700">• CPM 越低越好</p>
                    <p className="text-gray-700">• 费用占比合理分配</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          {/* 右侧 - 达人视频专项分析 - 当达人视频流量效率偏低时显示 */}
          {chartData.some(item => item.name?.includes('达人视频') && item.flowEfficiency < 0.5) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <h4 className="font-semibold text-gray-800">达人视频下钻分析（流量效率偏低）</h4>
              </div>
              
              {/* 分析思路1 和 分析思路2 并排布局 */}
              <div className="grid grid-cols-1 gap-4 mb-4">
                {/* 分析思路1 */}
                <div className="p-3 bg-white rounded-lg border border-orange-100">
                  <p className="text-sm font-medium text-orange-700 mb-2">1️⃣ 分析思路1：查看合作过的达人视频中是否存在大批量低曝光、低转化的视频</p>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>• 根据下图中4个步骤找到你历史合作过的达人短视频列表</li>
                    <li>• 在"指标选择"中勾选"观看-成交转化率"、"千川播放成交金额"、"视频播放次数"、"视频直接成交金额"这4个维度数据后，导出excel表</li>
                    <li>• 在导出的excel表中查看是否存在大批量低曝光、低转化的视频</li>
                    <li>• <strong>低效视频费用占比</strong>若超过50%，则表示较多预算浪费了</li>
                    <li>• <strong>低效视频数量占比</strong>若超过50%，可酌情分析是否有较多纯佣达人，此类无合作费用的达人可忽略不计</li>
                  </ul>
                  <div className="flex gap-3 overflow-x-auto py-2 mt-3">
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F1.png&nonce=bd837b4d-ff0d-4b26-ad65-cab1f2fc39a5&project_id=7629252999420100614&sign=08900bc7da295371ac2fdf7abd383a04d1a12e828cab441bc65cd086179df4de" 
                      alt="图1" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F1.png&nonce=bd837b4d-ff0d-4b26-ad65-cab1f2fc39a5&project_id=7629252999420100614&sign=08900bc7da295371ac2fdf7abd383a04d1a12e828cab441bc65cd086179df4de", alt: "图1" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F2+%281%29.jpg&nonce=2da268bc-4376-40cf-bcfa-cca19ff95701&project_id=7629252999420100614&sign=74a1e727bbe8e4fa7d0233a6b35ced381e49d507a3e0f06b46117e686f0190e7" 
                      alt="图2" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F2+%281%29.jpg&nonce=2da268bc-4376-40cf-bcfa-cca19ff95701&project_id=7629252999420100614&sign=74a1e727bbe8e4fa7d0233a6b35ced381e49d507a3e0f06b46117e686f0190e7", alt: "图2" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F3+%281%29.jpg&nonce=5f35d082-e3e4-459b-afde-cb55c4779109&project_id=7629252999420100614&sign=1e48d498884cf784c44a36023cf48f7e82d110bc47293f2b9815e00cc003c8ae" 
                      alt="图3" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F3+%281%29.jpg&nonce=5f35d082-e3e4-459b-afde-cb55c4779109&project_id=7629252999420100614&sign=1e48d498884cf784c44a36023cf48f7e82d110bc47293f2b9815e00cc003c8ae", alt: "图3" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F4+%281%29.jpg&nonce=77318ca0-4b92-4e52-add6-fb158e428ac4&project_id=7629252999420100614&sign=a7c374a103143320cf4f6297f46240ab13f1d200a5b492e64413b52a75dd3632" 
                      alt="图4" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F4+%281%29.jpg&nonce=77318ca0-4b92-4e52-add6-fb158e428ac4&project_id=7629252999420100614&sign=a7c374a103143320cf4f6297f46240ab13f1d200a5b492e64413b52a75dd3632", alt: "图4" })}
                    />
                  </div>
                </div>

                {/* 分析思路2 */}
                <div className="p-3 bg-white rounded-lg border border-orange-100">
                  <p className="text-sm font-medium text-orange-700 mb-2">2️⃣ 分析思路2：查看合作达人的类型是否存在偏差</p>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>• 先在生意经【人群-人群资产】中查看已购买人群（活跃用户/A4人群）的画像分布</li>
                    <li>• 若合作的达人的用户画像与商家购买人群不匹配，且数量&gt;50%，则表示较多预算浪费了</li>
                    <li>• <strong className="text-green-600">✅ 匹配</strong>：达人A的用户画像为城镇青年、31-40岁的女性人群，与客户主力人群画像匹配</li>
                    <li>• <strong className="text-red-600">❌ 不匹配</strong>：达人B的用户画像为城镇青年、31-40岁的男性人群，与客户主力人群画像不匹配。若客户营销的主要目标为促成交转化，则建议此类达人后续减少合作</li>
                    <li>• （无合作费用的纯佣达人可忽略不计）</li>
                  </ul>
                  <div className="flex gap-3 overflow-x-auto py-2 mt-3">
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E8%BE%BE%E4%BA%BAA%E7%9A%84%E7%94%A8%E6%88%B7%E7%89%B9%E5%BE%81.jpg&nonce=419dd5b4-02cd-45b9-ab11-2bd08d43d20c&project_id=7629252999420100614&sign=a2cede9ba75a1db9bbdc2ea0000b36a917567ef679773eb4a46ba71320c2a419" 
                      alt="达人A用户特征" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E8%BE%BE%E4%BA%BAA%E7%9A%84%E7%94%A8%E6%88%B7%E7%89%B9%E5%BE%81.jpg&nonce=419dd5b4-02cd-45b9-ab11-2bd08d43d20c&project_id=7629252999420100614&sign=a2cede9ba75a1db9bbdc2ea0000b36a917567ef679773eb4a46ba71320c2a419", alt: "达人A用户特征" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E8%BE%BE%E4%BA%BAB%E7%9A%84%E7%94%A8%E6%88%B7%E7%89%B9%E5%BE%81.png&nonce=10187017-d6b3-4666-9cff-deddd3c729c3&project_id=7629252999420100614&sign=a93a6534e7d2b9e048c101ea25cc7b971c97944dd53f6d61de3bca1b322f3aea" 
                      alt="达人B用户特征" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E8%BE%BE%E4%BA%BAB%E7%9A%84%E7%94%A8%E6%88%B7%E7%89%B9%E5%BE%81.png&nonce=10187017-d6b3-4666-9cff-deddd3c729c3&project_id=7629252999420100614&sign=a93a6534e7d2b9e048c101ea25cc7b971c97944dd53f6d61de3bca1b322f3aea", alt: "达人B用户特征" })}
                    />
                  </div>
                </div>

                {/* 及时止损 */}
                <div className="p-3 bg-white rounded-lg border border-orange-100">
                  <p className="text-sm font-medium text-orange-700 mb-2">🛡️ 及时止损：达人短视频人群二次利用</p>
                  <p className="text-xs text-gray-600 mb-2">虽然钱浪费了，但还是可以把达人短视频带来的流量进行充分二次利用：</p>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li>• 达人短视频带来了大量的曝光人群（聚集在"A1、A2、A3"的机会人群）</li>
                    <li>• 此类人群对于商家有基础认知，但尚未有购买/核销行为</li>
                    <li>• 可将此类人群打包至本地推投放，观测投放效果是否提升</li>
                    <li>• 若不及时二次触达，机会人群将流失</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2 font-medium">操作步骤：</p>
                  <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
                    <li>生意经-点击人群推送按钮</li>
                    <li>跳转来客，创建人群包</li>
                    <li>人群包推送至本地推</li>
                    <li>在本地推圈选该人群包进行投放</li>
                  </ol>
                  <div className="flex gap-3 overflow-x-auto py-2 mt-3">
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F1.%E7%94%9F%E6%84%8F%E7%BB%8F-%E7%82%B9%E5%87%BB%E4%BA%BA%E7%BE%A4%E6%8E%A8%E9%80%81%E6%8C%89%E9%92%AE&nonce=9a4bad37-3bae-410e-8f89-6dbdd723d263&project_id=7629252999420100614&sign=e51079a889c5fc350003613e5aaf35ec4bd0cb61351d11136712bf55021c67af" 
                      alt="步骤1：生意经-点击人群推送按钮" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F1.%E7%94%9F%E6%84%8F%E7%BB%8F-%E7%82%B9%E5%87%BB%E4%BA%BA%E7%BE%A4%E6%8E%A8%E9%80%81%E6%8C%89%E9%92%AE&nonce=9a4bad37-3bae-410e-8f89-6dbdd723d263&project_id=7629252999420100614&sign=e51079a889c5fc350003613e5aaf35ec4bd0cb61351d11136712bf55021c67af", alt: "步骤1：生意经-点击人群推送按钮" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F2.%E8%B7%B3%E8%BD%AC%E6%9D%A5%E5%AE%A2%EF%BC%8C%E5%88%9B%E5%BB%BA%E4%BA%BA%E7%BE%A4%E5%8C%85&nonce=a264301b-fcb3-4948-b36f-461590d8714b&project_id=7629252999420100614&sign=c41a9d770ea1ce5f9b1a312a852a3cfb1a0dcb9d6d671448d9faee7c9b1e6c3f" 
                      alt="步骤2：跳转来客，创建人群包" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F2.%E8%B7%B3%E8%BD%AC%E6%9D%A5%E5%AE%A2%EF%BC%8C%E5%88%9B%E5%BB%BA%E4%BA%BA%E7%BE%A4%E5%8C%85&nonce=a264301b-fcb3-4948-b36f-461590d8714b&project_id=7629252999420100614&sign=c41a9d770ea1ce5f9b1a312a852a3cfb1a0dcb9d6d671448d9faee7c9b1e6c3f", alt: "步骤2：跳转来客，创建人群包" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F3.%E4%BA%BA%E7%BE%A4%E5%8C%85%E6%8E%A8%E9%80%81%E8%87%B3%E6%9C%AC%E5%9C%B0%E6%8E%A8&nonce=8a11a2d1-105b-44d7-8135-3179f8c00c21&project_id=7629252999420100614&sign=72eedb02d2e5d70bb4166804c71b6090010fa9bed6afc41e8e4e94ab87137aee" 
                      alt="步骤3：人群包推送至本地推" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F3.%E4%BA%BA%E7%BE%A4%E5%8C%85%E6%8E%A8%E9%80%81%E8%87%B3%E6%9C%AC%E5%9C%B0%E6%8E%A8&nonce=8a11a2d1-105b-44d7-8135-3179f8c00c21&project_id=7629252999420100614&sign=72eedb02d2e5d70bb4166804c71b6090010fa9bed6afc41e8e4e94ab87137aee", alt: "步骤3：人群包推送至本地推" })}
                    />
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F4.%E5%9C%A8%E6%9C%AC%E5%9C%B0%E6%8E%A8%E5%9C%88%E9%80%89%E8%AF%A5%E4%BA%BA%E7%BE%A4%E5%8C%85%E8%BF%9B%E8%A1%8C%E6%8A%95%E6%94%BE&nonce=06539e28-169f-4043-9509-d56058b62da5&project_id=7629252999420100614&sign=81cefcbe5d9a003ecdb7f3b41f1e92d80d472b2fc876cb983b0bd63c89e31a2d" 
                      alt="步骤4：在本地推圈选该人群包进行投放" 
                      className="w-48 h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
                      onClick={() => setPreviewImage({ src: "https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F4.%E5%9C%A8%E6%9C%AC%E5%9C%B0%E6%8E%A8%E5%9C%88%E9%80%89%E8%AF%A5%E4%BA%BA%E7%BE%A4%E5%8C%85%E8%BF%9B%E8%A1%8C%E6%8A%95%E6%94%BE&nonce=06539e28-169f-4043-9509-d56058b62da5&project_id=7629252999420100614&sign=81cefcbe5d9a003ecdb7f3b41f1e92d80d472b2fc876cb983b0bd63c89e31a2d", alt: "步骤4：在本地推圈选该人群包进行投放" })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 图片预览弹窗 */}
          {previewImage && (
            <ImageModal
              isOpen={!!previewImage}
              src={previewImage.src}
              alt={previewImage.alt}
              onClose={() => setPreviewImage(null)}
            />
          )}

          {/* 核心发现 */}
          <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              核心发现（基于生意经方案）
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">⚠️ 需要优化的问题渠道：</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {chartData
                    .filter(item => item.flowEfficiency < 0.5)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500">(效率: {item.flowEfficiency.toFixed(4)})</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-green-700 mb-2">✅ 推荐加大投放的渠道：</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {chartData
                    .filter(item => item.flowEfficiency >= 0.5)
                    .sort((a, b) => b.flowEfficiency - a.flowEfficiency)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500">(效率: {item.flowEfficiency.toFixed(4)})</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">完整数据明细</h3>
              {hasCustomData && (
                <p className="text-sm text-gray-500 mt-1">已加载自定义Excel数据</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序:</span>
              <button
                onClick={() => handleTableSort('flowEfficiency')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  tableSortField === 'flowEfficiency'
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                流量效率
                {getTableSortIcon('flowEfficiency')}
              </button>
              <button
                onClick={() => handleTableSort('cpm')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  tableSortField === 'cpm'
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                CPM
                {getTableSortIcon('cpm')}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">渠道</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">流量效率</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">效率排名</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPM</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPM排名</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">费用占比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTableData.map((item, idx) => {
                  const isSubtotal = item.isSubtotal;

                  return (
                    <tr key={idx} className={`hover:bg-gray-50 ${isSubtotal ? 'bg-gray-50 font-semibold' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isSubtotal ? 'font-semibold text-gray-800 underline' : 'font-medium text-gray-900'}`}>
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {item.flowEfficiency > 0 ? item.flowEfficiency.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {item.flowRank ? `#${item.flowRank}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {item.cpm > 0 ? `¥${Math.round(item.cpm)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {item.cpmRank ? `#${item.cpmRank}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {item.costRatio && item.costRatio > 0 ? `${item.costRatio.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>

      {/* 报错弹窗 */}
      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
      />

      {/* 用户信息弹窗 */}
      <UserInfoModal
        isOpen={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        onSubmit={(agentName: string, channelManager: string) => {
          const info = { agentName, channelManager };
          localStorage.setItem('userInfo', JSON.stringify(info));
          setUserInfo(info);
          setShowUserInfoModal(false);
        }}
      />

      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4">
          {/* 底部操作按钮 */}
          <div className="flex justify-center gap-4 mb-6">
            {/* 点赞按钮 */}
            <button
              onClick={handleLike}
              disabled={isLiked}
              className={`px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                isLiked 
                  ? 'bg-pink-500 text-white cursor-default' 
                  : 'bg-gradient-to-r from-pink-400 to-rose-500 text-white hover:scale-105'
              }`}
            >
              <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-medium">{isLiked ? '已点赞' : '太好用了！点赞！'}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{likeCount}</span>
            </button>
            
            {/* 报错按钮 */}
            <button
              onClick={() => setShowFeedback(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">报错</span>
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-400">
            <p>数据来源: {hasCustomData ? fileName : '本地客户营销预算分配表'}</p>
            <p className="mt-1">分析时间: 2025年</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  User,
  Activity,
  ClipboardList,
  FileSearch,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MOCK_SITES, ALL_SITES_MOCK } from './mockData';
import { TimePeriod, Site, ActiveMenu } from './types';
import { masterApi } from './api/client';
import type { Site as ApiSiteType } from './api/types';
import DashboardView from './components/DashboardView';
import RiskAssessmentView from './components/RiskAssessmentView';
import TbmMonitoringView from './components/TbmMonitoringView';
import DateNavigator from './components/DateNavigator';

// API mode flag - set to true to use real API, false for mock data
const USE_API = true;

// History state interface
interface HistoryState {
  menu: ActiveMenu;
  siteId: string;
  isAllSites: boolean;
}

const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(ActiveMenu.DASHBOARD);
  const [currentTab, setCurrentTab] = useState<TimePeriod>(TimePeriod.DAILY);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSite, setSelectedSite] = useState<Site>(ALL_SITES_MOCK);
  const [isSiteOpen, setIsSiteOpen] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // History navigation을 위한 ref (무한 루프 방지)
  const isNavigatingBack = useRef(false);

  // API sites state
  const [apiSites, setApiSites] = useState<ApiSiteType[]>([]);
  const [apiSitesLoading, setApiSitesLoading] = useState(USE_API);

  // Fetch sites from API
  useEffect(() => {
    if (!USE_API) return;

    masterApi.getSites()
      .then((sites) => {
        setApiSites(sites);
        setApiSitesLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch sites:', err);
        setApiSitesLoading(false);
      });
  }, []);

  // Convert API site to legacy Site format for compatibility
  const apiSiteToLegacySite = (apiSite: ApiSiteType | null): Site => {
    if (!apiSite) {
      return ALL_SITES_MOCK;
    }
    return {
      id: String(apiSite.id),
      name: apiSite.name,
      companies: [] // API views don't need this - they fetch directly
    };
  };

  // Get available sites for dropdown
  const availableSites = USE_API ? apiSites : MOCK_SITES;

  // 초기 히스토리 상태 설정
  useEffect(() => {
    const initialState: HistoryState = {
      menu: activeMenu,
      siteId: 'all',
      isAllSites: true
    };
    window.history.replaceState(initialState, '');
  }, []);

  // 현장 선택 시 히스토리에 상태 추가
  const handleSiteSelect = (site: Site) => {
    // 뒤로가기로 인한 변경이면 히스토리에 추가하지 않음
    if (isNavigatingBack.current) {
      isNavigatingBack.current = false;
      setSelectedSite(site);
      return;
    }

    setSelectedSite(site);

    // 개별 현장 선택 시에만 히스토리에 추가
    if (site.id !== 'all') {
      const newState: HistoryState = {
        menu: activeMenu,
        siteId: site.id,
        isAllSites: false
      };
      window.history.pushState(newState, '');
    }
  };

  // 브라우저 뒤로가기 이벤트 핸들러
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;

      // 현재 개별 현장이 선택되어 있으면 전체 현장으로 이동
      if (selectedSite.id !== 'all') {
        isNavigatingBack.current = true;
        setSelectedSite(ALL_SITES_MOCK);

        // 히스토리 상태 유지를 위해 현재 전체 현장 상태를 다시 설정
        const allSitesState: HistoryState = {
          menu: activeMenu,
          siteId: 'all',
          isAllSites: true
        };
        window.history.replaceState(allSitesState, '');
      }
      // 이미 전체 현장이면 브라우저 기본 동작 (페이지 이탈)
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedSite.id, activeMenu]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSiteOpen(false);
        setSiteSearchQuery('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { id: ActiveMenu.DASHBOARD, label: '출퇴근', icon: Activity, title: '출퇴근 현황' },
    { id: ActiveMenu.RISK_ASSESSMENT, label: '위험성평가', icon: ClipboardList, title: '위험성평가 현황' },
    { id: ActiveMenu.TBM, label: 'TBM', icon: FileSearch, title: 'TBM 활동 현황' },
  ];

  const currentMenu = menuItems.find(m => m.id === activeMenu) || menuItems[0];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* 1. 왼쪽 사이드 메뉴 (Sidebar) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-[60]">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer">
            <svg width="140" height="36" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="4" width="32" height="32" rx="6" fill="#E31E24"/>
              <path d="M16 11C11.5 11 8 14.5 8 19V22H24V19C24 14.5 20.5 11 16 11Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 22C6 22 5 22 5 23.5C5 25 6.5 25 6.5 25H25.5C25.5 25 27 25 27 23.5C27 22 26 22 26 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 14.5C12 14.5 13.5 13.5 16 13.5C18.5 13.5 20 14.5 20 14.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
              <path d="M11 25V27C11 28.1 11.9 29 13 29H19C20.1 29 21 28.1 21 27V25" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <text x="38" y="28" fill="#1A1A1A" style={{ font: '900 22px "Inter", sans-serif', letterSpacing: '-1px' }}>현장통2.0</text>
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-6 px-4 pb-6 space-y-1">
          {menuItems.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveMenu(menu.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                activeMenu === menu.id 
                  ? 'bg-red-50 text-red-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-gray-50 hover:text-slate-900'
              }`}
            >
              <menu.icon 
                size={20} 
                className={`transition-colors duration-200 ${activeMenu === menu.id ? 'text-red-600' : 'text-slate-400'}`} 
              />
              <span className="flex-1 text-left">{menu.label}</span>
              {activeMenu === menu.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* 2. 메인 영역 (Right Side) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Section 1: Global Top Header (z-50) */}
        <header className="bg-white text-slate-900 h-16 shrink-0 z-[50] px-6 flex items-center justify-between shadow-sm border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black tracking-tight text-slate-900 whitespace-nowrap">
                전체 안전관리 대시보드
              </h1>
              <span className="text-gray-300">|</span>
              <span className="text-lg font-black text-[#E31E24] tracking-tight whitespace-nowrap">
                (주)삼천리이에스
              </span>
            </div>

            <div className="h-6 w-[1px] bg-gray-200 hidden md:block"></div>

            {/* 현장 선택기 - Dropdown 컨테이너에 z-index 확실히 부여 */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <div 
                onClick={() => setIsSiteOpen(!isSiteOpen)}
                className="flex items-center bg-[#f9fafb] border border-gray-300 rounded-md px-4 py-2 min-w-[240px] cursor-pointer hover:bg-white hover:border-blue-400 transition-all shadow-sm"
              >
                <span className="text-sm font-bold text-slate-800 flex-1 truncate">{selectedSite.name}</span>
                <div className="ml-2 text-gray-400">
                  {isSiteOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              
              {isSiteOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                  {/* 검색 input - 상단 고정 */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 z-10">
                    <input
                      type="text"
                      placeholder="현장명 검색..."
                      value={siteSearchQuery}
                      onChange={(e) => setSiteSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  {/* 스크롤 가능한 목록 영역 */}
                  <div className="max-h-[350px] overflow-y-auto">
                    <div
                      onClick={() => { handleSiteSelect(ALL_SITES_MOCK); setIsSiteOpen(false); setSiteSearchQuery(''); }}
                      className={`px-4 py-3 text-sm font-bold border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedSite.id === 'all' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                    >
                      전체 현장
                    </div>
                    {apiSitesLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-400">로딩중...</div>
                    ) : USE_API ? (
                      apiSites
                        .filter((site) => site.name.toLowerCase().includes(siteSearchQuery.toLowerCase()))
                        .map((site) => (
                          <div
                            key={site.id}
                            onClick={() => { handleSiteSelect(apiSiteToLegacySite(site)); setIsSiteOpen(false); setSiteSearchQuery(''); }}
                            className={`px-4 py-2.5 text-sm font-medium hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none ${
                              selectedSite.id === String(site.id) ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {site.name}
                          </div>
                        ))
                    ) : (
                      MOCK_SITES
                        .filter((site) => site.name.toLowerCase().includes(siteSearchQuery.toLowerCase()))
                        .map((site) => (
                          <div
                            key={site.id}
                            onClick={() => { handleSiteSelect(site); setIsSiteOpen(false); setSiteSearchQuery(''); }}
                            className={`px-4 py-2.5 text-sm font-medium hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none ${
                              selectedSite.id === site.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {site.name}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-gray-200">
                <User size={16} />
              </div>
              <div className="flex flex-col -space-y-1 hidden sm:flex">
                <span className="text-xs font-black text-slate-900">홍길동 관리자</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Administrator</span>
              </div>
              <button className="text-slate-400 hover:text-red-500 transition-colors ml-2 p-2 hover:bg-red-50 rounded-lg">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Section 2: Page Control Bar (z-40) */}
        <div className="bg-white border-b border-gray-200 shrink-0 z-[40] px-6 py-3 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {currentMenu.title}
          </h2>
          <DateNavigator 
            period={currentTab}
            onPeriodChange={setCurrentTab}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Section 3: Scrollable Dashboard Content (Body) */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-[1600px] w-full mx-auto px-6 py-8">
            <div className="transition-all duration-300">
              {activeMenu === ActiveMenu.DASHBOARD && (
                <DashboardView
                  selectedSite={selectedSite}
                  selectedDate={selectedDate}
                  period={currentTab}
                  onSiteSelect={handleSiteSelect}
                />
              )}
              {activeMenu === ActiveMenu.RISK_ASSESSMENT && (
                <RiskAssessmentView
                  selectedSite={selectedSite}
                  selectedDate={selectedDate}
                  period={currentTab}
                  onSiteSelect={handleSiteSelect}
                />
              )}
              {activeMenu === ActiveMenu.TBM && (
                <TbmMonitoringView
                  period={currentTab}
                  selectedDate={selectedDate}
                  selectedSite={selectedSite}
                  onSiteSelect={handleSiteSelect}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

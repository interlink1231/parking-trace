import { useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Battery, Bluetooth, CarFront,
  Check, ChevronRight, Clock3, Compass, History, House, MapPin, Moon,
  MoreHorizontal, Navigation, Radio, Search, Settings, ShieldCheck,
  Signal, Sun, Wifi, X
} from 'lucide-react'

type Page = 'home' | 'location' | 'history' | 'device' | 'settings'

const navItems: { id: Page; label: string; icon: typeof House }[] = [
  { id: 'home', label: '홈', icon: House },
  { id: 'location', label: '차량 위치', icon: MapPin },
  { id: 'history', label: '주차 기록', icon: History },
  { id: 'device', label: '기기 관리', icon: Bluetooth },
  { id: 'settings', label: '설정', icon: Settings },
]

function App() {
  const [page, setPage] = useState<Page>('home')
  const [dark, setDark] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  return (
    <div className={dark ? 'app dark' : 'app light'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Navigation size={20} /></div>
          <div><strong>PARKING TRACE</strong><span>SMART PARKING SYSTEM</span></div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-mini"><span className="live-dot" /><div><b>기기 연결됨</b><small>PT-ESP32-S3 · BLE</small></div><Bluetooth size={16} /></div>
          <button className="profile-row" onClick={() => setPage('settings')}>
            <div className="avatar">P</div><div><b>내 차량</b><small>기본 프로필</small></div><MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><Navigation size={17} /></div><b>PARKING TRACE</b></div>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{navItems.find(n => n.id === page)?.label}</b></div>
          <div className="top-actions">
            <span className="demo-tag"><span className="live-dot" /> DEMO MODE</span>
            <button className="icon-button" aria-label="테마 변경" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="avatar small-avatar" onClick={() => setPage('settings')}>P</button>
          </div>
        </header>

        <div className="content">
          {page === 'home' && <HomePage onNavigate={setPage} onNotify={notify} />}
          {page === 'location' && <LocationPage onNotify={notify} />}
          {page === 'history' && <HistoryPage showAll={showAll} setShowAll={setShowAll} search={search} setSearch={setSearch} />}
          {page === 'device' && <DevicePage onNotify={notify} />}
          {page === 'settings' && <SettingsPage dark={dark} setDark={setDark} onNotify={notify} />}
        </div>
        <footer className="footer"><span>© 2026 PARKING TRACE</span><span>위치 정보는 기기에서 수집된 샘플 데이터입니다.</span></footer>
      </main>

      <nav className="mobile-nav">
        {navItems.filter(n => n.id !== 'device').map(({ id, label, icon: Icon }) => (
          <button key={id} className={page === id ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setPage(id)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>
      {notice && <div className="toast"><Check size={16} />{notice}</div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function HomePage({ onNavigate, onNotify }: { onNavigate: (p: Page) => void; onNotify: (s: string) => void }) {
  return <>
    <PageHeading eyebrow="OVERVIEW" title="내 차량 찾기" description="마지막으로 기록된 차량의 위치를 확인하세요." action={<button className="outline-button" onClick={() => onNavigate('history')}><History size={16} /> 기록 전체보기</button>} />
    <section className="hero-card">
      <div className="hero-copy">
        <div className="status-pill"><span className="live-dot" /> LAST PARKING SAVED</div>
        <div className="hero-label">마지막 주차 위치</div>
        <h2>지하 2층 <span>B2</span></h2>
        <div className="hero-place"><MapPin size={16} /> 센트럴 주차장 · A 구역</div>
        <div className="hero-meta"><span><Clock3 size={14} /> 오늘 오후 3:42</span><span className="meta-divider" /><span><ShieldCheck size={14} /> 위치 신뢰도 높음</span></div>
        <button className="primary-button" onClick={() => onNavigate('location')}><Navigation size={17} /> 차량 위치 확인 <ChevronRight size={16} /></button>
      </div>
      <div className="hero-visual">
        <div className="map-grid" />
        <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
        <div className="map-block block-one">A ZONE</div><div className="map-block block-two">B ZONE</div><div className="map-block block-three">EXIT</div>
        <div className="map-route" />
        <div className="map-pin"><div><CarFront size={22} /></div><span /></div>
        <div className="map-caption"><MapPin size={13} /> PARKING LOCATION <b> B2 · A-14</b></div>
        <div className="map-zoom"><button aria-label="확대" onClick={() => onNotify('지도 확대는 실제 지도 연동 후 제공됩니다.')}>+</button><button aria-label="축소" onClick={() => onNotify('지도 축소는 실제 지도 연동 후 제공됩니다.')}>−</button></div>
      </div>
    </section>

    <div className="section-row"><div><h3>상태 요약</h3><p>연결된 기기와 마지막 기록 정보</p></div><span className="updated-label">방금 업데이트</span></div>
    <div className="stats-grid">
      <StatCard icon={<Bluetooth size={18} />} label="기기 연결" value="연결됨" sub="PT-ESP32-S3" tone="green" />
      <StatCard icon={<MapPin size={18} />} label="마지막 위치" value="지하 2층" sub="A 구역 · A-14" />
      <StatCard icon={<Battery size={18} />} label="기기 배터리" value="86%" sub="정상 상태" tone="green" />
      <StatCard icon={<Activity size={18} />} label="센서 상태" value="정상" sub="GNSS · BMP390 · IMU" tone="green" />
    </div>

    <div className="section-row"><div><h3>최근 주차 기록</h3><p>최근 차량 이동 및 주차 내역</p></div><button className="text-button" onClick={() => onNavigate('history')}>전체 기록 <ChevronRight size={15} /></button></div>
    <div className="record-list">
      <Record date="오늘" time="15:42" place="센트럴 주차장" detail="지하 2층 · A 구역" tag="주차 완료" />
      <Record date="어제" time="18:16" place="학교 주차장" detail="지상 1층 · 정문 방향" tag="주차 완료" />
      <Record date="11월 13일" time="17:51" place="센트럴 주차장" detail="지하 1층 · B 구역" tag="주차 완료" />
    </div>
  </>
}

function StatCard({ icon, label, value, sub, tone = '' }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: string }) {
  return <div className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span></div><strong className={tone}>{value}</strong><small>{sub}</small></div>
}

function Record({ date, time, place, detail, tag }: { date: string; time: string; place: string; detail: string; tag: string }) {
  return <div className="record-row"><div className="record-date"><b>{date}</b><span>{time}</span></div><div className="record-marker"><span /></div><div className="record-info"><b>{place}</b><span>{detail}</span></div><span className="record-tag"><Check size={12} />{tag}</span><ChevronRight className="record-chevron" size={17} /></div>
}

function LocationPage({ onNotify }: { onNotify: (s: string) => void }) {
  return <>
    <PageHeading eyebrow="LOCATION" title="차량 위치" description="마지막으로 저장된 위치와 층수 정보를 확인합니다." />
    <div className="location-layout">
      <section className="panel location-map-panel">
        <div className="panel-heading"><div><h3>주차 위치 지도</h3><p>센트럴 주차장 · 샘플 지도</p></div><span className="soft-pill">B2 · A-14</span></div>
        <div className="large-map">
          <div className="map-grid" /><div className="large-road road-one" /><div className="large-road road-two" /><div className="large-road road-three" />
          <div className="parking-lines">{Array.from({ length: 6 }).map((_, i) => <span key={i} />)}</div>
          <div className="large-map-pin"><CarFront size={25} /></div><div className="large-map-label">내 차량 · A-14</div>
          <div className="map-north">N ↑</div>
        </div>
        <div className="map-legend"><span><i className="legend-car" /> 내 차량</span><span><i className="legend-route" /> 저장된 구역</span><span className="legend-note">실제 지도 연동 전 미리보기</span></div>
      </section>
      <section className="panel location-details">
        <div className="panel-heading"><div><h3>저장된 위치 정보</h3><p>2026년 11월 15일 15:42 기록</p></div></div>
        <div className="location-address"><span className="address-icon"><MapPin size={20} /></span><div><small>주차 장소</small><b>센트럴 주차장</b></div></div>
        <div className="detail-grid"><div><small>층수</small><b>B2 · 지하 2층</b></div><div><small>구역</small><b>A 구역 · A-14</b></div><div><small>위치 신뢰도</small><b className="green">높음</b></div><div><small>기록 시각</small><b>오후 3:42</b></div></div>
        <div className="confidence"><div className="confidence-head"><span>위치 신뢰도</span><b>92%</b></div><div className="progress"><i style={{ width: '92%' }} /></div><p>샘플 수치입니다. 실제 신뢰도는 GNSS 및 센서 데이터 분석 후 산출됩니다.</p></div>
        <button className="primary-button full-button" onClick={() => onNotify('실제 길 안내는 지도 API 연동 후 제공됩니다.')}><Compass size={17} /> 위치 안내 시작</button>
      </section>
    </div>
  </>
}

function HistoryPage({ showAll, setShowAll, search, setSearch }: { showAll: boolean; setShowAll: (v: boolean) => void; search: string; setSearch: (v: string) => void }) {
  const records = [
    ['오늘', '15:42', '센트럴 주차장', '지하 2층 · A 구역', '주차 완료'],
    ['어제', '18:16', '학교 주차장', '지상 1층 · 정문 방향', '주차 완료'],
    ['11월 13일', '17:51', '센트럴 주차장', '지하 1층 · B 구역', '주차 완료'],
    ['11월 12일', '19:08', '학원 주차장', '지상 2층 · C 구역', '주차 완료'],
    ['11월 11일', '16:33', '센트럴 주차장', '지하 3층 · A 구역', '주차 완료'],
  ]
  const filtered = records.filter(r => r.join(' ').toLowerCase().includes(search.toLowerCase()))
  return <>
    <PageHeading eyebrow="PARKING HISTORY" title="주차 기록" description="차량이 주차된 위치와 시간을 확인할 수 있습니다." />
    <div className="history-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="장소 또는 날짜 검색" /></div><button className="outline-button" onClick={() => setShowAll(!showAll)}>{showAll ? '최근 기록만' : '전체 기간'} <ChevronRight size={15} /></button></div>
    <div className="history-summary"><div><small>전체 주차 기록</small><b>24<span>회</span></b></div><div><small>이번 주</small><b>8<span>회</span></b></div><div><small>최근 기록</small><b>오늘 <span>15:42</span></b></div></div>
    <section className="panel history-panel"><div className="panel-heading"><div><h3>주차 이력</h3><p>{filtered.length}개의 기록 표시 · 데모 데이터</p></div><span className="soft-pill">최근 순</span></div>
      {filtered.slice(0, showAll ? 5 : 3).map((r, i) => <Record key={i} date={r[0]} time={r[1]} place={r[2]} detail={r[3]} tag={r[4]} />)}
      {filtered.length === 0 && <div className="empty-state"><Search size={24} /><b>검색 결과가 없습니다.</b><span>다른 장소나 날짜로 검색해보세요.</span></div>}
    </section>
  </>
}

function DevicePage({ onNotify }: { onNotify: (s: string) => void }) {
  return <>
    <PageHeading eyebrow="DEVICE CENTER" title="기기 관리" description="차량에 설치된 PARKING TRACE 장치의 연결과 센서 상태를 확인합니다." action={<span className="connected-pill"><span className="live-dot" /> CONNECTED</span>} />
    <section className="device-hero panel"><div className="device-graphic"><div className="device-ring"><Radio size={42} /></div><span className="device-orbit orbit-a" /><span className="device-orbit orbit-b" /></div><div className="device-main-info"><span className="eyebrow">CONNECTED DEVICE</span><h2>PT-ESP32-S3</h2><p>ESP32-S3 DevKitC-1 · PARKING TRACE V1</p><div className="device-tags"><span><Bluetooth size={13} /> Bluetooth LE</span><span><Wifi size={13} /> BLE 연결</span><span><Battery size={13} /> 배터리 86%</span></div></div><button className="outline-button" onClick={() => onNotify('기기 재검색은 BLE 기능 구현 후 제공됩니다.')}><Radio size={16} /> 기기 재검색</button></section>
    <div className="section-row"><div><h3>센서 상태</h3><p>연결된 센서의 샘플 상태</p></div><span className="updated-label">샘플 데이터</span></div>
    <div className="sensor-grid">
      <Sensor icon={<Signal size={19} />} name="GNSS / GPS" model="M10 Mini GPS" state="대기 중" value="실제 위치 미연결" />
      <Sensor icon={<Activity size={19} />} name="IMU" model="MPU6050" state="정상" value="3축 가속도 · 자이로" />
      <Sensor icon={<ArrowUpRight size={19} />} name="기압 센서" model="BMP390" state="정상" value="기압 데이터 대기" />
      <Sensor icon={<Bluetooth size={19} />} name="Bluetooth LE" model="ESP32-S3 내장" state="연결됨" value="신호 상태 양호" />
    </div>
    <section className="panel device-settings"><div><h3>기기 정보</h3><p>장치 식별 및 펌웨어 정보</p></div><InfoLine label="장치 ID" value="PT-ESP32-S3-0001" /><InfoLine label="펌웨어 버전" value="V1.0.0 (예정)" /><InfoLine label="연결 방식" value="Bluetooth Low Energy" /><InfoLine label="마지막 통신" value="방금 전 (샘플)" /></section>
  </>
}

function Sensor({ icon, name, model, state, value }: { icon: React.ReactNode; name: string; model: string; state: string; value: string }) {
  return <div className="sensor-card"><div className="sensor-top"><span className="sensor-icon">{icon}</span><span className="sensor-state"><i />{state}</span></div><h3>{name}</h3><small>{model}</small><p>{value}</p></div>
}
function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="info-line"><span>{label}</span><b>{value}</b></div>
}

function SettingsPage({ dark, setDark, onNotify }: { dark: boolean; setDark: (v: boolean) => void; onNotify: (s: string) => void }) {
  return <>
    <PageHeading eyebrow="PREFERENCES" title="설정" description="앱 화면과 차량 및 기기 환경을 관리합니다." />
    <section className="panel settings-panel"><div className="settings-section"><div><h3>화면 설정</h3><p>앱의 표시 환경을 변경합니다.</p></div><div className="setting-row"><div className="setting-icon">{dark ? <Moon size={18} /> : <Sun size={18} />}</div><div className="setting-copy"><b>다크 모드</b><span>어두운 환경에 적합한 화면을 사용합니다.</span></div><button className={dark ? 'toggle on' : 'toggle'} onClick={() => setDark(!dark)} aria-label="다크 모드 전환"><i /></button></div></div>
    <div className="settings-section"><div><h3>차량 정보</h3><p>주차 위치 기록에 사용할 차량 프로필입니다.</p></div><div className="setting-row"><div className="setting-icon"><CarFront size={18} /></div><div className="setting-copy"><b>내 차량</b><span>기본 차량 프로필</span></div><button className="outline-button compact" onClick={() => onNotify('차량 프로필 편집 기능은 다음 버전에 추가됩니다.')}>편집 <ChevronRight size={14} /></button></div></div>
    <div className="settings-section"><div><h3>알림</h3><p>주차 기록 및 기기 연결 관련 알림입니다.</p></div><div className="setting-row"><div className="setting-icon"><ShieldCheck size={18} /></div><div className="setting-copy"><b>주차 기록 알림</b><span>주차 위치가 저장되면 알립니다.</span></div><button className="toggle on" onClick={() => onNotify('알림 설정은 실제 알림 권한 연동 후 적용됩니다.')} aria-label="주차 기록 알림"><i /></button></div></div>
    <div className="settings-section"><div><h3>앱 정보</h3><p>서비스 및 버전 정보</p></div><InfoLine label="앱 버전" value="Web UI V1.0.0" /><InfoLine label="하드웨어" value="ESP32-S3 · GNSS · BMP390 · MPU6050" /><InfoLine label="데이터 모드" value="DEMO · 로컬 샘플 데이터" /></div></section>
    <div className="settings-note"><ShieldCheck size={17} /><span>현재 화면은 UI 프로토타입입니다. 위치 및 센서 정보는 실제 기기와 연결되지 않은 샘플 데이터입니다.</span></div>
  </>
}

export default App
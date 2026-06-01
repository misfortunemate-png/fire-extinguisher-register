import { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import FacilityScreen from './components/FacilityScreen.jsx';
import EditScreen from './components/EditScreen.jsx';
import InspectScreen from './components/InspectScreen.jsx';
import IssueCardScreen from './components/IssueCardScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import Toast from './components/Toast.jsx';
import { useToast } from './hooks/useToast.js';

// 画面状態: 'home' | 'fac' | 'edit' | 'insp' | 'issueCard' | 'settings'
// React Router 不使用（仕様書制約）

export default function App() {
  const [screen, setScreen]               = useState('home');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedExt, setSelectedExt]     = useState(null);
  const [selectedInspId, setSelectedInspId] = useState(null);
  const [installPrompt, setInstallPrompt]  = useState(null);
  // グローバルトースト: SW 更新通知用
  const { toasts, showToast, dismissToast } = useToast();

  // beforeinstallprompt をキャプチャ（PWAインストールボタン用）
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // SW 登録・更新通知（§12）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/fire-extinguisher-register/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('更新があります', {
                actions: [{
                  label: '更新', primary: true,
                  onClick: () => { newSW.postMessage('skipWaiting'); window.location.reload(); },
                }],
              });
            }
          });
        });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  }

  function goHome()           { setScreen('home'); }
  function goFacility(fac)    { setSelectedFacility(fac); setScreen('fac'); }
  function goEdit(ext, fac)   { setSelectedExt(ext ?? null); setSelectedFacility(fac ?? selectedFacility); setScreen('edit'); }
  function goInspect(ext, fac){ setSelectedExt(ext); setSelectedFacility(fac ?? selectedFacility); setScreen('insp'); }
  function goIssueCard(id)    { setSelectedInspId(id); setScreen('issueCard'); }
  function goSettings()       { setScreen('settings'); }

  // 各画面をレンダリング
  let content = null;
  if (screen === 'home') {
    content = (
      <HomeScreen
        onSelectFacility={goFacility}
        onSettings={goSettings}
        installPrompt={installPrompt}
        onInstall={handleInstall}
      />
    );
  } else if (screen === 'fac') {
    content = (
      <FacilityScreen
        facility={selectedFacility}
        onBack={goHome}
        onEdit={ext => goEdit(ext, selectedFacility)}
        onInspect={ext => goInspect(ext, selectedFacility)}
        onAddNew={() => goEdit(null, selectedFacility)}
      />
    );
  } else if (screen === 'edit') {
    content = (
      <EditScreen
        facility={selectedFacility}
        ext={selectedExt}
        onBack={() => setScreen('fac')}
        onSaved={() => setScreen('fac')}
      />
    );
  } else if (screen === 'insp') {
    content = (
      <InspectScreen
        facility={selectedFacility}
        ext={selectedExt}
        onBack={() => setScreen('fac')}
        onSaved={(inspId, hasIssue) => hasIssue ? goIssueCard(inspId) : setScreen('fac')}
      />
    );
  } else if (screen === 'issueCard') {
    content = (
      <IssueCardScreen
        facility={selectedFacility}
        ext={selectedExt}
        inspId={selectedInspId}
        onBack={() => setScreen('fac')}
      />
    );
  } else if (screen === 'settings') {
    content = <SettingsScreen onBack={goHome} />;
  }

  return (
    <>
      {content}
      {/* グローバルトースト: SW 更新通知などに使用 */}
      <Toast toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}

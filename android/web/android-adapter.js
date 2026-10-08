/* Included only in the native Android asset bundle, after the shared game. */
(() => {
 'use strict';
 const pending = new Map();
 let sequence = 0, exportBusy = false;
 const maxBytes = 16 * 1024 * 1024;
 const appTitle = '눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기';
 const api = {
  version: '1.0.0',
  get available() { return !!(window.WinAgainNative && typeof WinAgainNative.postMessage === 'function'); },
  pause() {
   if (typeof pauseForPlanning === 'function') pauseForPlanning();
   if (typeof save === 'function') save();
   if (typeof render === 'function') render();
   return true;
  },
  handleBack() {
   const dialog = document.activeElement?.closest?.('dialog[open]') || [...document.querySelectorAll('dialog[open]')].at(-1);
   if (dialog) {
    const event = new Event('cancel', { cancelable: true });
    if (dialog.dispatchEvent(event)) dialog.close();
    return true;
   }
   if (typeof tacticsBoardOpen !== 'undefined' && tacticsBoardOpen) {
    if (typeof collapseTacticsBoard === 'function') collapseTacticsBoard();
    if (typeof render === 'function') render();
    return true;
   }
   if (typeof view !== 'undefined' && view !== 'club' && typeof setView === 'function') {
    setView('club'); return true;
   }
   api.pause(); return false;
  },
  exportFile(text, name) {
   if (!api.available) return Promise.reject(new Error('앱의 저장 기능을 사용할 수 없어요. Android System WebView를 업데이트해 주세요.'));
   if (exportBusy) return Promise.reject(new Error('먼저 열린 저장 창을 마쳐 주세요.'));
   if (typeof text !== 'string' || !text.length || new Blob([text]).size > maxBytes || !/^[a-zA-Z0-9._-]{1,100}\.json$/.test(name))
    return Promise.reject(new Error('저장 파일 형식이나 크기를 확인해 주세요.'));
   api.pause();
   const id = 'export-' + (++sequence);
   exportBusy = true;
   return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try { WinAgainNative.postMessage(JSON.stringify({ type: 'export', id, name, text })); }
    catch (error) { pending.delete(id); exportBusy = false; reject(error); }
   });
  }
 };
 window.WinAgainAndroid = Object.freeze(api);
 if (api.available) WinAgainNative.onmessage = event => {
  let response; try { response = JSON.parse(event.data); } catch { return; }
  const task = response && pending.get(response.id);
  if (!task || !['saved', 'cancelled', 'error'].includes(response.status)) return;
  pending.delete(response.id); exportBusy = false;
  if (response.status === 'error') task.reject(new Error(response.message || '파일을 저장하지 못했어요. 다시 시도해 주세요.'));
  else task.resolve(response);
 };
 function setExportStatus(message, error = false) {
  if (typeof portabilityStatus !== 'undefined') portabilityStatus = error ? '' : message;
  if (typeof portabilityError !== 'undefined') portabilityError = error ? message : '';
  if (typeof updateImportPreview === 'function') updateImportPreview();
  for (const button of document.querySelectorAll('[data-portable="export"],[data-portable="recovery-export"]')) button.disabled = exportBusy;
 }
 function showPrivacy() {
  if (document.getElementById('android-privacy-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'android-privacy-dialog';
  dialog.setAttribute('aria-labelledby', 'android-privacy-title');
  dialog.style.cssText = 'width:min(560px,calc(100% - 24px));max-height:80dvh;overflow:auto;padding:20px';
  dialog.innerHTML = '<h2 id="android-privacy-title">개인정보처리 안내</h2>' +
   '<p>시행일 2026-10-02 · ' + appTitle + '</p>' +
   '<p>가입과 로그인이 없는 오프라인 게임입니다. 광고, 결제, 분석·추적 SDK가 없으며 개발자 서버로 개인정보나 게임 기록을 보내지 않습니다.</p>' +
   '<h3>기기 안의 구단</h3><p>구단, 선수, 경기, 전술, 대화·기사와 설정은 이 앱의 내부 저장 공간에 보관합니다. 개발자가 원격으로 읽지 않으며 자동 클라우드 동기화는 제공하지 않습니다.</p>' +
   '<h3>직접 선택한 파일</h3><p>내보내기는 문서 선택기에서 고른 위치에 JSON 파일을 씁니다. 불러오기는 선택한 파일 하나를 읽고, 확인 후 교체를 누르면 반영합니다. 다른 문서, 사진, 주소록, 위치, 마이크, 카메라에 접근하지 않습니다.</p>' +
   '<p>클라우드 문서 제공자를 선택하면 선택한 파일은 해당 제공자의 정책에 따라 저장되거나 전송될 수 있습니다. 개발자 서버로 전송하지 않습니다. 내보내기 임시 파일은 완료·취소 또는 다음 시작 때 삭제합니다.</p>' +
   '<h3>삭제와 문의</h3><p>Android 설정에서 앱 데이터를 삭제하거나 앱을 제거하면 내부 구단이 삭제됩니다. 별도로 내보낸 파일은 선택한 위치에서 직접 삭제해야 합니다. 외부 링크는 브라우저에서 열며 해당 사이트의 정책을 따릅니다.</p>' +
   '<p><a href="https://github.com/jaeseok614/win-again-football/issues">개발 프로젝트에 문의하기</a> · 공개 문의에 개인 구단 파일이나 개인정보를 첨부하지 마세요.</p>' +
   '<button type="button" class="secondary" style="min-height:44px">닫기</button>';
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  document.body.appendChild(dialog); dialog.showModal();
 }
 async function exportText(text, name) {
  setExportStatus('저장 위치를 선택해 주세요.');
  try {
   const operation = api.exportFile(text, name);
   setExportStatus('저장 위치를 선택해 주세요.');
   const result = await operation;
   setExportStatus(result.message || (result.status === 'saved' ? '구단 저장 파일을 저장했습니다.' : '저장을 취소했습니다.'));
   return result.status === 'saved' ? text : null;
  } catch (error) { setExportStatus(error.message, true); return null; }
 }
 // Keep the shared CampaignFile schema and original-save recovery bytes intact.
 downloadCampaignText = (text, name) => api.exportFile(text, name);
 exportCampaign = async () => {
  try { return await exportText(CampaignFile.stringify(currentCampaignPayload()), 'win-again-' + season.year + 'season-' + (season.round + 1) + 'round.json'); }
  catch (error) { setExportStatus(error.message, true); return null; }
 };
 exportRecoveryOriginal = async (index = 0) => {
  try {
   const entry = (recoveryIsBlocked() ? saveRecovery.originals() : saveRecovery.archivedOriginals())[index];
   if (!entry) throw new Error('받을 수 있는 저장 원본을 확인해 주세요.');
   return await exportText(entry.text, 'win-again-recovery-original-' + (index + 1) + '.json');
  } catch (error) { setExportStatus(error.message, true); return null; }
 };
 window.renderPwaStatus = () => {
  const installation = document.getElementById('pwa-state')?.closest('section');
  if (installation) {
   installation.innerHTML = '<h3>앱 정보</h3><p class="portable-hint">' + appTitle + ' ' + api.version + ' · 인터넷 없이 플레이 · 광고와 결제 없음</p>' +
    '<button type="button" class="secondary" data-android-privacy>개인정보처리 안내</button>';
   installation.querySelector('[data-android-privacy]').onclick = showPrivacy;
  }
  const dialog = document.getElementById('portability-dialog');
  if (dialog) {
   for (const button of dialog.querySelectorAll('[data-portable="export"]')) button.textContent = '구단 저장 파일 내보내기';
   for (const button of dialog.querySelectorAll('[data-portable="export"],[data-portable="recovery-export"]')) button.disabled = exportBusy;
  }
 };
 document.addEventListener('visibilitychange', () => { if (document.hidden) api.pause(); });
 window.addEventListener('pagehide', api.pause);
})();

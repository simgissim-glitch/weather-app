const form = document.querySelector('#weather-form');
const input = document.querySelector('#city');
const button = form.querySelector('button');
const status = document.querySelector('#status');
const card = document.querySelector('#weather');
const setText = (id, value) => { document.getElementById(id).textContent = value; };

// Open-Meteo의 WMO 날씨 코드를 한국어로 표시합니다.
function describe(code, isDay) {
  if (code === 0) return ['맑음', isDay ? '☀️' : '🌙'];
  if (code === 1) return ['대체로 맑음', isDay ? '🌤️' : '🌙'];
  if (code === 2) return ['구름 조금', '⛅'];
  if (code === 3) return ['흐림', '☁️'];
  if ([45, 48].includes(code)) return ['안개', '🌫️'];
  if ([51, 53, 55].includes(code)) return ['이슬비', '🌦️'];
  if ([56, 57, 66, 67].includes(code)) return ['어는 비', '🌧️'];
  if ([61, 63, 65].includes(code)) return ['비', '🌧️'];
  if ([71, 73, 75, 77].includes(code)) return ['눈', '🌨️'];
  if ([80, 81, 82].includes(code)) return ['소나기', '🌦️'];
  if ([85, 86].includes(code)) return ['눈 소나기', '🌨️'];
  if ([95, 96, 99].includes(code)) return ['뇌우', '⛈️'];
  return ['날씨 정보 없음', '🌡️'];
}
function measurement(value, unit) {
  return Number.isFinite(value) ? `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit}` : '—';
}

const historyKey = 'daily-weather.history.v1';
const historyList = document.querySelector('#history-list');
const historyStatus = document.querySelector('#history-status');
let savedResults = [];

function validResult(entry) {
  const data = entry?.data;
  return typeof entry?.id === 'string' && typeof entry.savedAt === 'string'
    && Number.isFinite(Date.parse(entry.savedAt))
    && typeof data?.location?.name === 'string'
    && typeof data.location.region === 'string' && typeof data.location.country === 'string'
    && typeof data?.current?.time === 'string' && typeof data.timezone === 'string'
    && Number.isFinite(data.current.temperature_2m);
}

function persistHistory(next) {
  try {
    localStorage.setItem(historyKey, JSON.stringify(next));
    savedResults = next;
    renderHistory();
    return true;
  } catch {
    historyStatus.textContent = '저장 공간이 부족하거나 브라우저에서 저장을 차단했습니다. 저장 또는 삭제가 반영되지 않았습니다.';
    return false;
  }
}

function renderHistory() {
  historyList.replaceChildren();
  document.querySelector('#history-empty').hidden = savedResults.length > 0;
  for (const entry of savedResults) {
    const { location, current, timezone } = entry.data;
    const [description, icon] = describe(current.weather_code, current.is_day);
    const item = document.createElement('li');
    item.className = 'history-item';
    const title = document.createElement('h3');
    title.textContent = location.name;
    const region = document.createElement('p');
    region.className = 'hint';
    region.textContent = [location.region, location.country].filter(Boolean).join(' · ');
    const summary = document.createElement('p');
    summary.textContent = `${icon} ${description} · ${measurement(current.temperature_2m, '°C')} · 체감 ${measurement(current.apparent_temperature, '°C')} · 습도 ${measurement(current.relative_humidity_2m, '%')} · 풍속 ${measurement(current.wind_speed_10m, ' m/s')}`;
    const time = document.createElement('p');
    time.className = 'hint';
    time.textContent = `${current.time.replace('T', ' ')} 기준 (${timezone}) · 저장: ${new Date(entry.savedAt).toLocaleString('ko-KR')}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '삭제';
    remove.setAttribute('aria-label', `${location.name} 저장 결과 삭제`);
    remove.addEventListener('click', () => {
      const index = savedResults.findIndex((result) => result.id === entry.id);
      if (persistHistory(savedResults.filter((result) => result.id !== entry.id))) {
        historyStatus.textContent = `${location.name} 저장 결과를 삭제했습니다.`;
        const buttons = historyList.querySelectorAll('button');
        (buttons[Math.min(index, buttons.length - 1)] || input).focus();
      }
    });
    item.append(title, region, summary, time, remove);
    historyList.append(item);
  }
}

try {
  const stored = JSON.parse(localStorage.getItem(historyKey) || '[]');
  if (!Array.isArray(stored) || !stored.every(validResult)) throw new Error('Invalid history');
  savedResults = stored;
} catch {
  historyStatus.textContent = '저장 기록을 읽지 못했습니다. 새 검색 결과는 저장을 다시 시도합니다.';
}
renderHistory();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const city = input.value.trim();
  card.hidden = true;
  status.hidden = false;
  status.className = '';
  if (city.length < 2) {
    status.textContent = '도시 이름을 2자 이상 입력해 주세요.';
    input.focus();
    return;
  }
  button.disabled = true;
  button.textContent = '확인 중…';
  form.setAttribute('aria-busy', 'true');
  status.textContent = '현재 날씨를 가져오고 있습니다…';
  try {
    // 브라우저는 우리 백엔드만 호출합니다. 외부 API 요청은 서버가 처리합니다.
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '날씨를 확인할 수 없습니다.');
    const current = data.current;
    const [description, icon] = describe(current.weather_code, current.is_day);
    setText('location', data.location.name);
    setText('region', [...new Set([data.location.region, data.location.country].filter(Boolean))].join(' · '));
    setText('temperature', measurement(current.temperature_2m, '°C'));
    setText('description', description);
    setText('weather-icon', icon);
    setText('feels-like', measurement(current.apparent_temperature, '°C'));
    setText('humidity', measurement(current.relative_humidity_2m, '%'));
    setText('wind', measurement(current.wind_speed_10m, ' m/s'));
    // API의 time은 검색한 도시의 현지 시간입니다. 브라우저 시간대로 변환하지 않습니다.
    setText('updated', `${current.time.replace('T', ' ')} 기준 · 현지 시간 (${data.timezone})`);
    card.hidden = false;
    status.textContent = `${data.location.name}의 현재 날씨를 확인했습니다.`;
    status.hidden = true;
    const entry = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), data };
    if (validResult(entry) && persistHistory([entry, ...savedResults])) {
      historyStatus.textContent = `${data.location.name} 검색 결과를 저장했습니다.`;
    }
  } catch (error) {
    status.className = 'error';
    status.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.'
      : error instanceof TypeError ? '서버에 연결할 수 없습니다. 서버 실행 상태와 인터넷 연결을 확인해 주세요.' : error.message;
  } finally {
    button.disabled = false;
    button.textContent = '날씨 확인';
    form.removeAttribute('aria-busy');
  }
});

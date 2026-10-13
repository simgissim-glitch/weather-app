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

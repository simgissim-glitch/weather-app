// 외부 패키지 없이 Node.js 기본 모듈만 사용합니다.
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3001);
const publicDir = path.join(__dirname, '..', 'frontend');
// 지오코딩 API에서 한글 이름이 누락되거나 동명이인 지역으로 검색되는 것을 보완합니다.
const koreanCities = {
  '서울': 'Seoul', '부산': 'Busan', '인천': 'Incheon', '대구': 'Daegu',
  '대전': 'Daejeon', '광주': 'Gwangju', '울산': 'Ulsan', '세종': 'Sejong',
  '제주': 'Jeju', '수원': 'Suwon', '강릉': 'Gangneung', '전주': 'Jeonju',
};
// 허용한 프론트엔드 파일만 제공합니다.
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error('Weather provider error');
  return data;
}

async function weather(city, res) {
  if (!city || city.length < 2 || city.length > 100) {
    return json(res, 400, { error: '도시 이름을 2~100자로 입력해 주세요.' });
  }
  try {
    // 1. 도시 이름을 위도와 경도로 변환합니다.
    const geocoding = new URL('https://geocoding-api.open-meteo.com/v1/search');
    const koreanName = city.replace(/(특별자치시|특별시|광역시|시)$/, '');
    const translatedCity = koreanCities[koreanName];
    geocoding.search = new URLSearchParams({ name: translatedCity || city, count: translatedCity ? '10' : '1', language: 'ko', format: 'json' });
    const locations = await fetchJson(geocoding);
    const location = translatedCity
      ? locations.results?.filter((item) => item.country_code === 'KR')
        .sort((a, b) => (b.population || 0) - (a.population || 0))[0]
      : locations.results?.[0];
    if (!location) return json(res, 404, { error: '도시를 찾지 못했습니다. 철자를 확인하거나 영문 이름으로 검색해 주세요.' });

    // 2. 해당 좌표의 현재 날씨를 가져옵니다. API 키는 필요 없습니다.
    const forecast = new URL('https://api.open-meteo.com/v1/forecast');
    forecast.search = new URLSearchParams({
      latitude: location.latitude, longitude: location.longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
      temperature_unit: 'celsius', wind_speed_unit: 'ms', timezone: 'auto',
    });
    const data = await fetchJson(forecast);
    if (!data.current || !Number.isFinite(data.current.temperature_2m)) throw new Error('Invalid weather data');
    json(res, 200, {
      location: { name: location.name, region: location.admin1 || '', country: location.country || '' },
      current: data.current, timezone: data.timezone,
    });
  } catch (error) {
    console.error('Weather request failed:', error.message);
    const timeout = error.name === 'TimeoutError';
    json(res, timeout ? 504 : 502, { error: timeout
      ? '날씨 서비스 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.'
      : '날씨 정보를 가져오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return json(res, 405, { error: 'GET 요청만 지원합니다.' });
    }
    if (url.pathname === '/api/weather') return await weather(url.searchParams.get('city')?.trim(), res);
    const file = files[url.pathname];
    if (!file) return json(res, 404, { error: '페이지를 찾을 수 없습니다.' });
    const body = await readFile(path.join(publicDir, file[0]));
    res.writeHead(200, { 'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch (error) {
    console.error(error.message);
    json(res, 500, { error: '서버에서 오류가 발생했습니다.' });
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`날씨 앱: http://localhost:${PORT}`));
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `${PORT}번 포트가 사용 중입니다. PORT를 변경해 주세요.` : error.message);
    process.exitCode = 1;
  });
}
module.exports = server;

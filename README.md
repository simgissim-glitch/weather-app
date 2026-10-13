# 지금, 날씨

HTML, CSS, JavaScript와 Node.js 기본 HTTP 서버로 만든 날씨 웹앱입니다. 외부 패키지나 API 키 없이 실행합니다.

## 파일 구성

```text
frontend/
  index.html   # 검색 폼과 날씨 화면
  style.css    # 반응형 디자인
  app.js       # 백엔드 호출 및 결과 표시
backend/
  server.js    # 정적 파일 제공, 도시 검색 및 외부 날씨 API 호출
package.json   # Node.js 실행 명령
README.md
```

## 실행 방법

1. Node.js 22 이상을 설치합니다. 설치 파일: https://nodejs.org/
2. 이 프로젝트 폴더에서 터미널(PowerShell)을 엽니다.
3. 설치를 확인합니다.
   ```powershell
   node --version
   ```
4. 서버를 시작합니다. `npm install`이나 환경 변수 설정은 필요 없습니다.
   ```powershell
   npm.cmd start
   ```
5. 브라우저에서 **http://localhost:3001** 을 엽니다. `index.html`을 직접 더블 클릭하지 마세요. 백엔드를 통해 접속해야 검색이 작동합니다.
6. `서울`, `부산`, `London` 같은 도시 이름을 입력하고 **날씨 확인**을 누르거나 Enter를 누릅니다.
7. 서버를 종료하려면 터미널에서 **Ctrl+C**를 누릅니다.

개발 중 서버 파일 변경 시 자동으로 재시작하려면 `npm.cmd run dev`를 사용합니다. 프론트엔드 변경 사항은 브라우저를 새로고침하면 반영됩니다.

Windows PowerShell의 스크립트 실행 정책에 영향을 받지 않도록 `npm.cmd`를 사용합니다. 다른 환경에서는 `npm start` 또는 `npm run dev`를 사용하며, `node backend/server.js`로 직접 실행해도 됩니다.

3001번 포트가 이미 사용 중이라면 PowerShell에서 다음과 같이 실행하고 http://localhost:3002 에 접속합니다.

```powershell
$env:PORT = '3002'
node backend/server.js
```

## 동작 과정

검색에 성공하면 해당 시점의 날씨 결과를 브라우저에 자동 저장합니다. 화면 아래 **저장된 날씨**에서 모든 결과를 다시 확인하고 각 항목의 **삭제** 버튼으로 지울 수 있습니다. 같은 도시를 다시 검색해도 새 기록으로 저장됩니다. 기록은 새로고침 후에도 유지되지만, 다른 브라우저·기기·접속 주소와 공유되지 않으며 브라우저 데이터를 지우면 삭제됩니다. 저장된 값은 실시간으로 갱신되지 않습니다.

브라우저 → `GET /api/weather?city=서울` → 백엔드 → Open-Meteo 도시 검색 API → 좌표로 현재 날씨 조회 → 브라우저에 JSON 반환.

백엔드가 프론트엔드도 제공하므로 별도 웹 서버나 CORS 설정이 필요 없습니다. 서버는 로컬 컴퓨터에서만 접속하도록 설정했습니다. 외부 API 호출에는 인터넷 연결이 필요합니다.

기온, 날씨 상태, 체감 온도, 습도, 풍속, 해당 도시의 현지 기준 시각을 표시합니다. 빈 입력, 검색 결과 없음, 외부 API 오류 및 시간 초과를 처리합니다. 같은 이름의 도시가 여러 개면 첫 결과를 사용하므로 표시된 지역·국가를 확인해 주세요. 한글 검색이 안 되면 영문 도시 이름을 사용해 보세요.

## API와 이용 조건

- 도시 검색: https://open-meteo.com/en/docs/geocoding-api
- 현재 날씨 및 WMO 코드: https://open-meteo.com/en/docs
- 무료 API는 **비상업적 용도**에서 API 키 없이 사용할 수 있으며 호출량 제한이 있습니다. 상업적 이용 시 요금 및 라이선스를 확인하세요: https://open-meteo.com/en/pricing
- 현재 날씨는 기상 모델 기반 정보로, 현장 관측값과 차이가 있을 수 있습니다.
- 화면에 Open-Meteo 및 GeoNames 출처 링크를 표시했습니다.

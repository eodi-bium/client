const fs = require('fs');

// place.json 파일 읽기
const fileContent = fs.readFileSync('./place.json', 'utf-8');

// JSONP 형식에서 JSON 추출 (jQuery 콜백 제거)
const jsonString = fileContent.replace(/^\/\*\*\/jQuery\d+_\d+\(/, '').replace(/\);?\s*$/, '');
const data = JSON.parse(jsonString);

// place 배열에서 필요한 필드만 추출
const filteredPlaces = data.place.map((place) => ({
  lon: place.lon,
  lat: place.lat,
  name: place.name,
  tel: place.tel,
  address: place.address,
}));

// 결과를 새 파일로 저장
const output = {
  places: filteredPlaces,
  totalCount: filteredPlaces.length,
};

fs.writeFileSync('./place-filtered.json', JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ 완료! ${filteredPlaces.length}개의 장소 데이터를 추출했습니다.`);
console.log('📁 결과 파일: place-filtered.json');

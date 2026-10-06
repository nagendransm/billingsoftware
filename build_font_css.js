const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'client', 'public', 'fonts', 'tsc-avarangal.ttf');
const buf = fs.readFileSync(fontPath);
const b64 = buf.toString('base64');

const cssContent = `/* Embedded TSC_Avarangal Font for Product Names */
@font-face {
  font-family: 'TSC_Avarangal';
  src: local('TSC_Avarangal'),
       local('TSC-Avarangal'),
       local('TSCAvarangal'),
       local('tsc-avarangal'),
       url('data:font/truetype;charset=utf-8;base64,${b64}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'TSC-Avarangal';
  src: local('TSC_Avarangal'),
       local('TSC-Avarangal'),
       local('TSCAvarangal'),
       local('tsc-avarangal'),
       url('data:font/truetype;charset=utf-8;base64,${b64}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Dedicated Product Name Font Class */
.font-product {
  font-family: 'TSC_Avarangal', 'TSC-Avarangal', 'TSCAvarangal', 'tsc-avarangal', 'Nirmala UI', 'Latha', 'Noto Sans Tamil', 'Mukta Malar', 'Segoe UI', sans-serif !important;
}
`;

fs.writeFileSync(path.join(__dirname, 'client', 'src', 'fonts.css'), cssContent);
console.log('Successfully generated client/src/fonts.css with embedded TSC_Avarangal font!');

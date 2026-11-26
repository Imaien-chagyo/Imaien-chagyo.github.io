/* 今井園ポータルの設定 */
const CONFIG = {
  // データの読み書き（Apps Script ウェブアプリ、全員に公開。ログイン済みのトークンがないと何も返さない）
  API_URL: 'https://script.google.com/macros/s/AKfycbyUcV0ytfVmxHJJ0VSMnuobaAcn37UAiEpieEDhdpVExsHx2Io6_hcVDD81j2vPmyblxg/exec',
  // ログイン（同じ Apps Script を imaien.com 内のユーザーのみに公開したもの）
  LOGIN_URL: 'https://script.google.com/a/macros/imaien.com/s/AKfycby2lBnBwn6tdgoYDW2DASJt-_NCzEThvtoX67WAo_U106ulca8h7Fz8Y_csYFN4oaMZsA/exec?login=1',
  DOMAIN: 'imaien.com',
  LOCATIONS: ['学大', '笹塚', 'Graz'],
  WAREHOUSE_URL: 'https://imaien.com/warehouseManagement/'
};

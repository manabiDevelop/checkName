//(エラーなし∨対応済み)∧(顧客へ未送信)の授業報告を抽出しているシートから中継シートへデータを転記することで送信することを確定させる関数
function ConfirmSendingClassReport() {
  // 授業報告送信_中継
  var ss2 = SpreadsheetApp.openById('1RObNcDrklKjtq7wad5IYC-ndu4UqmxI_f1hyz_X_6D4');
  const relaySheetMassage = ss2.getSheetByName('送信確定済み授業報告文面');
  const relaySheetID = ss2.getSheetByName('送信確定済み授業報告ID');

  // LINEID&文面&トウコベキョウコベの転記 : 過去のデータをクリアして書き込み

  // 過去データの削除
  relaySheetMassage.getRange('A2:C').clearContent();

    // beta版戦略室ops用
  var ss1 = SpreadsheetApp.openById("1bXv06BcUNlfBss1XiX5r0p0-3bIH9cbxc1FWUggMSnc");
  const opsSheetMassage = ss1.getSheetByName('送信予定授業報告文面');
  const opsSheetID = ss1.getSheetByName('送信予定授業報告ID');

  var rownum = opsSheetMassage.getLastRow() - 1;
  var colnum = 3;
  // データがあれば継続
  if (rownum > 0) {
    // 新規データの読み込み
    var data = opsSheetMassage.getRange(2, 1, rownum, colnum).getValues();
    // 新規データの書き込み
    relaySheetMassage.getRange(2,1,rownum,colnum).setValues(data);
  }

  // タイムスタンプ&講師IDの転記 : 過去のデータに追加する形で書き込み
  var rownum = opsSheetID.getLastRow() - 1;
  var colnum = 2;
  // データがあれば継続
  if (rownum > 0) {
    // 新規データの読み込み
    var data = opsSheetID.getRange(2, 1, rownum, colnum).getValues();
    // 新規データの先頭行番号取得
    var startRowNum = relaySheetID.getLastRow()+1
    // 新規データの書き込み
    relaySheetID.getRange(startRowNum,1,rownum,colnum).setValues(data);
  }
}

function deleteOldData() {
  const sheet = SpreadsheetApp.openById("1RObNcDrklKjtq7wad5IYC-ndu4UqmxI_f1hyz_X_6D4").getSheetByName("送信確定済み授業報告ID");
  if (!sheet) {
    console.log("シートが存在しません");
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    console.log("データがありません");
    return;
  }

  const today = new Date();
  const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);  // 前月1日

  let startRow = null;
  let endRow = null;

  // A列をループして削除対象の範囲を特定
  for (let i = 1; i < data.length; i++) {  // 1行目はヘッダーを想定
    const dateInCell = new Date(data[i][0]);  // A列の値を取得

    if (dateInCell < firstDayOfLastMonth) {
      // 削除対象範囲の開始を特定
      if (startRow === null) {
        startRow = i + 1;  // スプレッドシートの行番号は1から始まるため +1
      }
      endRow = i + 1;
    } else {
      // 前月1日以降に達したらループ終了
      break;
    }
  }

  // 行削除処理
  if (startRow !== null && endRow !== null) {
    const numRows = endRow - startRow + 1;
    sheet.deleteRows(startRow, numRows);
    console.log(`削除しました: ${startRow}行目から${numRows}行`);
  } else {
    console.log("削除する行はありません");
  }

}

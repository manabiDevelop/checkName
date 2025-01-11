function RecordCheckStatus() {
  const opsSheet = SpreadsheetApp.openById('1bXv06BcUNlfBss1XiX5r0p0-3bIH9cbxc1FWUggMSnc').getSheetByName('授業報告送信ops');
  const recordSheet = SpreadsheetApp.openById('1RObNcDrklKjtq7wad5IYC-ndu4UqmxI_f1hyz_X_6D4').getSheetByName('確認状況記録');

  const opsData = opsSheet.getRange('P2:U2').getValues();
  const recordDataNum = recordSheet.getLastRow() - 1;
  const recordData = recordSheet.getRange(2, 1, recordDataNum, 3).getValues();

  // 対応済みの更新
  var flag = 0; //既存レコードにフォームID(タイムスタンプ&講師ID)が見つかれば1にする
  var num = 2; //新規登録の場合の行番号
  for (let i = 0; i < recordData.length; i++) {
    if (recordData[i][0] == '') continue;
    num = num + 1;
    if (opsData[0][0].getTime() == recordData[i][0].getTime() && opsData[0][1] == recordData[i][1]) {
      flag = 1;
      // 実行確認とキャンセル処理
      var popup = Browser.msgBox('対応状況を更新しますか?', Browser.Buttons.OK_CANCEL);
      if (popup == 'cancel') {
        Browser.msgBox('対応状況は更新しませんでした');
        break;
      }
      // 対応状況の更新
      if (opsData[0][5] == '') {
        recordSheet.getRange(i + 2, 1, 1, 3).clearContent();
        Browser.msgBox('対応状況を削除しました');
      } else {
        recordSheet.getRange(i + 2, 3).setValue(opsData[0][5]);
        Browser.msgBox('対応状況を更新しました');
      }
      break;
    }
  }

  if (flag == 0 && opsData[0][5] != '') {
    // 対応状況の新規登録
    var popup = Browser.msgBox('対応状況を登録しますか?', Browser.Buttons.OK_CANCEL);
    if (popup == 'cancel') {
      Browser.msgBox('対応状況は登録しませんでした');
    } else {
      recordSheet.getRange(num, 1, 1, 3).setValues([[opsData[0][0], opsData[0][1], opsData[0][5]]]);
      Browser.msgBox('対応状況を登録しました');
    }
  }


  // 対応済みの入力をクリア
  opsSheet.getRange('U2').clearContent();
  // タイムスタンプを昇順に並び替え
  recordSheet.getRange('A2:C').activate().sort({ column: 1, ascending: true });
}

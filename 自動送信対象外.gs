function moveData() {
  // --------------------------------------------------------------------------------
  // 0) 主要シートの取得
  // --------------------------------------------------------------------------------
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ▼「授業報告最新」「授業報告_確定」「授業報告_対象外」は同一スプレッドシート内
  const sheetLatest     = ss.getSheetByName("授業報告最新");   // 元データ（新規行が増えている）
  const sheetConfirmed  = ss.getSheetByName("授業報告_確定");   // 確定データ
  const sheetExcluded   = ss.getSheetByName("授業報告_対象外"); // 対象外(エラー)データ
  
  // ▼「授業報告&授業日程変更2024/09/09~(修正・参照)」は「別スプレッドシート」
  //    以下の "xxxxx" は、対象となるスプレッドシートのファイルIDに置き換えてください
  //    （URLが "https://docs.google.com/spreadsheets/d/xxxxx/edit#gid=0" なら xxxxx の部分）
  const refSs = SpreadsheetApp.openById("xxxxx");
  const sheetReport   = refSs.getSheetByName("授業報告");     // 別SS内の「授業報告」シート
  const sheetSchedule = refSs.getSheetByName("授業日程変更"); // 別SS内の「授業日程変更」シート

  // --------------------------------------------------------------------------------
  // 1) 参照先スプレッドシートの「授業報告」(M列, R列) と「授業日程変更」(N列, R列) の値を辞書化
  // --------------------------------------------------------------------------------
  // --- 授業報告(別SS) M列(13) & R列(18) ---
  const reportValues = sheetReport.getDataRange().getValues();
  let reportDict = {};
  for (let i = 1; i < reportValues.length; i++) {  // 1行目(見出し)除外を想定
    const row = reportValues[i];
    const valM = row[12];  // M列 (列13) → インデックス12
    const valR = row[17];  // R列 (列18) → インデックス17
    if (valM && valR) {
      const key = valM + "||" + valR;  // 例: "M値||R値"
      reportDict[key] = true;
    }
  }
  
  // --- 授業日程変更(別SS) N列(14) & R列(18) ---
  const scheduleValues = sheetSchedule.getDataRange().getValues();
  let scheduleDict = {};
  for (let i = 1; i < scheduleValues.length; i++) {
    const row = scheduleValues[i];
    const valN = row[13];  // N列 (列14) → インデックス13
    const valR = row[17];  // R列 (列18) → インデックス17
    if (valN && valR) {
      const key = valN + "||" + valR;  // 例: "N値||R値"
      scheduleDict[key] = true;
    }
  }

  // --------------------------------------------------------------------------------
  // 2) すでに「対象外(エラー)」として追加済みデータ(L,T)を控えておき、重複追加を防ぐ
  // --------------------------------------------------------------------------------
  let excludedDict = {};
  const excludedData = sheetExcluded.getDataRange().getValues();
  for (let i = 1; i < excludedData.length; i++) {
    const row = excludedData[i];
    // ※「授業報告最新」と同じ列構成だと仮定し、L列→インデックス11、T列→インデックス19
    const valL = row[11];
    const valT = row[19];
    if (valL && valT) {
      const key = valL + "||" + valT;
      excludedDict[key] = true;
    }
  }

  // --------------------------------------------------------------------------------
  // 3) 「授業報告_確定」の最終行を取得し、そこまでの行は処理済みとする
  //    → 今回は「授業報告最新」シートの (lastRowOfConfirmed + 1) 行目以降を対象とする
  // --------------------------------------------------------------------------------
  const lastRowOfConfirmed = sheetConfirmed.getLastRow();
  const lastRowOfLatest    = sheetLatest.getLastRow();

  if (lastRowOfLatest <= lastRowOfConfirmed) {
    Logger.log("新規に処理する行はありません。");
    return;
  }

  // 「授業報告最新」の全列数（必要に応じて固定長でもOK）
  const lastColOfLatest = sheetLatest.getLastColumn();

  // 処理対象のデータをまとめて取得
  const targetRange = sheetLatest.getRange(
    lastRowOfConfirmed + 1, 1,
    lastRowOfLatest - lastRowOfConfirmed,
    lastColOfLatest
  );
  const targetValues = targetRange.getValues();

  // --------------------------------------------------------------------------------
  // 4) 行を走査し、条件に合うなら「授業報告_確定」へ、合わなければ「対象外」へ
  // --------------------------------------------------------------------------------
  let rowsToConfirmed = [];
  let rowsToExcluded  = [];

  for (let i = 0; i < targetValues.length; i++) {
    const row = targetValues[i];
    const valL = row[11]; // L列 → インデックス11
    const valT = row[19]; // T列 → インデックス19

    // L または T が空の場合 → 対象外行き
    if (!valL || !valT) {
      const key = (valL || "") + "||" + (valT || "");
      if (!excludedDict[key]) {
        rowsToExcluded.push(row);
        excludedDict[key] = true;
      }
      continue;
    }

    // L列+T列 で参照スプレッドシートの「M,R」「N,R」に該当するか判定
    const checkKey = valL + "||" + valT;
    let isMatch = false;
    if (reportDict[checkKey] || scheduleDict[checkKey]) {
      isMatch = true;
    }

    if (isMatch) {
      // 授業報告_確定 に追加
      rowsToConfirmed.push(row);
    } else {
      // 対象外(エラー)に追加 (ただし未登録なら)
      if (!excludedDict[checkKey]) {
        rowsToExcluded.push(row);
        excludedDict[checkKey] = true;
      }
    }
  }

  // --------------------------------------------------------------------------------
  // 5) 判定結果をシートに反映（まとめて貼り付け）
  // --------------------------------------------------------------------------------
  if (rowsToConfirmed.length > 0) {
    sheetConfirmed
      .getRange(
        sheetConfirmed.getLastRow() + 1, 1,
        rowsToConfirmed.length, lastColOfLatest
      )
      .setValues(rowsToConfirmed);
  }

  if (rowsToExcluded.length > 0) {
    sheetExcluded
      .getRange(
        sheetExcluded.getLastRow() + 1, 1,
        rowsToExcluded.length, lastColOfLatest
      )
      .setValues(rowsToExcluded);
  }

  Logger.log(
    "処理完了: 確定追加=" + rowsToConfirmed.length + 
    " / 対象外追加=" + rowsToExcluded.length
  );
}
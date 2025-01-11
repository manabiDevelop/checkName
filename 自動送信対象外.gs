function moveData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLatest     = ss.getSheetByName("授業報告最新");   // 元データ（新規行が増えている）
  const sheetConfirmed  = ss.getSheetByName("授業報告_確定");   // 確定データ
  const sheetExcluded   = ss.getSheetByName("授業報告_対象外"); // 対象外(エラー)データ
  const sheetRef        = ss.getSheetByName("授業報告&授業日程変更2024/09/09~(修正・参照)");

  // --------------------------------------------------------------------------------
  // 1) 参照シート「授業報告」(M列, R列)のデータを辞書化
  //    例：キー "M列の値||R列の値" => true
  // --------------------------------------------------------------------------------
  const refValues = sheetRef.getDataRange().getValues(); 
  // ここではシンプルにシート全体を一度に取得（見出し行を除くなど実運用で調整）
  // ※実際は「授業報告」の範囲(列M, R)と「授業日程変更」の範囲(列N, R)を分けて処理する想定
  
  // 辞書を作るためのオブジェクト
  let reportDict = {};     // 授業報告(M, R)
  let scheduleDict = {};   // 授業日程変更(N, R)

  // シートの1行目(インデックス0)を見出しと仮定し、2行目以降を走査
  for (let i = 1; i < refValues.length; i++) {
    const row = refValues[i];
    const valM = row[12];  // M列(13番目) => インデックス12
    const valN = row[13];  // N列(14番目) => インデックス13
    const valR = row[17];  // R列(18番目) => インデックス17

    // 授業報告(M列,R列)
    if (valM && valR) {
      const key = valM + "||" + valR;
      reportDict[key] = true;
    }
    // 授業日程変更(N列,R列)
    if (valN && valR) {
      const key = valN + "||" + valR;
      scheduleDict[key] = true;
    }
  }

  // --------------------------------------------------------------------------------
  // 2) 対象外シートの既存データを覚えておく
  //    例：キー "L列の値||T列の値" => true
  // --------------------------------------------------------------------------------
  let excludedDict = {};
  const excludedData = sheetExcluded.getDataRange().getValues();
  // ※ 実際は「L列, T列」がどこに入っているか、列番を合わせる必要がある
  //   ここでは対象外シートも「授業報告最新」と同じ列構成と仮定し、L列(12番目), T列(20番目)とする
  for (let i = 1; i < excludedData.length; i++) {
    const row = excludedData[i];
    const valL = row[11];  // L列 => インデックス11
    const valT = row[19];  // T列 => インデックス19
    if (valL && valT) {
      const key = valL + "||" + valT;
      excludedDict[key] = true;
    }
  }

  // --------------------------------------------------------------------------------
  // 3) 授業報告_確定シートの「最終行」を取得し、そこまでの行は処理済みとみなす
  //    → 授業報告最新シートの (lastRowOfConfirmed + 1) 行目以降を処理する
  // --------------------------------------------------------------------------------
  const lastRowOfConfirmed = sheetConfirmed.getLastRow();
  // 「授業報告最新」の総行数
  const lastRowOfLatest = sheetLatest.getLastRow();
  // 処理対象がなければ終了
  if (lastRowOfLatest <= lastRowOfConfirmed) {
    Logger.log("新規に処理する行はありません。");
    return;
  }

  // 授業報告最新の全列数（必要に応じて固定長でもよい）
  const lastColOfLatest = sheetLatest.getLastColumn();

  // 処理対象の範囲をまとめて取得 (行は lastRowOfConfirmed + 1 から)
  const targetRange = sheetLatest.getRange(
    lastRowOfConfirmed + 1, 1,
    lastRowOfLatest - lastRowOfConfirmed,
    lastColOfLatest
  );
  const targetValues = targetRange.getValues();

  // 後で一括で貼り付けるためのバッファ
  let rowsToConfirmed = [];
  let rowsToExcluded = [];

  // --------------------------------------------------------------------------------
  // 4) 授業報告最新シート該当行を走査し、条件合致すれば_確定 そうでなければ_対象外(未登録なら)
  // --------------------------------------------------------------------------------
  for (let i = 0; i < targetValues.length; i++) {
    const row = targetValues[i];
    const valL = row[11]; // L列 => インデックス11
    const valT = row[19]; // T列 => インデックス19
    
    if (!valL || !valT) {
      // L/Tいずれか空なら対象外へ（例外処理）
      // すでに対象外に入っているかチェック
      const key = (valL || "") + "||" + (valT || "");
      if (!excludedDict[key]) {
        rowsToExcluded.push(row);
        excludedDict[key] = true;
      }
      continue;
    }

    // 授業報告(M,R)辞書 or 授業日程変更(N,R)辞書 に合致するか？
    const checkKey = valL + "||" + valT;  // L+T
    let isMatch = false;

    // reportDict(M,R) / scheduleDict(N,R) いずれかにあれば true
    if (reportDict[checkKey] || scheduleDict[checkKey]) {
      isMatch = true;
    }

    if (isMatch) {
      // 授業報告_確定 に追加
      rowsToConfirmed.push(row);
    } else {
      // 対象外へ (重複チェック)
      if (!excludedDict[checkKey]) {
        rowsToExcluded.push(row);
        excludedDict[checkKey] = true;
      }
    }
  }

  // --------------------------------------------------------------------------------
  // 5) 判定結果を一括で反映
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

  Logger.log("処理が完了しました。 確定追加行数:" + rowsToConfirmed.length + " / 対象外追加行数:" + rowsToExcluded.length);
}